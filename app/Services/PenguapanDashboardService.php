<?php

namespace App\Services;

use App\Models\DataPenguapan;
use Carbon\Carbon;

class PenguapanDashboardService
{
    /**
     * Compute statistics and metrics for Penguapan Dashboard.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $monthRecords = DataPenguapan::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        $recordsMap = [];
        $totalPenguapan = 0.0;
        $totalCurahHujan = 0.0;
        $wsSum = 0.0;
        $wsCount = 0;
        $maxPenguapanDay = null;
        $maxPenguapanVal = -1.0;

        $cleanVal = function ($val) {
            if ($val === null) return null;
            $f = (float) $val;
            if ($f == 8888 || $f == 9999) return 0.0;
            return $f;
        };

        foreach ($monthRecords as $rec) {
            $rawStr = is_string($rec->data_timestamp) ? $rec->data_timestamp : $rec->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $recordsMap[$day] = $rec;

            $opEvaVal = $cleanVal($rec->op_eva);
            if ($opEvaVal !== null) {
                $totalPenguapan += $opEvaVal;
                if ($opEvaVal > $maxPenguapanVal) {
                    $maxPenguapanVal = $opEvaVal;
                    $maxPenguapanDay = $day;
                }
            }

            $rrVal = $cleanVal($rec->rr_0700);
            if ($rrVal !== null) {
                $totalCurahHujan += $rrVal;
            }

            $wsVal = $cleanVal($rec->ws_avg_0c5);
            if ($wsVal !== null) {
                $wsSum += $wsVal;
                $wsCount++;
            }
        }

        $daysReported = count($recordsMap);
        $avgPenguapanHarian = $daysReported > 0 ? round($totalPenguapan / $daysReported, 2) : 0.0;
        $avgWs0c5 = $wsCount > 0 ? round($wsSum / $wsCount, 2) : 0.0;

        // Missing days list
        $missingDays = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            if (!isset($recordsMap[$d])) {
                $missingDays[] = $d;
            }
        }

        // 12 Months Trend for Year
        $yearStart = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
        $yearEnd = Carbon::createFromDate($tahun, 12, 31)->endOfYear();
        $yearRecords = DataPenguapan::whereBetween('data_timestamp', [$yearStart->toDateTimeString(), $yearEnd->toDateTimeString()])
            ->get();

        $monthlyTrend = [];
        $namaBulanShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for ($m = 1; $m <= 12; $m++) {
            $mStart = Carbon::createFromDate($tahun, $m, 1)->startOfMonth();
            $mEnd = $mStart->copy()->endOfMonth();
            $mDays = $mStart->daysInMonth;

            $mRecs = $yearRecords->filter(function ($r) use ($mStart, $mEnd) {
                $dt = is_string($r->data_timestamp) ? Carbon::parse($r->data_timestamp, 'UTC') : $r->data_timestamp;
                return $dt->gte($mStart) && $dt->lte($mEnd);
            });

            $mEva = round((float) $mRecs->sum(fn($r) => $cleanVal($r->op_eva) ?? 0), 1);
            $mRain = round((float) $mRecs->sum(fn($r) => $cleanVal($r->rr_0700) ?? 0), 1);
            $mWsAvg = $mRecs->count() > 0 ? round((float) $mRecs->avg(fn($r) => $cleanVal($r->ws_avg_0c5) ?? 0), 2) : 0.0;

            $monthlyTrend[] = [
                'month_num' => $m,
                'month_name' => $namaBulanShort[$m - 1],
                'total_evaporation' => $mEva,
                'total_rainfall' => $mRain,
                'avg_ws_0c5' => $mWsAvg,
                'days_reported' => $mRecs->count(),
                'target_days' => $mDays,
            ];
        }

        return [
            'summary' => [
                'days_reported' => $daysReported,
                'target_days' => $daysInMonth,
                'completeness_pct' => $daysInMonth > 0 ? round(($daysReported / $daysInMonth) * 100, 1) : 0,
                'total_evaporation' => round($totalPenguapan, 1),
                'avg_evaporation_daily' => $avgPenguapanHarian,
                'total_rainfall_0700' => round($totalCurahHujan, 1),
                'avg_ws_0c5' => $avgWs0c5,
                'max_evaporation_day' => $maxPenguapanDay,
                'max_evaporation_val' => $maxPenguapanVal >= 0 ? round($maxPenguapanVal, 1) : 0.0,
            ],
            'missing_days' => $missingDays,
            'monthly_trend' => $monthlyTrend,
        ];
    }
}
