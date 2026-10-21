<?php

namespace App\Http\Controllers;

use App\Models\DataFlight;
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

        $startDate = Carbon::createFromDate($tahun, $bulan, 1, 'UTC')->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // 1. Fetch Month Data
        $fdRecords = DataFlightDocument::whereBetween('departure_at', [$startDate, $endDate])->get();
        $flightRecords = DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])->get();
        $taforRecords = DataTafor::whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $metarRecords = DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])->get();
        $metReportRecords = DataMetReport::whereBetween('data_timestamp', [$startDate, $endDate])->get();

        $dailyFd = array_fill(1, 31, 0);
        foreach ($fdRecords as $r) {
            if ($r->departure_at) {
                $d = Carbon::parse($r->departure_at, 'UTC')->day;
                if ($d >= 1 && $d <= 31) $dailyFd[$d]++;
            }
        }

        $dailyFlightCount = array_fill(1, 31, 0);
        foreach ($flightRecords as $r) {
            if ($r->tanggal) {
                $dep = strtoupper(trim((string)$r->dep));
                if ($dep === 'LAH' || $dep === 'WAEL') {
                    $d = Carbon::parse($r->tanggal, 'UTC')->day;
                    if ($d >= 1 && $d <= 31) $dailyFlightCount[$d]++;
                }
            }
        }

        $dailyTafor = array_fill(1, 31, 0);
        foreach ($taforRecords as $r) {
            if ($r->data_timestamp) {
                $d = Carbon::parse($r->data_timestamp, 'UTC')->day;
                if ($d >= 1 && $d <= 31) $dailyTafor[$d]++;
            }
        }

        $dailyMetar = array_fill(1, 31, 0);
        $dailySpeci = array_fill(1, 31, 0);
        foreach ($metarRecords as $r) {
            if ($r->data_timestamp) {
                $dt = Carbon::parse($r->data_timestamp, 'UTC');
                $d = $dt->day;
                if ($d >= 1 && $d <= 31) {
                    $type = strtolower((string)$r->type_message);
                    if ($type === 'speci') {
                        $dailySpeci[$d]++;
                    } else {
                        // Only count METAR at minute 00 (ignore minute 30)
                        if ((int) $dt->minute === 0) {
                            $dailyMetar[$d]++;
                        }
                    }
                }
            }
        }

        $dailyMetReport = array_fill(1, 31, 0);
        foreach ($metReportRecords as $r) {
            if ($r->data_timestamp) {
                $d = Carbon::parse($r->data_timestamp, 'UTC')->day;
                if ($d >= 1 && $d <= 31) $dailyMetReport[$d]++;
            }
        }

        $harianData = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dtDay = Carbon::createFromDate($tahun, $bulan, $d, 'UTC');
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
                'frekuensi' => $dailyFlightCount[$d] > 0 ? $dailyFlightCount[$d] : $dailyFd[$d],
                'keterangan' => '-',
            ];
        }

        // 2. Fetch Yearly Data (Jan - Dec)
        $yearStart = Carbon::createFromDate($tahun, 1, 1, 'UTC')->startOfYear();
        $yearEnd = Carbon::createFromDate($tahun, 12, 31, 'UTC')->endOfYear();

        $yearFd = DataFlightDocument::whereBetween('departure_at', [$yearStart, $yearEnd])->get();
        $yearFlightRecords = DataFlight::whereBetween('tanggal', [$yearStart->format('Y-m-d'), $yearEnd->format('Y-m-d')])->get();
        $yearTafor = DataTafor::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();
        $yearMetar = DataMetar::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();
        $yearMetReport = DataMetReport::whereBetween('data_timestamp', [$yearStart, $yearEnd])->get();

        $monthlyFd = array_fill(1, 12, 0);
        foreach ($yearFd as $r) {
            if ($r->departure_at) {
                $m = Carbon::parse($r->departure_at, 'UTC')->month;
                $monthlyFd[$m]++;
            }
        }

        $monthlyFlightCount = array_fill(1, 12, 0);
        foreach ($yearFlightRecords as $r) {
            if ($r->tanggal) {
                $dep = strtoupper(trim((string)$r->dep));
                if ($dep === 'LAH' || $dep === 'WAEL') {
                    $m = Carbon::parse($r->tanggal, 'UTC')->month;
                    $monthlyFlightCount[$m]++;
                }
            }
        }

        $monthlyTafor = array_fill(1, 12, 0);
        foreach ($yearTafor as $r) {
            if ($r->data_timestamp) {
                $m = Carbon::parse($r->data_timestamp, 'UTC')->month;
                $monthlyTafor[$m]++;
            }
        }

        $monthlyMetar = array_fill(1, 12, 0);
        $monthlySpeci = array_fill(1, 12, 0);
        foreach ($yearMetar as $r) {
            if ($r->data_timestamp) {
                $dt = Carbon::parse($r->data_timestamp, 'UTC');
                $m = $dt->month;
                $type = strtolower((string)$r->type_message);
                if ($type === 'speci') {
                    $monthlySpeci[$m]++;
                } else {
                    // Only count METAR at minute 00 (ignore minute 30)
                    if ((int) $dt->minute === 0) {
                        $monthlyMetar[$m]++;
                    }
                }
            }
        }

        $monthlyMetReport = array_fill(1, 12, 0);
        foreach ($yearMetReport as $r) {
            if ($r->data_timestamp) {
                $m = Carbon::parse($r->data_timestamp, 'UTC')->month;
                $monthlyMetReport[$m]++;
            }
        }

        $baseline2026 = [
            1 => ['ff_dn' => 33, 'taf' => 115, 'metar' => 736, 'speci' => 0, 'met_report' => 173, 'frekuensi' => 33],
            2 => ['ff_dn' => 34, 'taf' => 106, 'metar' => 661, 'speci' => 0, 'met_report' => 159, 'frekuensi' => 43],
            3 => ['ff_dn' => 32, 'taf' => 122, 'metar' => 744, 'speci' => 0, 'met_report' => 157, 'frekuensi' => 44],
            4 => ['ff_dn' => 45, 'taf' => 119, 'metar' => 720, 'speci' => 0, 'met_report' => 166, 'frekuensi' => 52],
            5 => ['ff_dn' => 41, 'taf' => 117, 'metar' => 741, 'speci' => 0, 'met_report' => 162, 'frekuensi' => 45],
            6 => ['ff_dn' => 34, 'taf' => 120, 'metar' => 719, 'speci' => 0, 'met_report' => 168, 'frekuensi' => 42],
            7 => ['ff_dn' => 40, 'taf' => 124, 'metar' => 744, 'speci' => 0, 'met_report' => 185, 'frekuensi' => 47],
            8 => ['ff_dn' => 36, 'taf' => 124, 'metar' => 744, 'speci' => 0, 'met_report' => 132, 'frekuensi' => 47],
        ];

        $bulananData = [];
        for ($m = 1; $m <= 12; $m++) {
            // Only fill data until selected month; future months are left null
            if ($m > $bulan) {
                $bulananData[] = [
                    'month' => $m,
                    'month_name' => $namaBulanIndo[$m],
                    'ff_ln' => 0,
                    'ff_dn' => null,
                    'taf' => null,
                    'rofor' => 0,
                    'arfor' => 0,
                    'sigmet' => 0,
                    'aerodrome_warning' => 0,
                    'publik' => 0,
                    'metar' => null,
                    'speci' => null,
                    'met_report' => null,
                    'special' => 0,
                    'frekuensi_penerbangan' => null,
                ];
                continue;
            }

            $ffDn = $monthlyFd[$m];
            $taf = $monthlyTafor[$m];
            $metar = $monthlyMetar[$m];
            $speci = $monthlySpeci[$m];
            $metReport = $monthlyMetReport[$m];
            $freq = $monthlyFlightCount[$m] > 0 ? $monthlyFlightCount[$m] : $monthlyFd[$m];

            // Special case for Jan - Aug 2026: leave it following the template baseline
            if ($tahun === 2026 && $m <= 8 && isset($baseline2026[$m])) {
                $ffDn = $baseline2026[$m]['ff_dn'];
                $taf = $baseline2026[$m]['taf'];
                $metar = $baseline2026[$m]['metar'];
                $speci = $baseline2026[$m]['speci'];
                $metReport = $baseline2026[$m]['met_report'];
                $freq = $baseline2026[$m]['frekuensi'];
            }

            $bulananData[] = [
                'month' => $m,
                'month_name' => $namaBulanIndo[$m],
                'ff_ln' => 0,
                'ff_dn' => $ffDn,
                'taf' => $taf,
                'rofor' => 0,
                'arfor' => 0,
                'sigmet' => 0,
                'aerodrome_warning' => 0,
                'publik' => 0,
                'metar' => $metar,
                'speci' => $speci,
                'met_report' => $metReport,
                'special' => 0,
                'frekuensi_penerbangan' => $freq,
            ];
        }

        $totalFreqCurrentMonth = array_sum($dailyFlightCount) > 0 ? array_sum($dailyFlightCount) : array_sum($dailyFd);

        $stats = [
            'total_ff_dn' => array_sum($dailyFd),
            'total_taf' => array_sum($dailyTafor),
            'total_metar' => array_sum($dailyMetar),
            'total_speci' => array_sum($dailySpeci),
            'total_met_report' => array_sum($dailyMetReport),
            'total_frekuensi' => $totalFreqCurrentMonth,
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
