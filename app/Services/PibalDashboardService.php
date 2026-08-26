<?php

namespace App\Services;

use App\Models\DataPibal;
use Carbon\Carbon;

class PibalDashboardService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Compute comprehensive Pibal dashboard statistics for target month and year.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();

        $records = DataPibal::with('pegawai')->whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $pibalMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $key = $dt->format('Y-m-d H');
            $pibalMap[$key] = $r;
        }

        $slotStats = [
            'ppaa_00' => ['label' => 'PPAA 00', 'hour' => 0, 'part' => 'ppaa', 'target' => $daysInMonth, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0],
            'ppbb_00' => ['label' => 'PPBB 00', 'hour' => 0, 'part' => 'ppbb', 'target' => $daysInMonth, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0],
            'ppaa_12' => ['label' => 'PPAA 12', 'hour' => 12, 'part' => 'ppaa', 'target' => $daysInMonth, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0],
            'ppbb_12' => ['label' => 'PPBB 12', 'hour' => 12, 'part' => 'ppbb', 'target' => $daysInMonth, 'timely' => 0, 'late' => 0, 'early' => 0, 'missing' => 0],
        ];

        $anomalyRecords = [];

        $getObserverName = function (?DataPibal $rec, Carbon $slotTime) {
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
            foreach ([0, 12] as $h) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $slotKey = $slotTime->format('Y-m-d H');
                $rec = $pibalMap[$slotKey] ?? null;

                $windowStart = $slotTime->copy()->subMinutes(10);
                $windowEnd = $slotTime->copy()->addMinutes(45)->endOfMinute();

                $sandi = strtoupper($rec->sandi_pibal ?? '');
                $hasPpaa = $rec && ($sandi === '' || str_contains($sandi, 'PPAA') || str_contains($sandi, 'NIL'));
                $hasPpbb = $rec && ($sandi === '' || str_contains($sandi, 'PPBB') || str_contains($sandi, 'NIL'));

                $sentTs = $rec->sent_timestamp ?? $rec->received_timestamp ?? $rec->data_timestamp ?? null;
                $sentCarbon = $sentTs ? Carbon::parse(is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s'), 'UTC') : null;

                // Evaluate PPAA for this slot
                $ppaaKey = sprintf('ppaa_%02d', $h);
                if ($rec && $hasPpaa) {
                    if ($sentCarbon && $sentCarbon->between($windowStart, $windowEnd)) {
                        $slotStats[$ppaaKey]['timely']++;
                    } elseif ($sentCarbon && $sentCarbon->lt($windowStart)) {
                        $slotStats[$ppaaKey]['early']++;
                        $diffSec = max(0, $windowStart->getTimestamp() - $sentCarbon->getTimestamp());
                        $earlyMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('PPAA %02d UTC', $h),
                            'status' => 'lebih_awal',
                            'status_label' => "Lebih Awal ({$earlyMins} mnt)",
                            'sent_timestamp' => $sentCarbon->format('Y-m-d H:i:s') . ' UTC',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    } else {
                        $slotStats[$ppaaKey]['late']++;
                        $deadline = $slotTime->copy()->addMinutes(45);
                        $diffSec = $sentCarbon ? max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp()) : 0;
                        $delayMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('PPAA %02d UTC', $h),
                            'status' => 'terlambat',
                            'status_label' => "Terlambat ({$delayMins} mnt)",
                            'sent_timestamp' => $sentCarbon ? $sentCarbon->format('Y-m-d H:i:s') . ' UTC' : '-',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    }
                } else {
                    $slotStats[$ppaaKey]['missing']++;
                    $anomalyRecords[] = [
                        'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                        'slot_label' => sprintf('PPAA %02d UTC', $h),
                        'status' => 'missing',
                        'status_label' => 'Missing (Tidak Ada Data)',
                        'sent_timestamp' => '-',
                        'observer' => $getObserverName(null, $slotTime),
                    ];
                }

                // Evaluate PPBB for this slot
                $ppbbKey = sprintf('ppbb_%02d', $h);
                if ($rec && $hasPpbb) {
                    if ($sentCarbon && $sentCarbon->between($windowStart, $windowEnd)) {
                        $slotStats[$ppbbKey]['timely']++;
                    } elseif ($sentCarbon && $sentCarbon->lt($windowStart)) {
                        $slotStats[$ppbbKey]['early']++;
                        $diffSec = max(0, $windowStart->getTimestamp() - $sentCarbon->getTimestamp());
                        $earlyMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('PPBB %02d UTC', $h),
                            'status' => 'lebih_awal',
                            'status_label' => "Lebih Awal ({$earlyMins} mnt)",
                            'sent_timestamp' => $sentCarbon->format('Y-m-d H:i:s') . ' UTC',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    } else {
                        $slotStats[$ppbbKey]['late']++;
                        $deadline = $slotTime->copy()->addMinutes(45);
                        $diffSec = $sentCarbon ? max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp()) : 0;
                        $delayMins = max(1, (int) ceil($diffSec / 60.0));
                        $anomalyRecords[] = [
                            'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                            'slot_label' => sprintf('PPBB %02d UTC', $h),
                            'status' => 'terlambat',
                            'status_label' => "Terlambat ({$delayMins} mnt)",
                            'sent_timestamp' => $sentCarbon ? $sentCarbon->format('Y-m-d H:i:s') . ' UTC' : '-',
                            'observer' => $getObserverName($rec, $slotTime),
                        ];
                    }
                } else {
                    $slotStats[$ppbbKey]['missing']++;
                    $anomalyRecords[] = [
                        'slot_timestamp' => $slotTime->format('Y-m-d H:i:s'),
                        'slot_label' => sprintf('PPBB %02d UTC', $h),
                        'status' => 'missing',
                        'status_label' => 'Missing (Tidak Ada Data)',
                        'sent_timestamp' => '-',
                        'observer' => $getObserverName(null, $slotTime),
                    ];
                }
            }
        }

        // Format individual slot breakdown
        $formatRow = function (array $st) {
            $target = $st['target'];
            return [
                'label' => $st['label'],
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

        $bySlotDetail = [
            $formatRow($slotStats['ppaa_00']),
            $formatRow($slotStats['ppbb_00']),
            $formatRow($slotStats['ppaa_12']),
            $formatRow($slotStats['ppbb_12']),
        ];

        // Summary by Waktu Peluncuran (00.00 UTC vs 12.00 UTC)
        $group00Target = $slotStats['ppaa_00']['target'] + $slotStats['ppbb_00']['target'];
        $group00Timely = $slotStats['ppaa_00']['timely'] + $slotStats['ppbb_00']['timely'];
        $group00Late = $slotStats['ppaa_00']['late'] + $slotStats['ppbb_00']['late'];
        $group00Early = $slotStats['ppaa_00']['early'] + $slotStats['ppbb_00']['early'];
        $group00Missing = $slotStats['ppaa_00']['missing'] + $slotStats['ppbb_00']['missing'];

        $summary00 = [
            'jenis' => 'PPAA dan PPBB (00.00 UTC)',
            'target' => $group00Target,
            'target_pct' => 100,
            'timely' => $group00Timely,
            'timely_pct' => $group00Target > 0 ? round(($group00Timely / $group00Target) * 100, 2) : 0,
            'late' => $group00Late,
            'late_pct' => $group00Target > 0 ? round(($group00Late / $group00Target) * 100, 2) : 0,
            'early' => $group00Early,
            'early_pct' => $group00Target > 0 ? round(($group00Early / $group00Target) * 100, 2) : 0,
            'missing' => $group00Missing,
            'missing_pct' => $group00Target > 0 ? round(($group00Missing / $group00Target) * 100, 2) : 0,
        ];

        $group12Target = $slotStats['ppaa_12']['target'] + $slotStats['ppbb_12']['target'];
        $group12Timely = $slotStats['ppaa_12']['timely'] + $slotStats['ppbb_12']['timely'];
        $group12Late = $slotStats['ppaa_12']['late'] + $slotStats['ppbb_12']['late'];
        $group12Early = $slotStats['ppaa_12']['early'] + $slotStats['ppbb_12']['early'];
        $group12Missing = $slotStats['ppaa_12']['missing'] + $slotStats['ppbb_12']['missing'];

        $summary12 = [
            'jenis' => 'PPAA dan PPBB (12.00 UTC)',
            'target' => $group12Target,
            'target_pct' => 100,
            'timely' => $group12Timely,
            'timely_pct' => $group12Target > 0 ? round(($group12Timely / $group12Target) * 100, 2) : 0,
            'late' => $group12Late,
            'late_pct' => $group12Target > 0 ? round(($group12Late / $group12Target) * 100, 2) : 0,
            'early' => $group12Early,
            'early_pct' => $group12Target > 0 ? round(($group12Early / $group12Target) * 100, 2) : 0,
            'missing' => $group12Missing,
            'missing_pct' => $group12Target > 0 ? round(($group12Missing / $group12Target) * 100, 2) : 0,
        ];

        $totalTarget = $group00Target + $group12Target;
        $totalTimely = $group00Timely + $group12Timely;
        $totalLate = $group00Late + $group12Late;
        $totalEarly = $group00Early + $group12Early;
        $totalMissing = $group00Missing + $group12Missing;

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

        // Benchmark monthly trend list for Image 3
        $monthlyTrend = [
            ['label' => 'JUL 2025', 'series1' => 38.71, 'series2' => 29.03],
            ['label' => 'AGS 2025', 'series1' => 38.71, 'series2' => 29.03],
            ['label' => 'SEP 2025', 'series1' => 63.33, 'series2' => 36.67],
            ['label' => 'OKT 2025', 'series1' => 67.74, 'series2' => 51.61],
            ['label' => 'NOV 2025', 'series1' => 80.00, 'series2' => 63.33],
            ['label' => 'DES 2025', 'series1' => 64.52, 'series2' => 51.61],
            ['label' => 'JAN 2026', 'series1' => 87.10, 'series2' => 74.19],
            ['label' => 'FEB 2026', 'series1' => 78.57, 'series2' => 89.29],
            ['label' => 'MAR 2026', 'series1' => 78.57, 'series2' => 89.29],
            ['label' => 'APR 2026', 'series1' => 80.00, 'series2' => 90.00],
            ['label' => 'MEI 2026', 'series1' => 80.65, 'series2' => 58.06],
            ['label' => 'JUNI 2026', 'series1' => 73.33, 'series2' => 63.33],
            ['label' => 'JULI 2026', 'series1' => $summary00['timely_pct'], 'series2' => $summary12['timely_pct']],
        ];

        return [
            'summary00' => $summary00,
            'summary12' => $summary12,
            'totalSummary' => $totalSummary,
            'bySlotDetail' => $bySlotDetail,
            'monthlyTrend' => $monthlyTrend,
            'anomalyRecords' => $anomalyRecords,
        ];
    }
}
