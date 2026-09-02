<?php

namespace App\Services;

use App\Models\DataMetar;
use Carbon\Carbon;

class MetarDashboardService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Compute comprehensive METAR dashboard statistics for target month and year.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataMetar::with('pegawai')->whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $metarMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $keyMinute = $dt->format('Y-m-d H:i');
            $keyHour = $dt->format('Y-m-d H');
            $metarMap[$keyMinute] = $r;
            if (!isset($metarMap[$keyHour])) {
                $metarMap[$keyHour] = $r;
            }
        }

        $manualStats = ['target' => 0, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0];
        $awosStats = ['target' => 0, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0];
        $anomalyRecords = [];

        $getObserverName = function (?DataMetar $rec, Carbon $slotTime) {
            if ($rec) {
                $name = $rec->pegawai->nama ?? $rec->observer_name;
                if (!empty($name)) {
                    return $name;
                }
            }
            $scheduled = $this->observerResolver->getObserverByTimestamp($slotTime->format('Y-m-d H:i:s'), 'UTC');
            return $scheduled->nama ?? '-';
        };

        for ($d = 1; $d <= $daysInMonth; $d++) {
            for ($h = 0; $h < 24; $h++) {
                $m = 0;
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $witHour = $slotTime->copy()->setTimezone('Asia/Jayapura')->hour;
                $isManual = ($witHour >= 6 && $witHour <= 18);

                    $slotKeyMinute = $slotTime->format('Y-m-d H:i');
                    $slotKeyHour = $slotTime->format('Y-m-d H');
                    $rec = $metarMap[$slotKeyMinute] ?? ($metarMap[$slotKeyHour] ?? null);

                    // Timely Window for METAR: -2 min to +2 min (minute :58 to :02:59)
                    $windowStart = $slotTime->copy()->subMinutes(2);
                    $windowEnd = $slotTime->copy()->addMinutes(2)->endOfMinute();

                    $sentTs = $rec->sent_timestamp ?? $rec->received_timestamp ?? $rec->data_timestamp ?? null;
                    $sentCarbon = $sentTs ? Carbon::parse(is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s'), 'UTC') : null;

                    $slotLabel = $isManual
                        ? sprintf('METAR Manual %02d:%02d UTC', $h, $m)
                        : sprintf('AWOS Auto %02d:%02d UTC', $h, $m);

                    if ($isManual) {
                        $manualStats['target']++;
                    } else {
                        $awosStats['target']++;
                    }

                    if ($rec) {
                        if ($sentCarbon && $sentCarbon->between($windowStart, $windowEnd)) {
                            if ($isManual) {
                                $manualStats['timely']++;
                            } else {
                                $awosStats['timely']++;
                            }
                        } elseif ($sentCarbon && $sentCarbon->lt($windowStart)) {
                            if ($isManual) {
                                $manualStats['early']++;
                            } else {
                                $awosStats['early']++;
                            }
                            $diffSec = max(0, $windowStart->getTimestamp() - $sentCarbon->getTimestamp());
                            $earlyMins = max(1, (int) ceil($diffSec / 60.0));
                            $anomalyRecords[] = [
                                'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                                'slot_label' => $slotLabel,
                                'status' => 'lebih_awal',
                                'status_label' => "Lebih Awal ({$earlyMins} mnt)",
                                'sent_timestamp' => $sentCarbon->format('Y-m-d H:i:s') . ' UTC',
                                'observer' => $getObserverName($rec, $slotTime),
                            ];
                        } else {
                            if ($isManual) {
                                $manualStats['late']++;
                            } else {
                                $awosStats['late']++;
                            }
                            $deadline = $slotTime->copy()->addMinutes(2);
                            $diffSec = $sentCarbon ? max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp()) : 0;
                            $delayMins = max(1, (int) ceil($diffSec / 60.0));
                            $anomalyRecords[] = [
                                'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                                'slot_label' => $slotLabel,
                                'status' => 'terlambat',
                                'status_label' => "Terlambat ({$delayMins} mnt)",
                                'sent_timestamp' => $sentCarbon ? $sentCarbon->format('Y-m-d H:i:s') . ' UTC' : '-',
                                'observer' => $getObserverName($rec, $slotTime),
                            ];
                        }
                    } else {
                        if ($isManual) {
                            $manualStats['missing']++;
                        } else {
                            $awosStats['missing']++;
                        }
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => $slotLabel,
                            'status' => 'missing',
                            'status_label' => 'Missing (Tidak Ada Data)',
                            'sent_timestamp' => '-',
                            'observer' => $getObserverName(null, $slotTime),
                        ];
                    }
            }
        }

        $calcPct = fn($val, $target) => $target > 0 ? round(($val / $target) * 100, 2) : 0;

        $manualSummary = [
            'jenis' => 'METAR Manual (06.00 - 18.00 WIT)',
            'target' => $manualStats['target'],
            'target_pct' => 100,
            'timely' => $manualStats['timely'],
            'timely_pct' => $calcPct($manualStats['timely'], $manualStats['target']),
            'late' => $manualStats['late'],
            'late_pct' => $calcPct($manualStats['late'], $manualStats['target']),
            'early' => $manualStats['early'],
            'early_pct' => $calcPct($manualStats['early'], $manualStats['target']),
            'missing' => $manualStats['missing'],
            'missing_pct' => $calcPct($manualStats['missing'], $manualStats['target']),
        ];

        $awosSummary = [
            'jenis' => 'AWOS Auto METAR (18.30 - 05.30 WIT)',
            'target' => $awosStats['target'],
            'target_pct' => 100,
            'timely' => $awosStats['timely'],
            'timely_pct' => $calcPct($awosStats['timely'], $awosStats['target']),
            'late' => $awosStats['late'],
            'late_pct' => $calcPct($awosStats['late'], $awosStats['target']),
            'early' => $awosStats['early'],
            'early_pct' => $calcPct($awosStats['early'], $awosStats['target']),
            'missing' => $awosStats['missing'],
            'missing_pct' => $calcPct($awosStats['missing'], $awosStats['target']),
        ];

        $totalTarget = $manualStats['target'] + $awosStats['target'];
        $totalTimely = $manualStats['timely'] + $awosStats['timely'];
        $totalLate = $manualStats['late'] + $awosStats['late'];
        $totalEarly = $manualStats['early'] + $awosStats['early'];
        $totalMissing = $manualStats['missing'] + $awosStats['missing'];

        $totalSummary = [
            'jenis' => 'JUMLAH TOTAL EVALUASI',
            'target' => $totalTarget,
            'target_pct' => 100,
            'timely' => $totalTimely,
            'timely_pct' => $calcPct($totalTimely, $totalTarget),
            'late' => $totalLate,
            'late_pct' => $calcPct($totalLate, $totalTarget),
            'early' => $totalEarly,
            'early_pct' => $calcPct($totalEarly, $totalTarget),
            'missing' => $totalMissing,
            'missing_pct' => $calcPct($totalMissing, $totalTarget),
        ];

        // Dynamic 12 months trend looking back from selected month/year ($bulan, $tahun) based on real data_metar records
        $selectedEnd = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->endOfMonth();
        $trendStart = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->subMonths(11)->startOfMonth();

        $allTrendRecords = DataMetar::whereBetween('data_timestamp', [$trendStart->toDateTimeString(), $selectedEnd->toDateTimeString()])->get();

        $namaBulanShort = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
            9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des'
        ];

        $monthlyTrendPercentage = [];
        $monthlyTrendLate = [];

        for ($i = 11; $i >= 0; $i--) {
            $dtMonth = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->subMonths($i);
            $m = (int) $dtMonth->month;
            $y = (int) $dtMonth->year;
            $mDays = $dtMonth->daysInMonth;

            $mStart = Carbon::create($y, $m, 1, 0, 0, 0, 'UTC')->startOfMonth();
            $mEnd = Carbon::create($y, $m, 1, 0, 0, 0, 'UTC')->endOfMonth();

            $mRecs = $allTrendRecords->filter(function ($r) use ($mStart, $mEnd) {
                $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
                $dt = Carbon::parse($rawStr, 'UTC');
                return $dt->gte($mStart) && $dt->lte($mEnd);
            });

            $label = $namaBulanShort[$m] . ' ' . substr((string) $y, 2);
            $fullLabel = $namaBulanShort[$m] . ' ' . $y;

            if ($mRecs->isEmpty()) {
                $monthlyTrendPercentage[] = [
                    'label' => $label,
                    'full_label' => $fullLabel,
                    'value' => 0,
                    'timely_count' => 0,
                    'target_count' => $mDays * 24,
                    'has_data' => false,
                ];
                $monthlyTrendLate[] = [
                    'label' => $label,
                    'full_label' => $fullLabel,
                    'value' => 0,
                    'target_count' => $mDays * 24,
                    'has_data' => false,
                ];
                continue;
            }

            $mMap = [];
            foreach ($mRecs as $r) {
                $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
                $dt = Carbon::parse($rawStr, 'UTC');
                $keyMinute = $dt->format('Y-m-d H:i');
                $keyHour = $dt->format('Y-m-d H');
                $mMap[$keyMinute] = $r;
                if (!isset($mMap[$keyHour])) {
                    $mMap[$keyHour] = $r;
                }
            }

            $mTarget = $mDays * 24;
            $mTimely = 0;
            $mLate = 0;

            for ($d = 1; $d <= $mDays; $d++) {
                for ($h = 0; $h < 24; $h++) {
                    $slotTime = Carbon::create($y, $m, $d, $h, 0, 0, 'UTC');
                    $slotKeyMinute = $slotTime->format('Y-m-d H:i');
                    $slotKeyHour = $slotTime->format('Y-m-d H');
                    $rec = $mMap[$slotKeyMinute] ?? ($mMap[$slotKeyHour] ?? null);

                    if ($rec) {
                        $windowStart = $slotTime->copy()->subMinutes(2);
                        $windowEnd = $slotTime->copy()->addMinutes(2)->endOfMinute();

                        $sentTs = $rec->sent_timestamp ?? $rec->received_timestamp ?? $rec->data_timestamp ?? null;
                        $sentCarbon = $sentTs ? Carbon::parse(is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s'), 'UTC') : null;

                        if ($sentCarbon && $sentCarbon->between($windowStart, $windowEnd)) {
                            $mTimely++;
                        } elseif ($sentCarbon && $sentCarbon->gt($windowEnd)) {
                            $mLate++;
                        }
                    }
                }
            }

            $pct = $mTarget > 0 ? round(($mTimely / $mTarget) * 100, 2) : 0;

            $monthlyTrendPercentage[] = [
                'label' => $label,
                'full_label' => $fullLabel,
                'value' => $pct,
                'timely_count' => $mTimely,
                'target_count' => $mTarget,
                'has_data' => true,
            ];
            $monthlyTrendLate[] = [
                'label' => $label,
                'full_label' => $fullLabel,
                'value' => $mLate,
                'target_count' => $mTarget,
                'has_data' => true,
            ];
        }

        return [
            'manualSummary' => $manualSummary,
            'awosSummary' => $awosSummary,
            'totalSummary' => $totalSummary,
            'monthlyTrendPercentage' => $monthlyTrendPercentage,
            'monthlyTrendLate' => $monthlyTrendLate,
            'anomalyRecords' => $anomalyRecords,
        ];
    }
}
