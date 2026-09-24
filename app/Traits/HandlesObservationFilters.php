<?php

namespace App\Traits;

use Carbon\Carbon;
use Illuminate\Http\Request;

trait HandlesObservationFilters
{
    /**
     * Resolve date & time range in UTC based on request parameters and timezone.
     *
     * @param Request $request
     * @param int $defaultBulan
     * @param int $defaultTahun
     * @return array{
     *     start_utc: Carbon,
     *     end_utc: Carbon,
     *     timezone: string,
     *     start_date: ?string,
     *     end_date: ?string,
     *     start_time: ?string,
     *     end_time: ?string,
     *     has_custom_filter: bool
     * }
     */
    protected function resolveDateTimeRange(Request $request, int $defaultBulan, int $defaultTahun): array
    {
        $timezone = strtoupper($request->input('timezone', 'UTC'));
        if (!in_array($timezone, ['UTC', 'WIT'])) {
            $timezone = 'UTC';
        }

        $tzIdentifier = ($timezone === 'WIT') ? 'Asia/Jayapura' : 'UTC';

        $startDateInput = $request->input('start_date');
        $endDateInput = $request->input('end_date');
        $startTimeInput = $request->input('start_time');
        $endTimeInput = $request->input('end_time');

        $hasCustomFilter = !empty($startDateInput) || !empty($endDateInput) || !empty($startTimeInput) || !empty($endTimeInput);

        // Determine Start Date
        if (!empty($startDateInput)) {
            $startDateStr = $startDateInput;
        } else {
            $startDateStr = sprintf('%04d-%02d-01', $defaultTahun, $defaultBulan);
        }

        // Determine End Date
        if (!empty($endDateInput)) {
            $endDateStr = $endDateInput;
        } else {
            $daysInMonth = Carbon::createFromDate($defaultTahun, $defaultBulan, 1)->daysInMonth;
            $endDateStr = sprintf('%04d-%02d-%02d', $defaultTahun, $defaultBulan, $daysInMonth);
        }

        // Determine Start Time
        $startTimeStr = !empty($startTimeInput) ? (strlen($startTimeInput) === 5 ? $startTimeInput . ':00' : $startTimeInput) : '00:00:00';

        // Determine End Time
        $endTimeStr = !empty($endTimeInput) ? (strlen($endTimeInput) === 5 ? $endTimeInput . ':59' : $endTimeInput) : '23:59:59';

        try {
            $startCarbonLocal = Carbon::createFromFormat('Y-m-d H:i:s', "{$startDateStr} {$startTimeStr}", $tzIdentifier);
            $endCarbonLocal = Carbon::createFromFormat('Y-m-d H:i:s', "{$endDateStr} {$endTimeStr}", $tzIdentifier);
        } catch (\Exception $e) {
            // Fallback on invalid format
            $startCarbonLocal = Carbon::createFromDate($defaultTahun, $defaultBulan, 1, $tzIdentifier)->startOfMonth();
            $endCarbonLocal = $startCarbonLocal->copy()->endOfMonth();
        }

        if ($startCarbonLocal->gt($endCarbonLocal)) {
            // Swap if start is greater than end
            $temp = $startCarbonLocal;
            $startCarbonLocal = $endCarbonLocal;
            $endCarbonLocal = $temp;
        }

        $startUtc = $startCarbonLocal->copy()->setTimezone('UTC');
        $endUtc = $endCarbonLocal->copy()->setTimezone('UTC');

        return [
            'start_utc' => $startUtc,
            'end_utc' => $endUtc,
            'timezone' => $timezone,
            'start_date' => $startDateInput,
            'end_date' => $endDateInput,
            'start_time' => $startTimeInput,
            'end_time' => $endTimeInput,
            'has_custom_filter' => $hasCustomFilter,
        ];
    }
}
