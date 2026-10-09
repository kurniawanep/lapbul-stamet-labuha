<?php

namespace App\Http\Controllers;

use App\Models\DataWxrev;
use App\Services\BmkgsoftService;
use App\Services\WxrevDashboardService;
use App\Services\WxrevExportService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WxrevController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected WxrevDashboardService $dashboardService;
    protected WxrevExportService $exportService;

    public function __construct(
        BmkgsoftService $bmkgsoftService,
        WxrevDashboardService $dashboardService,
        WxrevExportService $exportService
    ) {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
        $this->exportService = $exportService;
    }

    /**
     * Display WXREV dashboard and daily observation records.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', now()->month);
        $tahun = (int) $request->input('tahun', now()->year);
        $perPage = (int) $request->input('per_page', 50);
        $sortOrder = strtolower($request->input('sort', 'asc'));
        if (! in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'asc';
        }
        $search = $request->input('search');

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $query = DataWxrev::with(['pegawai', 'teknisi', 'ppnpn'])
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('sandi', 'like', "%{$search}%")
                    ->orWhere('mmyygp', 'like', "%{$search}%")
                    ->orWhere('observer_name', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Wxrev', [
            'wxrevRecords' => $records,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $records->total(),
            'sortOrder' => $sortOrder,
            'search' => $search ?? '',
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of WXREV data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', now()->month);
        $tahun = (int) $request->input('tahun', now()->year);

        $result = $this->bmkgsoftService->syncWxrevData($bulan, $tahun);

        if (! $result['success']) {
            return redirect()->back()->with('error', 'Gagal sinkron data WXREV: ' . ($result['error_reason'] ?? $result['message']));
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }

    /**
     * Export populated WXREV monthly report Excel.
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', now()->month);
        $tahun = (int) $request->input('tahun', now()->year);

        return $this->exportService->exportExcel($bulan, $tahun);
    }
}
