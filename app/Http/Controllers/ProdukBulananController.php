<?php

namespace App\Http\Controllers;

use App\Models\DataFlightDocument;
use App\Models\DataMetar;
use App\Models\DataMetReport;
use App\Models\DataTafor;
use App\Services\ProdukBulananExportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProdukBulananController extends Controller
{
    protected ProdukBulananExportService $exportService;

    public function __construct(ProdukBulananExportService $exportService)
    {
        $this->exportService = $exportService;
    }

    /**
     * Display Produk Pelayanan Bulanan dashboard and observation tables.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', Carbon::now()->month);
        $tahun = (int) $request->input('tahun', Carbon::now()->year);

        $namaBulanIndo = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $namaHariIndo = [
            0 => 'Minggu', 1 => 'Senin', 2 => 'Selasa', 3 => 'Rabu',
            4 => 'Kamis', 5 => 'Jumat', 6 => 'Sabtu'
        ];

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // 1. Fetch Month Data
        $fdRecords = DataFlightDocument::whereBetween('departure_at', [$startDate, $endDate])->get();
        $taforRecords = DataTafor::whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $metarRecords = DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $metReportRecords = DataMetReport::whereBetween('data_timestamp', [$startDate, $endDate])->get();

        $dailyFd = array_fill(1, 31, 0);
        foreach ($fdRecords as $r) {
            if ($r->departure_at) {
                $d = Carbon::parse($r->departure_at)->day;
                if ($d >= 1 && $d <= 31) $dailyFd[$d]++;
            }
        }

        $dailyTafor = array_fill(1, 31, 0);
        foreach ($taforRecords as $r) {
            if ($r->data_timestamp) {
                $d = Carbon::parse($r->data_timestamp)->day;
                if ($d >= 1 && $d <= 31) $dailyTafor[$d]++;
            }
        }

        $dailyMetar = array_fill(1, 31, 0);
        $dailySpeci = array_fill(1, 31, 0);
        foreach ($metarRecords as $r) {
            if ($r->data_timestamp) {
                $d = Carbon::parse($r->data_timestamp)->day;
                if ($d >= 1 && $d <= 31) {
                    $type = strtolower((string)$r->type_message);
                    if ($type === 'speci') {
                        $dailySpeci[$d]++;
                    } else {
                        $dailyMetar[$d]++;
                    }
                }
            }
        }

        $dailyMetReport = array_fill(1, 31, 0);
        foreach ($metReportRecords as $r) {
            if ($r->data_timestamp) {
                $d = Carbon::parse($r->data_timestamp)->day;
                if ($d >= 1 && $d <= 31) $dailyMetReport[$d]++;
            }
        }

        $harianData = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dtDay = Carbon::createFromDate($tahun, $bulan, $d);
            $harianData[] = [
                'day' => $d,
                'day_name' => $namaHariIndo[$dtDay->dayOfWeek],
                'ff_ln' => 0,
                'ff_dn' => $dailyFd[$d],
                'taf' => $dailyTafor[$d],
                'rofor' => 0,
                'arfor' => 0,
                'sigmet' => 0,
                'aerodrome_warning' => 0,
                'publik' => 0,
                'metar' => $dailyMetar[$d],
                'speci' => $dailySpeci[$d],
                'met_report' => $dailyMetReport[$d],
                'special' => 0,
                'keterangan' => '-',
            ];
        }

        // 2. Fetch Yearly Data (Jan - Dec)
        $yearStart = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
        $yearEnd = Carbon::createFromDate($tahun, 12, 31)->endOfYear();

        $yearFd = DataFlightDocument::whereBetween('departure_at', [$yearStart, $yearEnd])->get();
        $yearTafor = DataTafor::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();
        $yearMetar = DataMetar::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();
        $yearMetReport = DataMetReport::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();

        $monthlyFd = array_fill(1, 12, 0);
        foreach ($yearFd as $r) {
            if ($r->departure_at) {
                $m = Carbon::parse($r->departure_at)->month;
                $monthlyFd[$m]++;
            }
        }

        $monthlyTafor = array_fill(1, 12, 0);
        foreach ($yearTafor as $r) {
            if ($r->data_timestamp) {
                $m = Carbon::parse($r->data_timestamp)->month;
                $monthlyTafor[$m]++;
            }
        }

        $monthlyMetar = array_fill(1, 12, 0);
        $monthlySpeci = array_fill(1, 12, 0);
        foreach ($yearMetar as $r) {
            if ($r->data_timestamp) {
                $m = Carbon::parse($r->data_timestamp)->month;
                $type = strtolower((string)$r->type_message);
                if ($type === 'speci') {
                    $monthlySpeci[$m]++;
                } else {
                    $monthlyMetar[$m]++;
                }
            }
        }

        $monthlyMetReport = array_fill(1, 12, 0);
        foreach ($yearMetReport as $r) {
            if ($r->data_timestamp) {
                $m = Carbon::parse($r->data_timestamp)->month;
                $monthlyMetReport[$m]++;
            }
        }

        $bulananData = [];
        for ($m = 1; $m <= 12; $m++) {
            $bulananData[] = [
                'month' => $m,
                'month_name' => $namaBulanIndo[$m],
                'ff_ln' => 0,
                'ff_dn' => $monthlyFd[$m],
                'taf' => $monthlyTafor[$m],
                'rofor' => 0,
                'arfor' => 0,
                'sigmet' => 0,
                'aerodrome_warning' => 0,
                'publik' => 0,
                'metar' => $monthlyMetar[$m],
                'speci' => $monthlySpeci[$m],
                'met_report' => $monthlyMetReport[$m],
                'special' => 0,
                'frekuensi_penerbangan' => $monthlyFd[$m],
            ];
        }

        $stats = [
            'total_ff_dn' => array_sum($dailyFd),
            'total_taf' => array_sum($dailyTafor),
            'total_metar' => array_sum($dailyMetar),
            'total_speci' => array_sum($dailySpeci),
            'total_met_report' => array_sum($dailyMetReport),
            'total_frekuensi' => array_sum($dailyFd),
        ];

        return Inertia::render('Laporan/ProdukBulanan', [
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'harianData' => $harianData,
            'bulananData' => $bulananData,
            'stats' => $stats,
        ]);
    }

    /**
     * Download Excel report populated from template_laporan_produk_bulanan.xlsx.
     */
    public function exportExcel(Request $request): StreamedResponse
    {
        $bulan = (int) $request->input('bulan', Carbon::now()->month);
        $tahun = (int) $request->input('tahun', Carbon::now()->year);

        return $this->exportService->exportExcel($bulan, $tahun);
    }
}
