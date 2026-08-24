<?php

namespace App\Services;

use App\Models\DataFklim;
use Carbon\Carbon;

class FklimDashboardService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Calculate FKLIM performance dashboard statistics for a given month and year.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataFklim::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate])
            ->get();

        $fklimMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $d = (int) $dt->format('j');
            $fklimMap[$d] = $r;
        }

        $getObserverName = function (?DataFklim $rec, Carbon $slotTime) {
            if ($rec) {
                $name = $rec->pegawai->nama ?? $rec->observer_name;
                if (!empty($name)) {
                    return $name;
                }
            }
            $scheduled = $this->observerResolver->getObserverByTimestamp($slotTime->format('Y-m-d H:i:s'), 'UTC');
            return $scheduled->nama ?? '-';
        };

        $totalTarget = $daysInMonth;
        $timely = 0;
        $missing = 0;
        $anomalyRecords = [];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $slotTime = Carbon::create($tahun, $bulan, $d, 0, 0, 0, 'UTC');
            $found = $fklimMap[$d] ?? null;

            if ($found) {
                $timely++;
            } else {
                $missing++;
                $anomalyRecords[] = [
                    'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                    'slot_label' => sprintf('Laporan Iklim (FKLIM) Tgl %02d %s', $d, $slotTime->translatedFormat('F')),
                    'status' => 'missing',
                    'status_label' => 'Missing (Tidak Ada Data)',
                    'sent_timestamp' => '-',
                    'observer' => $getObserverName(null, $slotTime),
                ];
            }
        }

        $calcPct = fn($val, $target) => $target > 0 ? round(($val / $target) * 100, 2) : 0;

        $summary = [
            'jenis' => 'Laporan Iklim Harian (FKLIM)',
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

        $monthlyTrendReport = $this->getMonthlyTrendReport($tahun);

        return [
            'summary' => $summary,
            'monthlyTrendReport' => $monthlyTrendReport,
            'anomalyRecords' => $anomalyRecords,
        ];
    }

    /**
     * Get monthly FKLIM delivery trend data (Target, Terkirim, Missing, Persentase).
     */
    protected function getMonthlyTrendReport(int $tahun): array
    {
        $trend = [];
        $monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Juni', 'Juli', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for ($m = 1; $m <= 12; $m++) {
            $days = Carbon::createFromDate($tahun, $m, 1)->daysInMonth;
            $mStart = Carbon::createFromDate($tahun, $m, 1)->startOfMonth();
            $mEnd = Carbon::createFromDate($tahun, $m, $days)->endOfMonth();
            $target = $days; // 1 report per day

            $records = DataFklim::whereBetween('data_timestamp', [$mStart, $mEnd])->get();
            $fMap = [];
            foreach ($records as $r) {
                $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
                $dt = Carbon::parse($rawStr, 'UTC');
                $d = (int) $dt->format('j');
                $fMap[$d] = true;
            }

            $sent = count($fMap);
            $missing = max(0, $target - $sent);
            $pct = $target > 0 ? round(($sent / $target) * 100, 2) : 0;

            $trend[] = [
                'label' => $monthNames[$m - 1],
                'target' => $target,
                'sent' => $sent,
                'missing' => $missing,
                'pct' => $pct,
            ];
        }

        return $trend;
    }
}
