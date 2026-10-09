<?php

namespace App\Services;

use App\Models\DataWxrev;
use Carbon\Carbon;

class WxrevDashboardService
{
    protected array $namaBulanShort = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
        9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    /**
     * Compute statistics and dashboard metrics for WXREV observation data.
     */
    public function getDashboardStats(int $bulan, int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $monthRecords = DataWxrev::whereBetween('data_timestamp', [
            $startDate->toDateTimeString(),
            $endDate->toDateTimeString(),
        ])->get();

        $recordsMap = [];
        $totalRainfall = 0.0;
        $maxRainDay = null;
        $maxRainVal = 0.0;
        $rainDaysCount = 0;

        $tempMaxList = [];
        $tempMinList = [];
        $pressureMaxList = [];
        $pressureMinList = [];
        $rhMaxList = [];
        $rhMinList = [];
        $windSpeedList = [];
        $windDirCounts = [];

        foreach ($monthRecords as $rec) {
            $rawStr = is_string($rec->data_timestamp) ? $rec->data_timestamp : $rec->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $recordsMap[$day] = $rec;

            // Rainfall
            if ($rec->rainfall_24 !== null) {
                $rawRf = (float) $rec->rainfall_24;
                if ($rawRf != 8888 && $rawRf != 9999) {
                    $totalRainfall += $rawRf;
                    if ($rawRf > 0) {
                        $rainDaysCount++;
                    }
                    if ($rawRf > $maxRainVal) {
                        $maxRainVal = $rawRf;
                        $maxRainDay = $day;
                    }
                }
            }

            // Temperature
            if ($rec->temperature_max !== null) {
                $tempMaxList[$day] = (float) $rec->temperature_max;
            }
            if ($rec->temperature_min !== null) {
                $tempMinList[$day] = (float) $rec->temperature_min;
            }

            // Pressure
            if ($rec->pressure_max !== null) {
                $pressureMaxList[$day] = (float) $rec->pressure_max;
            }
            if ($rec->pressure_min !== null) {
                $pressureMinList[$day] = (float) $rec->pressure_min;
            }

            // Relative Humidity
            if ($rec->relative_humidity_max !== null) {
                $rhMaxList[$day] = (float) $rec->relative_humidity_max;
            }
            if ($rec->relative_humidity_min !== null) {
                $rhMinList[$day] = (float) $rec->relative_humidity_min;
            }

            // Wind
            if ($rec->dominant_wind_speed_1 !== null) {
                $windSpeedList[] = (float) $rec->dominant_wind_speed_1;
            }
            if ($rec->dominant_wind_direction_1 !== null) {
                $dirKey = (string) $rec->dominant_wind_direction_1;
                $windDirCounts[$dirKey] = ($windDirCounts[$dirKey] ?? 0) + 1;
            }
        }

        $daysReported = count($recordsMap);
        $completenessPct = $daysInMonth > 0 ? round(($daysReported / $daysInMonth) * 100, 1) : 0.0;

        // Missing days calculation
        $missingDays = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            if (! isset($recordsMap[$d])) {
                $missingDays[] = $d;
            }
        }

        // Extremes and averages
        $highestTempMax = ! empty($tempMaxList) ? max($tempMaxList) : null;
        $highestTempMaxDay = $highestTempMax !== null ? array_search($highestTempMax, $tempMaxList) : null;

        $lowestTempMin = ! empty($tempMinList) ? min($tempMinList) : null;
        $lowestTempMinDay = $lowestTempMin !== null ? array_search($lowestTempMin, $tempMinList) : null;

        $avgTempMax = ! empty($tempMaxList) ? round(array_sum($tempMaxList) / count($tempMaxList), 1) : null;
        $avgTempMin = ! empty($tempMinList) ? round(array_sum($tempMinList) / count($tempMinList), 1) : null;

        $highestPressureMax = ! empty($pressureMaxList) ? max($pressureMaxList) : null;
        $lowestPressureMin = ! empty($pressureMinList) ? min($pressureMinList) : null;
        $avgPressure = (! empty($pressureMaxList) && ! empty($pressureMinList))
            ? round((array_sum($pressureMaxList) + array_sum($pressureMinList)) / (count($pressureMaxList) + count($pressureMinList)), 1)
            : null;

        $highestRhMax = ! empty($rhMaxList) ? max($rhMaxList) : null;
        $lowestRhMin = ! empty($rhMinList) ? min($rhMinList) : null;
        $avgRh = (! empty($rhMaxList) && ! empty($rhMinList))
            ? round((array_sum($rhMaxList) + array_sum($rhMinList)) / (count($rhMaxList) + count($rhMinList)), 1)
            : null;

        $maxWindSpeed = ! empty($windSpeedList) ? max($windSpeedList) : null;
        $avgWindSpeed = ! empty($windSpeedList) ? round(array_sum($windSpeedList) / count($windSpeedList), 1) : null;

