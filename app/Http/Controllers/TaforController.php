<?php

namespace App\Http\Controllers;

use App\Models\DataTafor;
use App\Services\BmkgsoftService;
use App\Services\TaforDashboardService;
use App\Services\VerifikasiTaforExportService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaforController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected TaforDashboardService $dashboardService;

    public function __construct(BmkgsoftService $bmkgsoftService, TaforDashboardService $dashboardService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display TAFOR observations list with filtering and pagination.
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

        $query = DataTafor::with(['pegawai', 'teknisi', 'ppnpn'])
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer') && $request->input('observer') !== 'ALL') {
            $query->where('observer_name', $request->input('observer'));
        }

        $taforRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $availableObservers = DataTafor::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        $daysInMonth = $startDate->daysInMonth;
        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Tafor', [
            'taforRecords' => $taforRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $taforRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of TAFOR data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncTaforData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data TAFOR dari BMKGSoft: " . $result['message']);
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }

    /**
     * Export TAFOR verification report Excel spreadsheet (.xlsx).
     */
    public function exportVerifikasi(Request $request, VerifikasiTaforExportService $exportService): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $spreadsheet = $exportService->generateVerifikasiTaforSpreadsheet($bulan, $tahun);

        $fileName = sprintf('Verifikasi_TAFOR_%02d_%04d.xlsx', $bulan, $tahun);

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
