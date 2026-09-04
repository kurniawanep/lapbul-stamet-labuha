<?php

namespace App\Services;

use App\Models\DataPerawanan;
use Carbon\Carbon;

class PerawananDashboardService
{
    /**
     * Compute statistics and metrics for Perawanan Dashboard.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $monthRecords = DataPerawanan::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        $recordsMap = [];
        $totalClear = 0;
        $totalPartlyCloudy = 0;
        $totalCloudy = 0;
        $totalTotallyCloudy = 0;
        $totalObservationHours = 0;

        foreach ($monthRecords as $rec) {
            if ($rec->total_observation === 0 && $rec->clear === 0 && $rec->partly_cloudy === 0 && $rec->cloudy === 0 && $rec->totally_cloudy === 0) {
                continue;
            }

            $rawStr = is_string($rec->data_timestamp) ? $rec->data_timestamp : $rec->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $recordsMap[$day] = $rec;

            $totalClear += $rec->clear;
            $totalPartlyCloudy += $rec->partly_cloudy;
            $totalCloudy += $rec->cloudy;
            $totalTotallyCloudy += $rec->totally_cloudy;
            $totalObservationHours += $rec->total_observation;
        }

        $daysReported = count($recordsMap);

        // Missing days list
        $missingDays = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            if (!isset($recordsMap[$d])) {
                $missingDays[] = $d;
            }
        }

        // Dominant Cloudiness Category
        $categories = [
            'Cerah' => $totalClear,
            'Cerah Berawan' => $totalPartlyCloudy,
            'Berawan' => $totalCloudy,
            'Sangat Berawan / Mendung' => $totalTotallyCloudy,
        ];
        arsort($categories);
        $dominantCategory = array_key_first($categories);
        $dominantHours = $categories[$dominantCategory];

        // 12 Months Trend for Year
        $yearStart = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
        $yearEnd = Carbon::createFromDate($tahun, 12, 31)->endOfYear();
        $yearRecords = DataPerawanan::whereBetween('data_timestamp', [$yearStart->toDateTimeString(), $yearEnd->toDateTimeString()])
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

            $mClear = (int) $mRecs->sum('clear');
            $mPartly = (int) $mRecs->sum('partly_cloudy');
            $mCloudy = (int) $mRecs->sum('cloudy');
            $mTotally = (int) $mRecs->sum('totally_cloudy');

            $monthlyTrend[] = [
                'month_num' => $m,
                'month_name' => $namaBulanShort[$m - 1],
                'clear' => $mClear,
                'partly_cloudy' => $mPartly,
                'cloudy' => $mCloudy,
                'totally_cloudy' => $mTotally,
                'days_reported' => $mRecs->count(),
                'target_days' => $mDays,
            ];
        }

        return [
            'summary' => [
                'days_reported' => $daysReported,
                'target_days' => $daysInMonth,
                'completeness_pct' => $daysInMonth > 0 ? round(($daysReported / $daysInMonth) * 100, 1) : 0,
                'total_clear' => $totalClear,
                'total_partly_cloudy' => $totalPartlyCloudy,
                'total_cloudy' => $totalCloudy,
                'total_totally_cloudy' => $totalTotallyCloudy,
                'total_observation_hours' => $totalObservationHours,
                'dominant_category' => $dominantCategory,
                'dominant_hours' => $dominantHours,
            ],
            'missing_days' => $missingDays,
            'monthly_trend' => $monthlyTrend,
        ];
    }
}
