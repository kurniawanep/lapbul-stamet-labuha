<?php

namespace App\Http\Controllers;

use App\Models\DataPibal;
use App\Services\Ae31ExportService;
use App\Services\BmkgsoftService;
use App\Services\LapbulPibalExportService;
use App\Services\PibalDashboardService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PibalController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected PibalDashboardService $dashboardService;

    public function __construct(BmkgsoftService $bmkgsoftService, PibalDashboardService $dashboardService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display PIBAL observations list with filtering (observer & reason), sorting, and dashboard stats.
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

        $observerFilter = $request->input('observer');
        $reasonFilter = $request->input('reason');

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // Query distinctly available observers and termination reasons for filter dropdowns
        $availableObservers = DataPibal::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        $availableReasons = DataPibal::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('penghentian_pengamatan')
            ->distinct()
            ->orderBy('penghentian_pengamatan')
            ->pluck('penghentian_pengamatan');

        $query = DataPibal::with(['pegawai', 'teknisi', 'ppnpn'])
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer')) {
            $query->where('observer_name', $observerFilter);
        }

        if ($request->filled('reason')) {
            $query->where('penghentian_pengamatan', $reasonFilter);
        }

        $pibalRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        // Transform records to append monitoring evaluation status
        $pibalRecords->through(function ($item) {
            $rawSlotStr = is_string($item->data_timestamp) ? $item->data_timestamp : $item->data_timestamp->format('Y-m-d H:i:s');
            $slotTime = Carbon::parse($rawSlotStr, 'UTC');
            $sentTs = $item->sent_timestamp ?? $item->received_timestamp ?? $item->data_timestamp;
            $rawSentStr = is_string($sentTs) ? $sentTs : $sentTs->format('Y-m-d H:i:s');
            $sentCarbon = Carbon::parse($rawSentStr, 'UTC');

            $windowStart = $slotTime->copy();
            $windowEnd = $slotTime->copy()->addMinutes(45)->endOfMinute();

            $status = 'tepat_waktu';
            $delayMinutes = 0;

            if ($sentCarbon->between($windowStart, $windowEnd)) {
                $status = 'tepat_waktu';
            } elseif ($sentCarbon->lt($windowStart)) {
                $status = 'lebih_awal';
            } else {
                $status = 'terlambat';
                $deadline = $slotTime->copy()->addMinutes(45);
                $diffSec = max(0, $sentCarbon->getTimestamp() - $deadline->getTimestamp());
                $delayMinutes = max(1, (int) ceil($diffSec / 60.0));
            }

            $item->monitoring_status = $status;
            $item->delay_minutes = $delayMinutes;
            $item->sent_timestamp_display = $sentCarbon->format('Y-m-d H:i:s') . ' UTC';

            return $item;
        });

        $daysInMonth = $startDate->daysInMonth;
        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Pibal', [
            'pibalRecords' => $pibalRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $pibalRecords->total(),
            'sortOrder' => $sortOrder,
            'observerFilter' => $observerFilter ?: 'ALL',
            'reasonFilter' => $reasonFilter ?: 'ALL',
            'availableObservers' => $availableObservers,
            'availableReasons' => $availableReasons,
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of PIBAL data from BMKGSoft API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncPibalData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data dari BMKGSoft: " . $result['message']);
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }

    /**
     * Export populated Ae.31 Excel report populated from BMKGSoft data.
     */
    public function exportAe31(Request $request, Ae31ExportService $exportService): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $spreadsheet = $exportService->generateAe31Spreadsheet($bulan, $tahun);

        $fileName = sprintf('Formulir_Ae31_%02d_%04d.xlsx', $bulan, $tahun);

        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Export full Lapbul PIBAL clean Excel spreadsheet (.xlsx) populated from BMKGSoft data.
     */
    public function exportLapbulPibal(Request $request, LapbulPibalExportService $exportService): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $spreadsheet = $exportService->generateLapbulPibalSpreadsheet($bulan, $tahun);

        $fileName = sprintf('Laporan_Bulanan_PIBAL_%02d_%04d.xlsx', $bulan, $tahun);

        $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, 'Xlsx');

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
