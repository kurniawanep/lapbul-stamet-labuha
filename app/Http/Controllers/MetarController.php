<?php

namespace App\Http\Controllers;

use App\Models\DataMetar;
use App\Services\BmkgsoftService;
use App\Services\MetarDashboardService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetarController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected MetarDashboardService $dashboardService;

    public function __construct(BmkgsoftService $bmkgsoftService, MetarDashboardService $dashboardService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display METAR observations list with filtering and pagination.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 10);
        $sortOrder = strtolower($request->input('sort_order', 'desc'));
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataMetar::with(['pegawai', 'teknisi', 'ppnpn'])
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer') && $request->input('observer') !== 'ALL') {
            $query->where('observer_name', $request->input('observer'));
        }

        $metarRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $metarRecords->through(function ($item) {
            $rawSlotStr = is_string($item->data_timestamp) ? $item->data_timestamp : $item->data_timestamp->format('Y-m-d H:i:s');
            $slotTime = Carbon::parse($rawSlotStr, 'UTC');
            $sentTs = $item->sent_timestamp ?? $item->received_timestamp ?? $item->data_timestamp;
            $rawSentStr = is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s');
            $sentCarbon = Carbon::parse($rawSentStr, 'UTC');

            $windowStart = $slotTime->copy()->subMinutes(2);
            $windowEnd = $slotTime->copy()->addMinutes(2)->endOfMinute();

            $status = 'tepat_waktu';
            $delayMinutes = 0;

            if ($sentCarbon->between($windowStart, $windowEnd)) {
                $status = 'tepat_waktu';
            } elseif ($sentCarbon->lt($windowStart)) {
                $status = 'lebih_awal';
            } else {
                $status = 'terlambat';
                $deadline = $slotTime->copy()->addMinutes(2);
                $diffSec = max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp());
                $delayMinutes = max(1, (int) ceil($diffSec / 60.0));
            }

            $item->monitoring_status = $status;
            $item->delay_minutes = $delayMinutes;
            $item->sent_timestamp_display = $sentCarbon->format('Y-m-d H:i:s') . ' UTC';

            return $item;
        });

        $availableObservers = DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        $daysInMonth = $startDate->daysInMonth;
        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Metar', [
            'metarRecords' => $metarRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $metarRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of METAR data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        @set_time_limit(120);

        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = (string) $request->input('start_date');
            $endDate = (string) $request->input('end_date');
        } else {
            $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
            $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
            $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);
        }

        $result = $this->bmkgsoftService->syncMetarData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data METAR dari BMKGSoft: " . $result['message']);
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }
}
