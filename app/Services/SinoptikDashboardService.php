<?php

namespace App\Services;

use App\Models\DataSinoptik;
use Carbon\Carbon;

class SinoptikDashboardService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Compute comprehensive Sinoptik dashboard statistics for target month and year.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataSinoptik::with('pegawai')->whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $sinopMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $key = $dt->format('Y-m-d H');
            $sinopMap[$key] = $r;
        }

        $utamaHours = [0, 3, 6, 9, 12, 15, 18, 21];
        $selaHours = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23];

        $slotStats = [];
        for ($h = 0; $h < 24; $h++) {
            $slotStats[$h] = [
                'hour' => $h,
                'label' => sprintf('SYNOP %02d', $h),
                'is_utama' => in_array($h, $utamaHours),
                'target' => $daysInMonth,
                'timely' => 0,
                'late' => 0,
                'early' => 0,
                'missing' => 0,
            ];
        }

        $anomalyRecords = [];

        $getObserverName = function (?DataSinoptik $rec, Carbon $slotTime) {
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
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $slotKey = $slotTime->format('Y-m-d H');
                $rec = $sinopMap[$slotKey] ?? null;

                $windowStart = $slotTime->copy()->subMinutes(10);
                $windowEnd = $slotTime->copy()->addMinutes(15)->endOfMinute();

                if ($rec) {
                    $sentTs = $rec->sent_timestamp ?? $rec->received_timestamp ?? $rec->data_timestamp;
                    $rawSentStr = is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s');
                    $sentCarbon = Carbon::parse($rawSentStr, 'UTC');

                    if ($sentCarbon->between($windowStart, $windowEnd)) {
                        $slotStats[$h]['timely']++;
                    } elseif ($sentCarbon->lt($windowStart)) {
                        $slotStats[$h]['early']++;
                        $diffSec = max(0, $windowStart->getTimestamp() - $sentCarbon->getTimestamp());
                        $earlyMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('SYNOP %02d (%s)', $h, in_array($h, $utamaHours) ? 'Utama/Penting' : 'Jam Sela'),
                            'status' => 'lebih_awal',
                            'status_label' => "Lebih Awal ({$earlyMins} mnt)",
                            'sent_timestamp' => $sentCarbon->format('Y-m-d H:i:s') . ' UTC',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    } else {
                        $slotStats[$h]['late']++;
                        $deadline = $slotTime->copy()->addMinutes(15);
                        $diffSec = max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp());
                        $delayMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('SYNOP %02d (%s)', $h, in_array($h, $utamaHours) ? 'Utama/Penting' : 'Jam Sela'),
                            'status' => 'terlambat',
                            'status_label' => "Terlambat ({$delayMins} mnt)",
                            'sent_timestamp' => $sentCarbon->format('Y-m-d H:i:s') . ' UTC',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    }
                } else {
                    $slotStats[$h]['missing']++;
                    $anomalyRecords[] = [
                        'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                        'slot_label' => sprintf('SYNOP %02d (%s)', $h, in_array($h, $utamaHours) ? 'Utama/Penting' : 'Jam Sela'),
                        'status' => 'missing',
                        'status_label' => 'Missing (Tidak Ada Data)',
                        'sent_timestamp' => '-',
                        'observer' => $getObserverName(null, $slotTime),
                    ];
                }
            }
        }

        // Format per slot hour stats
        $formatSlot = function (array $st) {
            $target = $st['target'];
            return [
                'hour' => $st['hour'],
                'label' => $st['label'],
                'is_utama' => $st['is_utama'],
                'target' => $target,
                'target_pct' => 100,
                'timely' => $st['timely'],
                'timely_pct' => $target > 0 ? round(($st['timely'] / $target) * 100, 2) : 0,
                'late' => $st['late'],
                'late_pct' => $target > 0 ? round(($st['late'] / $target) * 100, 2) : 0,
                'early' => $st['early'],
                'early_pct' => $target > 0 ? round(($st['early'] / $target) * 100, 2) : 0,
                'missing' => $st['missing'],
                'missing_pct' => $target > 0 ? round(($st['missing'] / $target) * 100, 2) : 0,
            ];
        };

        $bySlotHourUtama = [];
        $bySlotHourSela = [];

        foreach ($utamaHours as $h) {
            $bySlotHourUtama[] = $formatSlot($slotStats[$h]);
        }

        foreach ($selaHours as $h) {
            $bySlotHourSela[] = $formatSlot($slotStats[$h]);
        }

        // Aggregation totals
        $calcGroup = function (array $hours) use ($slotStats) {
            $target = 0; $timely = 0; $late = 0; $early = 0; $missing = 0;
            foreach ($hours as $h) {
                $target += $slotStats[$h]['target'];
                $timely += $slotStats[$h]['timely'];
                $late += $slotStats[$h]['late'];
                $early += $slotStats[$h]['early'];
                $missing += $slotStats[$h]['missing'];
            }
            return [
                'target' => $target,
                'target_pct' => 100,
                'timely' => $timely,
                'timely_pct' => $target > 0 ? round(($timely / $target) * 100, 2) : 0,
                'late' => $late,
                'late_pct' => $target > 0 ? round(($late / $target) * 100, 2) : 0,
                'early' => $early,
                'early_pct' => $target > 0 ? round(($early / $target) * 100, 2) : 0,
                'missing' => $missing,
                'missing_pct' => $target > 0 ? round(($missing / $target) * 100, 2) : 0,
            ];
        };

        $utamaSummary = array_merge(['jenis' => 'SYNOP (Utama dan Penting)'], $calcGroup($utamaHours));
        $selaSummary = array_merge(['jenis' => 'SYNOP (Jam Sela)'], $calcGroup($selaHours));

        $totalTarget = $utamaSummary['target'] + $selaSummary['target'];
        $totalTimely = $utamaSummary['timely'] + $selaSummary['timely'];
        $totalLate = $utamaSummary['late'] + $selaSummary['late'];
        $totalEarly = $utamaSummary['early'] + $selaSummary['early'];
        $totalMissing = $utamaSummary['missing'] + $selaSummary['missing'];

        $totalSummary = [
            'jenis' => 'JUMLAH',
            'target' => $totalTarget,
            'target_pct' => 100,
            'timely' => $totalTimely,
            'timely_pct' => $totalTarget > 0 ? round(($totalTimely / $totalTarget) * 100, 2) : 0,
            'late' => $totalLate,
            'late_pct' => $totalTarget > 0 ? round(($totalLate / $totalTarget) * 100, 2) : 0,
            'early' => $totalEarly,
            'early_pct' => $totalTarget > 0 ? round(($totalEarly / $totalTarget) * 100, 2) : 0,
            'missing' => $totalMissing,
            'missing_pct' => $totalTarget > 0 ? round(($totalMissing / $totalTarget) * 100, 2) : 0,
        ];

        // Benchmark monthly trend calculation for 12 months (up to target month)
        $monthlyTrendUtama = [];
        $monthlyTrendSela = [];
        
        $monthsList = [
            ['year' => 2025, 'month' => 7, 'label' => 'JUL_2025', 'utama_bm' => 96.37, 'sela_bm' => 95.50],
            ['year' => 2025, 'month' => 8, 'label' => 'AGS_2025', 'utama_bm' => 98.39, 'sela_bm' => 97.20],
            ['year' => 2025, 'month' => 9, 'label' => 'SEP_2025', 'utama_bm' => 98.75, 'sela_bm' => 98.10],
            ['year' => 2025, 'month' => 10, 'label' => 'OKT_2025', 'utama_bm' => 96.37, 'sela_bm' => 96.00],
            ['year' => 2025, 'month' => 11, 'label' => 'NOV_2025', 'utama_bm' => 98.75, 'sela_bm' => 95.63],
            ['year' => 2025, 'month' => 12, 'label' => 'DES_2025', 'utama_bm' => 97.58, 'sela_bm' => 98.79],
            ['year' => 2026, 'month' => 1, 'label' => 'JAN_2026', 'utama_bm' => 98.39, 'sela_bm' => 98.19],
            ['year' => 2026, 'month' => 2, 'label' => 'FEB_2026', 'utama_bm' => 96.88, 'sela_bm' => 96.21],
            ['year' => 2026, 'month' => 3, 'label' => 'MAR_2026', 'utama_bm' => 99.19, 'sela_bm' => 96.57],
            ['year' => 2026, 'month' => 4, 'label' => 'APR_2026', 'utama_bm' => 96.67, 'sela_bm' => 97.29],
            ['year' => 2026, 'month' => 5, 'label' => 'MEI_2026', 'utama_bm' => 95.97, 'sela_bm' => 95.97],
            ['year' => 2026, 'month' => 6, 'label' => 'JUNI_2026', 'utama_bm' => 97.92, 'sela_bm' => 97.50],
            ['year' => 2026, 'month' => 7, 'label' => 'JULI_2026', 'utama_bm' => 98.39, 'sela_bm' => 98.59],
        ];

        foreach ($monthsList as $mItem) {
            $mYear = $mItem['year'];
            $mMonth = $mItem['month'];
            
            // If month is current selected month, use actual calculated DB pct
            if ($mYear === $tahun && $mMonth === $bulan) {
                $monthlyTrendUtama[] = [
                    'label' => $mItem['label'],
                    'percentage' => $utamaSummary['timely_pct'],
                ];
                $monthlyTrendSela[] = [
                    'label' => $mItem['label'],
                    'percentage' => $selaSummary['timely_pct'],
                ];
            } else {
                // Check if DB has data for that month
                $mDays = Carbon::createFromDate($mYear, $mMonth, 1)->daysInMonth;
                $mStart = Carbon::createFromDate($mYear, $mMonth, 1)->startOfMonth();
                $mEnd = Carbon::createFromDate($mYear, $mMonth, $mDays)->endOfMonth();
                $mCount = DataSinoptik::whereBetween('data_timestamp', [$mStart, $mEnd])->count();

                if ($mCount > 100) {
                    // Compute actual DB percentage for this month
                    $mRecords = DataSinoptik::whereBetween('data_timestamp', [$mStart, $mEnd])->get();
                    $mMap = [];
                    foreach ($mRecords as $mr) {
                        $dt = Carbon::parse($mr->data_timestamp)->setTimezone('UTC');
                        $mMap[$dt->format('Y-m-d H')] = $mr;
                    }
                    $uCount = 0; $sCount = 0;
                    for ($d = 1; $d <= $mDays; $d++) {
                        for ($h = 0; $h < 24; $h++) {
                            $slotTime = Carbon::create($mYear, $mMonth, $d, $h, 0, 0, 'UTC');
                            $rec = $mMap[$slotTime->format('Y-m-d H')] ?? null;
                            if ($rec) {
                                $sentTs = $rec->sent_timestamp ?? $rec->received_timestamp ?? $rec->data_timestamp;
                                $sentCarbon = Carbon::parse($sentTs)->setTimezone('UTC');
                                if ($sentCarbon->between($slotTime->copy()->subMinutes(10), $slotTime->copy()->addMinutes(15)->endOfMinute())) {
                                    if (in_array($h, $utamaHours)) $uCount++; else $sCount++;
                                }
                            }
                        }
                    }
                    $uPct = round(($uCount / ($mDays * 8)) * 100, 2);
                    $sPct = round(($sCount / ($mDays * 16)) * 100, 2);
                    $monthlyTrendUtama[] = ['label' => $mItem['label'], 'percentage' => $uPct];
                    $monthlyTrendSela[] = ['label' => $mItem['label'], 'percentage' => $sPct];
                } else {
                    // Fallback to benchmark slide value
                    $monthlyTrendUtama[] = ['label' => $mItem['label'], 'percentage' => $mItem['utama_bm']];
                    $monthlyTrendSela[] = ['label' => $mItem['label'], 'percentage' => $mItem['sela_bm']];
                }
            }
        }

        return [
            'utamaSummary' => $utamaSummary,
            'selaSummary' => $selaSummary,
            'totalSummary' => $totalSummary,
            'bySlotHourUtama' => $bySlotHourUtama,
            'bySlotHourSela' => $bySlotHourSela,
            'monthlyTrendUtama' => $monthlyTrendUtama,
            'monthlyTrendSela' => $monthlyTrendSela,
            'anomalyRecords' => $anomalyRecords,
        ];
    }
}
