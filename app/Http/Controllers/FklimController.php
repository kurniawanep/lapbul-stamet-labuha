<?php

namespace App\Http\Controllers;

use App\Models\DataFklim;
use App\Models\DataSinoptik;
use App\Services\BmkgsoftService;
use App\Services\FklimDashboardService;
use App\Services\FklimExportService;
use App\Services\ThunderstormService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FklimController extends Controller
{
    protected BmkgsoftService $bmkgsoftService;
    protected FklimDashboardService $dashboardService;

    public function __construct(BmkgsoftService $bmkgsoftService, FklimDashboardService $dashboardService)
    {
        $this->bmkgsoftService = $bmkgsoftService;
        $this->dashboardService = $dashboardService;
    }

    /**
     * Display FKLIM observations list with filtering, pagination, and dashboard statistics.
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

        $query = DataFklim::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer') && $request->input('observer') !== 'ALL') {
            $query->where('observer_name', $request->input('observer'));
        }

        $fklimRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        // Fetch Sinoptik TS/RETS map
        $sinoptikRecords = DataSinoptik::whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $sinoptikTsMap = [];
        foreach ($sinoptikRecords as $s) {
            $rawTs = is_string($s->data_timestamp) ? $s->data_timestamp : $s->data_timestamp->format('Y-m-d H:i:s');
            $dtSin = Carbon::parse($rawTs, 'UTC');
            $ww = (int) $s->present_weather_ww;
            $w1 = (int) $s->past_weather_w1;
            $w2 = (int) $s->past_weather_w2;

            if (ThunderstormService::isThunderstorm($ww, $w1, $w2)) {
                $type = ($ww === 17 || ($ww >= 95 && $ww <= 96) || ($ww >= 98 && $ww <= 99)) ? 'TS' : 'RETS';
                if (!isset($sinoptikTsMap[$dtSin->day]) || $type === 'TS') {
                    $sinoptikTsMap[$dtSin->day] = $type;
                }
            }
        }

        $fklimRecords->getCollection()->transform(function ($item) use ($sinoptikTsMap) {
            $rawStr = is_string($item->data_timestamp) ? $item->data_timestamp : $item->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $tsCode = $sinoptikTsMap[$day] ?? null;

            $cuKhususTrim = trim((string) $item->cu_khusus);
            if (!empty($tsCode) && !preg_match('/\b(TS|RETS)\b/i', $cuKhususTrim)) {
                if ($cuKhususTrim === '' || $cuKhususTrim === '-') {
                    $item->cu_khusus = $tsCode;
                } else {
                    $item->cu_khusus = "{$cuKhususTrim} + {$tsCode}";
                }
            }
            return $item;
        });

        $availableObservers = DataFklim::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        $daysInMonth = $startDate->daysInMonth;
        $dashboardStats = $this->dashboardService->getDashboardStats($bulan, $tahun);

        return Inertia::render('Laporan/Fklim', [
            'fklimRecords' => $fklimRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'totalRecords' => $fklimRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
            'dashboardStats' => $dashboardStats,
        ]);
    }

    /**
     * Trigger manual sync of FKLIM data from BMKGSatu API.
     */
    public function sync(Request $request): RedirectResponse
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $startDate = sprintf('%04d-%02d-01T00:00:00Z', $tahun, $bulan);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $endDate = sprintf('%04d-%02d-%02dT23:59:59Z', $tahun, $bulan, $daysInMonth);

        $result = $this->bmkgsoftService->syncFklimData($startDate, $endDate);

        if (!$result['success']) {
            return redirect()->back()->with('error', "Gagal sinkron data FKLIM dari BMKGSoft: " . ($result['error_reason'] ?? $result['message']));
        }

        return redirect()->back()
            ->with('sync_result', $result)
            ->with('success', $result['message']);
    }

    /**
     * Export FKLIM monthly report as Excel file (.xlsx) based on template_lapbul_fklim.xlsx.
     */
    public function exportExcel(Request $request, FklimExportService $exportService)
    {
        $bulan = (int) $request->input('bulan', 7);
        $tahun = (int) $request->input('tahun', 2026);

        $spreadsheet = $exportService->generateFklimSpreadsheet($bulan, $tahun);

        $namaBulan = [
            1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
            5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
            9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
        ];
        $bulanStr = $namaBulan[$bulan] ?? 'BULAN';

        $filename = "Laporan_Bulanan_FKLIM_{$bulanStr}_{$tahun}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
