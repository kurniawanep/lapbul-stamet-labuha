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
         $bulan = (int) $request->input('bulan', Carbon::now()->month);
         $tahun = (int) $request->input('tahun', Carbon::now()->year);
         $perPage = (int) $request->input('per_page', 15);
         $page = (int) $request->input('page', 1);

         $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
         $endDate = $startDate->copy()->endOfMonth();

         // Query only thunderstorm records for selected month with pagination
         $paginatedRecords = DataSinoptik::with('pegawai')
             ->whereBetween('data_timestamp', [$startDate, $endDate])
             ->where(function ($q) {
                 $q->whereIn('present_weather_ww', ['17', '29', '91', '92', '93', '94', '95', '96', '98', '99', 17, 29, 91, 92, 93, 94, 95, 96, 98, 99])
                   ->orWhereIn('past_weather_w1', ['9', 9])
                   ->orWhereIn('past_weather_w2', ['9', 9]);
             })
             ->orderBy('data_timestamp', 'desc')
             ->paginate($perPage, ['*'], 'page', $page)
             ->withQueryString();

         $paginatedRecords->getCollection()->transform(function ($item) {
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
         });

         $yearlyMatrixInfo = $this->thunderstormService->getYearlyMatrix($tahun);
         $dashboardStats = $this->thunderstormService->getDashboardStats($bulan, $tahun, $yearlyMatrixInfo);

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