        arsort($windDirCounts);
        $topWindDir = ! empty($windDirCounts) ? array_key_first($windDirCounts) : null;

        // Daily chart points for target month
        $dailyChartData = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $rec = $recordsMap[$d] ?? null;
            $dailyChartData[] = [
                'day' => $d,
                'date' => sprintf('%04d-%02d-%02d', $tahun, $bulan, $d),
                'has_data' => $rec !== null,
                'temp_max' => $rec?->temperature_max,
                'temp_min' => $rec?->temperature_min,
                'pressure_max' => $rec?->pressure_max,
                'pressure_min' => $rec?->pressure_min,
                'rh_max' => $rec?->relative_humidity_max,
                'rh_min' => $rec?->relative_humidity_min,
                'rainfall' => ($rec?->rainfall_24 == 8888 || $rec?->rainfall_24 == 9999) ? 0 : ($rec?->rainfall_24 ?? 0),
                'wind_speed' => $rec?->dominant_wind_speed_1,
            ];
        }

        // 12-month annual trend
        $yearStart = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
        $yearEnd = Carbon::createFromDate($tahun, 12, 31)->endOfYear();
        $yearRecords = DataWxrev::whereBetween('data_timestamp', [
            $yearStart->toDateTimeString(),
            $yearEnd->toDateTimeString(),
        ])->get();

        $monthlyTrend = [];
        for ($m = 1; $m <= 12; $m++) {
            $mStart = Carbon::createFromDate($tahun, $m, 1)->startOfMonth();
            $mEnd = $mStart->copy()->endOfMonth();
            $mDays = $mStart->daysInMonth;

            $mRecs = $yearRecords->filter(function ($r) use ($mStart, $mEnd) {
                $dt = is_string($r->data_timestamp) ? Carbon::parse($r->data_timestamp, 'UTC') : $r->data_timestamp;
                return $dt->gte($mStart) && $dt->lte($mEnd);
            });

            $mDaysReported = $mRecs->count();
            $mPct = $mDays > 0 ? round(($mDaysReported / $mDays) * 100, 1) : 0;
            $mRainTotal = round((float) $mRecs->sum(fn ($r) => ($r->rainfall_24 == 8888 || $r->rainfall_24 == 9999) ? 0 : ($r->rainfall_24 ?? 0)), 1);
            $mRainDays = $mRecs->filter(fn ($r) => $r->rainfall_24 !== null && $r->rainfall_24 != 8888 && $r->rainfall_24 != 9999 && $r->rainfall_24 > 0)->count();

            $mTempMaxAvg = $mRecs->whereNotNull('temperature_max')->avg('temperature_max');
            $mTempMinAvg = $mRecs->whereNotNull('temperature_min')->avg('temperature_min');

            $monthlyTrend[] = [
                'month_num' => $m,
                'month_name' => $this->namaBulanShort[$m] ?? '',
                'days_reported' => $mDaysReported,
                'target_days' => $mDays,
                'completeness_pct' => $mPct,
                'rainfall_total' => $mRainTotal,
                'rain_days' => $mRainDays,
                'temp_max_avg' => $mTempMaxAvg !== null ? round((float) $mTempMaxAvg, 1) : null,
                'temp_min_avg' => $mTempMinAvg !== null ? round((float) $mTempMinAvg, 1) : null,
            ];
        }

        return [
            'summary' => [
                'days_reported' => $daysReported,
                'target_days' => $daysInMonth,
                'completeness_pct' => $completenessPct,
                'rainfall_total' => round($totalRainfall, 1),
                'rainfall_max_day' => $maxRainDay,
                'rainfall_max_val' => round($maxRainVal, 1),
                'rain_days_count' => $rainDaysCount,
                'highest_temp_max' => $highestTempMax,
                'highest_temp_max_day' => $highestTempMaxDay,
                'lowest_temp_min' => $lowestTempMin,
                'lowest_temp_min_day' => $lowestTempMinDay,
                'avg_temp_max' => $avgTempMax,
                'avg_temp_min' => $avgTempMin,
                'highest_pressure_max' => $highestPressureMax,
                'lowest_pressure_min' => $lowestPressureMin,
                'avg_pressure' => $avgPressure,
                'highest_rh_max' => $highestRhMax,
                'lowest_rh_min' => $lowestRhMin,
                'avg_rh' => $avgRh,
                'max_wind_speed' => $maxWindSpeed,
                'avg_wind_speed' => $avgWindSpeed,
                'top_wind_dir' => $topWindDir,
            ],
            'missing_days' => $missingDays,
            'daily_chart_data' => $dailyChartData,
            'monthly_trend' => $monthlyTrend,
        ];
    }
}
