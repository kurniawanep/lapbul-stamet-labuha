<?php

namespace App\Services;

use App\Models\DataTafor;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TaforDashboardService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Calculate TAFOR performance dashboard statistics for a given month and year.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataTafor::with('pegawai:id,nama')
            ->select('id', 'data_timestamp', 'sent_timestamp', 'received_timestamp', 'observer_name', 'pegawai_id')
            ->whereBetween('data_timestamp', [$startDate, $endDate])
            ->get();

        $taforMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $d = (int) $dt->format('j');
            $h = (int) $dt->format('G');
            $taforMap["{$d}_{$h}"] = $r;

            // Mapping for previous hour if issued early
            $prevH = ($h == 0) ? 23 : ($h - 1);
            $targetDay = ($h == 0) ? ($d - 1) : $d;
            if (!isset($taforMap["{$targetDay}_{$prevH}"])) {
                $taforMap["{$targetDay}_{$prevH}"] = $r;
            }
        }

        $getObserverName = function (?DataTafor $rec, Carbon $slotTime) {
            if ($rec) {
                $name = $rec->pegawai->nama ?? $rec->observer_name;
                if (!empty($name)) {
                    return $name;
                }
            }
            $scheduled = $this->observerResolver->getTaforDutyOfficer($slotTime->format('Y-m-d H:i:s'), 'UTC');
            return $scheduled->nama ?? '-';
        };

        $taforHours = [5, 11, 17, 23];
        $totalTarget = $daysInMonth * count($taforHours);
        $timely = 0;
        $missing = 0;
        $anomalyRecords = [];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            foreach ($taforHours as $h) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $prevH = ($h == 0) ? 23 : ($h - 1);
                $targetDay = ($h == 0) ? ($d - 1) : $d;

                $keyExact = "{$d}_{$h}";
                $keyIssue = "{$targetDay}_{$prevH}";

                $found = $taforMap[$keyExact] ?? ($taforMap[$keyIssue] ?? null);

                $slotLabel = sprintf('Berita TAFOR %02d:00 UTC', $h);

                if ($found) {
                    $timely++;
                } else {
                    $missing++;
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

        $summary = [
            'jenis' => 'Berita TAFOR (05, 11, 17, 23 UTC)',
            'target' => $totalTarget,
            'target_pct' => 100,
            'timely' => $timely,
            'timely_pct' => $calcPct($timely, $totalTarget),
            'late' => 0,
            'late_pct' => 0,
            'early' => 0,
            'early_pct' => 0,
            'missing' => $missing,
            'missing_pct' => $calcPct($missing, $totalTarget),
        ];

        $monthlyTrendReport = $this->getMonthlyTrendReport($bulan, $tahun);

        return [
            'summary' => $summary,
            'monthlyTrendReport' => $monthlyTrendReport,
            'anomalyRecords' => $anomalyRecords,
        ];
    }

    /**
     * Get monthly TAFOR delivery trend data (12 months looking back from target month & year) using real DataTafor records.
     */
    protected function getMonthlyTrendReport(int $bulan, int $tahun): array
    {
        $selectedEnd = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->endOfMonth();
        $trendStart = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->subMonths(11)->startOfMonth();

        $allTrendRecords = DB::table('data_tafor')
            ->select('data_timestamp', 'sent_timestamp', 'received_timestamp')
            ->whereBetween('data_timestamp', [$trendStart->toDateTimeString(), $selectedEnd->toDateTimeString()])
            ->get();

        $trendMap = [];
        $monthCountMap = [];
        foreach ($allTrendRecords as $r) {
            $ts = is_string($r->data_timestamp) ? $r->data_timestamp : (string) $r->data_timestamp;
            $dt = Carbon::parse($ts, 'UTC');
            $d = (int) $dt->format('j');
            $h = (int) $dt->format('G');
            $monthKey = $dt->format('Y-m');

            $trendMap["{$monthKey}_{$d}_{$h}"] = $r;
            $prevH = ($h == 0) ? 23 : ($h - 1);
            $targetDay = ($h == 0) ? ($d - 1) : $d;
            if (!isset($trendMap["{$monthKey}_{$targetDay}_{$prevH}"])) {
                $trendMap["{$monthKey}_{$targetDay}_{$prevH}"] = $r;
            }
            $monthCountMap[$monthKey] = ($monthCountMap[$monthKey] ?? 0) + 1;
        }

        $monthlyTrendReport = [];
        $namaBulanShort = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
            9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des'
        ];

        $namaBulanFull = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $taforHours = [5, 11, 17, 23];

        for ($i = 11; $i >= 0; $i--) {
            $dtMonth = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'UTC')->subMonths($i);
            $m = (int) $dtMonth->month;
            $y = (int) $dtMonth->year;
            $mDays = $dtMonth->daysInMonth;
            $monthKey = sprintf('%04d-%02d', $y, $m);

            $label = $namaBulanShort[$m] . ' ' . substr((string) $y, 2);
            $fullLabel = $namaBulanFull[$m] . ' ' . $y;
            $mTarget = $mDays * 4;

            $hasData = ($monthCountMap[$monthKey] ?? 0) > 0;
            if (!$hasData) {
                $monthlyTrendReport[] = [
                    'label' => $label,
                    'full_label' => $fullLabel,
                    'target' => $mTarget,
                    'sent' => 0,
                    'missing' => $mTarget,
                    'pct' => 0.0,
                    'has_data' => false,
                ];
                continue;
            }

            $mSent = 0;
            $mMissing = 0;

            for ($d = 1; $d <= $mDays; $d++) {
                foreach ($taforHours as $h) {
                    $key = "{$monthKey}_{$d}_{$h}";
                    if (isset($trendMap[$key])) {
                        $mSent++;
                    } else {
                        $mMissing++;
                    }
                }
            }

            $mMissing = max(0, $mTarget - $mSent);
            $pct = $mTarget > 0 ? round(($mSent / $mTarget) * 100, 2) : 0.0;

            $monthlyTrendReport[] = [
                'label' => $label,
                'full_label' => $fullLabel,
                'target' => $mTarget,
                'sent' => $mSent,
                'missing' => $mMissing,
                'pct' => $pct,
                'has_data' => true,
            ];
        }

        return $monthlyTrendReport;
    }
}
