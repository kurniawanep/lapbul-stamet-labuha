<?php

namespace App\Services;

use App\Models\DataDiseminasiMkg;
use App\Models\Pegawai;
use Carbon\Carbon;

class SimpanMkgDashboardService
{
    /**
     * Compute comprehensive statistics and employee recap for the given month and year.
     */
    public function getMonthlyStats(int $bulan, int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $daysInMonth = $startDate->daysInMonth;
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataDiseminasiMkg::with(['pegawai', 'shift'])
            ->whereBetween('dissemination_timestamp', [$startDate, $endDate])
            ->whereHas('pegawai', function ($q) {
                $q->where('role', 'LIKE', '%Observer%')
                  ->orWhere('role', 'LIKE', '%Forecaster%');
            })
            ->get();

        $totalRecords = $records->count();

        // 1. Media Type Breakdown
        $mediaCounts = [
            'image' => $records->where('media_type', 'image')->count(),
            'video' => $records->where('media_type', 'video')->count(),
            'document' => $records->where('media_type', 'document')->count(),
            'text' => $records->where('media_type', 'text')->count(),
        ];

        // 2. Platform Breakdown
        $platformCounts = [
            'instagram' => 0,
            'facebook' => 0,
            'threads' => 0,
            'wa_group' => 0,
        ];

        foreach ($records as $r) {
            $platforms = is_array($r->platforms) ? $r->platforms : [];
            foreach ($platforms as $p) {
                $pLower = strtolower((string)$p);
                if (str_contains($pLower, 'instagram') || str_contains($pLower, 'ig')) {
                    $platformCounts['instagram']++;
                } elseif (str_contains($pLower, 'facebook') || str_contains($pLower, 'fb')) {
                    $platformCounts['facebook']++;
                } elseif (str_contains($pLower, 'threads')) {
                    $platformCounts['threads']++;
                } elseif (str_contains($pLower, 'wa') || str_contains($pLower, 'group') || str_contains($pLower, 'whatsapp')) {
                    $platformCounts['wa_group']++;
                }
            }
        }

        // 3. Status Counts
        $successCount = $records->where('status', 'success')->count();
        $successRate = $totalRecords > 0 ? round(($successCount / $totalRecords) * 100, 1) : 100.0;
        $dailyAvg = round($totalRecords / max(1, $daysInMonth), 1);

        // 4. Employee Recap (Operational Staff: Observer & Forecaster Only)
        // Fetch strictly Observer & Forecaster pegawai
        $operationalStaff = Pegawai::where(function ($q) {
            $q->where('role', 'LIKE', '%Observer%')
              ->orWhere('role', 'LIKE', '%Forecaster%');
        })
        ->orderBy('id')
        ->get();

        $groupedByPegawai = $records->groupBy('pegawai_id');

        $staffRecap = [];
        foreach ($operationalStaff as $pegawai) {
            $pegawaiRecords = $groupedByPegawai->get($pegawai->id, collect());
            $cnt = $pegawaiRecords->count();

            // Shift breakdown
            $pagiCount = $pegawaiRecords->filter(fn($r) => in_array($r->shift_kode, ['P', 'PF', 'PO', 'P1']) || str_contains(strtoupper($r->shift_nama ?? ''), 'PAGI'))->count();
            $siangCount = $pegawaiRecords->filter(fn($r) => in_array($r->shift_kode, ['S', 'SO']) || str_contains(strtoupper($r->shift_nama ?? ''), 'SIANG'))->count();
            $malamCount = $pegawaiRecords->filter(fn($r) => in_array($r->shift_kode, ['M', 'M1', 'M2']) || str_contains(strtoupper($r->shift_nama ?? ''), 'MALAM'))->count();
            $lainnyaCount = $cnt - ($pagiCount + $siangCount + $malamCount);

            $staffRecap[] = [
                'pegawai_id' => $pegawai->id,
                'nama' => $pegawai->nama,
                'nip' => $pegawai->nip ?? '-',
                'role' => $pegawai->role ?? 'Observer & Forecaster',
                'total_count' => $cnt,
                'pct_of_total' => $totalRecords > 0 ? round(($cnt / $totalRecords) * 100, 1) : 0,
                'breakdown_shift' => [
                    'pagi' => $pagiCount,
                    'siang' => $siangCount,
                    'malam' => $malamCount,
                    'lainnya' => max(0, $lainnyaCount),
                ],
                'breakdown_media' => [
                    'image' => $pegawaiRecords->where('media_type', 'image')->count(),
                    'video' => $pegawaiRecords->where('media_type', 'video')->count(),
                    'document' => $pegawaiRecords->where('media_type', 'document')->count(),
                    'text' => $pegawaiRecords->where('media_type', 'text')->count(),
                ],
            ];
        }

        // Unassigned records (not mapped to any duty schedule or outside obs/forecast)
        $unassignedRecords = $records->filter(function ($r) use ($operationalStaff) {
            return empty($r->pegawai_id) || !$operationalStaff->contains('id', $r->pegawai_id);
        });
        $unassignedCount = $unassignedRecords->count();

        // Sort staff recap by total_count descending
        usort($staffRecap, fn($a, $b) => $b['total_count'] <=> $a['total_count']);

        // Identify Top Contributor
        $topStaff = !empty($staffRecap) && $staffRecap[0]['total_count'] > 0 ? $staffRecap[0] : null;

        // 5. Daily Trend (1..daysInMonth)
        $dailyTrends = [];
        $dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dt = Carbon::createFromDate($tahun, $bulan, $d);
            $dateStr = $dt->format('Y-m-d');
            $dayRecords = $records->filter(function ($r) use ($dateStr) {
                return $r->dissemination_timestamp && $r->dissemination_timestamp->format('Y-m-d') === $dateStr;
            });

            $dailyTrends[] = [
                'day' => $d,
                'date' => $dateStr,
                'day_name' => $dayNamesShort[$dt->dayOfWeek],
                'total' => $dayRecords->count(),
                'image' => $dayRecords->where('media_type', 'image')->count(),
                'video' => $dayRecords->where('media_type', 'video')->count(),
            ];
        }

        return [
            'summary' => [
                'total_disseminations' => $totalRecords,
                'success_rate' => $successRate,
                'daily_avg' => $dailyAvg,
                'top_contributor_nama' => $topStaff ? $topStaff['nama'] : '-',
                'top_contributor_count' => $topStaff ? $topStaff['total_count'] : 0,
                'unassigned_count' => $unassignedCount,
            ],
            'media_counts' => $mediaCounts,
            'platform_counts' => $platformCounts,
            'staff_recap' => $staffRecap,
            'daily_trends' => $dailyTrends,
        ];
    }
}
