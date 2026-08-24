<?php

namespace App\Http\Controllers;

use App\Models\DataSinoptik;
use App\Services\ThunderstormService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ThunderstormController extends Controller
{
    protected ThunderstormService $thunderstormService;

    public function __construct(ThunderstormService $thunderstormService)
    {
        $this->thunderstormService = $thunderstormService;
    }

    /**
     * Display Thunderstorm Dashboard & Observation Records.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 15);
        $page = (int) $request->input('page', 1);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Retrieve raw observations for selected month
        $allMonthRecords = DataSinoptik::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate])
            ->orderBy('data_timestamp', 'desc')
            ->get();

        // Filter records matching Thunderstorm criteria
        $filteredTsRecords = $allMonthRecords->filter(function ($item) {
            return ThunderstormService::isThunderstorm(
                $item->present_weather_ww,
                $item->past_weather_w1,
                $item->past_weather_w2
            );
        })->map(function ($item) {
            $rawSlotStr = is_string($item->data_timestamp)
                ? $item->data_timestamp
                : $item->data_timestamp->format('Y-m-d H:i:s');
            
            $slotTime = Carbon::parse($rawSlotStr, 'UTC');
            $sentTs = $item->sent_timestamp ?? $item->received_timestamp ?? $item->data_timestamp;
            $rawSentStr = is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s');
            $sentCarbon = Carbon::parse($rawSentStr, 'UTC');

            $item->category_label = ThunderstormService::getThunderstormCategory(
                $item->present_weather_ww,
                $item->past_weather_w1,
                $item->past_weather_w2
            );

            $item->slot_time_utc = $slotTime->format('Y-m-d H:i:s') . ' UTC';
            $item->slot_time_wit = $slotTime->copy()->addHours(9)->format('Y-m-d H:i:s') . ' WIT';
            $item->sent_timestamp_display = $sentCarbon->format('Y-m-d H:i:s') . ' UTC';

            return $item;
        })->values();

        // Manual slice for pagination
        $totalItems = $filteredTsRecords->count();
        $slicedItems = $filteredTsRecords->slice(($page - 1) * $perPage, $perPage)->values();

        $paginatedRecords = new LengthAwarePaginator(
            $slicedItems,
            $totalItems,
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        $yearlyMatrixInfo = $this->thunderstormService->getYearlyMatrix($tahun);
        $dashboardStats = $this->thunderstormService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Thunderstorm', [
            'thunderstormRecords' => $paginatedRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'yearlyMatrixInfo' => $yearlyMatrixInfo,
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Stream download thunderstorm.docx populated with target year frequency data.
     */
    public function exportDocx(Request $request): StreamedResponse
    {
        $tahun = (int) $request->input('tahun', 2026);
        $bulan = (int) $request->input('bulan', 12);
        return $this->thunderstormService->exportDocx($tahun, $bulan);
    }
}
