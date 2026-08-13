<?php

namespace App\Http\Controllers;

use App\Models\DataMetar;
use App\Services\BmkgsoftService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetarController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;

    public function __construct(BmkgsoftService $bmkgsoftService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
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

        $query = DataMetar::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer')) {
            $query->where('observer_name', $request->input('observer'));
        }

        $metarRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $availableObservers = DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        return Inertia::render('Laporan/Metar', [
            'metarRecords' => $metarRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'totalRecords' => $metarRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
        ]);
    }

    /**
     * Trigger manual sync of METAR data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncMetarData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data METAR dari BMKGSoft: " . $result['message']);
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }
}
