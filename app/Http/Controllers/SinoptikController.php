<?php

namespace App\Http\Controllers;

use App\Models\DataSinoptik;
use App\Services\BmkgsoftService;
use App\Services\SinoptikDashboardService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SinoptikController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected SinoptikDashboardService $dashboardService;

    public function __construct(BmkgsoftService $bmkgsoftService, SinoptikDashboardService $dashboardService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display Sinoptik observations list with filtering, pagination, and dashboard stats.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 10);
        $sortOrder = strtolower($request->input('sort_order', 'desc'));
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataSinoptik::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer')) {
            $query->where('observer_name', $request->input('observer'));
        }

        $sinoptikRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        // Transform records to append monitoring evaluation status
        $sinoptikRecords->through(function ($item) {
            $rawSlotStr = is_string($item->data_timestamp) ? $item->data_timestamp : $item->data_timestamp->format('Y-m-d H:i:s');
            $slotTime = Carbon::parse($rawSlotStr, 'UTC');
            $sentTs = $item->sent_timestamp ?? $item->received_timestamp ?? $item->data_timestamp;
            $rawSentStr = is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s');
            $sentCarbon = Carbon::parse($rawSentStr, 'UTC');

            $windowStart = $slotTime->copy()->subMinutes(10);
            $windowEnd = $slotTime->copy()->addMinutes(15)->endOfMinute();

            $status = 'tepat_waktu';
            $delayMinutes = 0;

            if ($sentCarbon->between($windowStart, $windowEnd)) {
                $status = 'tepat_waktu';
            } elseif ($sentCarbon->lt($windowStart)) {
                $status = 'lebih_awal';
            } else {
                $status = 'terlambat';
                $deadline = $slotTime->copy()->addMinutes(15);
                $diffSec = max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp());
                $delayMinutes = max(1, (int) ceil($diffSec / 60.0));
            }

            $item->monitoring_status = $status;
            $item->delay_minutes = $delayMinutes;
            $item->sent_timestamp_display = $sentCarbon->format('Y-m-d H:i:s') . ' UTC';

            return $item;
        });

        $availableObservers = DataSinoptik::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Sinoptik', [
            'sinoptikRecords' => $sinoptikRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'totalRecords' => $sinoptikRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of Sinoptik data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncSinoptikData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data Sinoptik dari BMKGSoft: " . $result['message']);
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }
}
