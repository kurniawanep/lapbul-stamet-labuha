<?php

namespace App\Http\Controllers;

use App\Models\DataPerawanan;
use App\Services\BmkgsoftService;
use App\Services\PerawananDashboardService;
use App\Services\PerawananExportService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PerawananController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;

    protected PerawananDashboardService $dashboardService;

    protected PerawananExportService $exportService;

    public function __construct(
        BmkgsoftService $bmkgsoftService,
        PerawananDashboardService $dashboardService,
        PerawananExportService $exportService
    ) {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
        $this->exportService = $exportService;
    }

    /**
     * Display Perawanan dashboard and daily observation records.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 50);
        $sortOrder = $request->input('sort', 'asc');

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataPerawanan::whereBetween('data_timestamp', [$startDate, $endDate]);

        $records = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $daysInMonth = $startDate->daysInMonth;
        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Perawanan', [
            'perawananRecords' => $records,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $records->total(),
            'sortOrder' => $sortOrder,
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of Perawanan data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncPerawananData($startDate, $endDate);

        if (! $result['success']) {
            return redirect()->back()->with('error', 'Gagal sinkron data Perawanan: '.($result['error_reason'] ?? $result['message']));
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }

    /**
     * Export Perawanan monthly report to Excel template.
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $spreadsheet = $this->exportService->generatePerawananSpreadsheet($bulan, $tahun);

        $filename = sprintf('Laporan_Bulanan_Perawanan_%04d_%02d.xlsx', $tahun, $bulan);

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
