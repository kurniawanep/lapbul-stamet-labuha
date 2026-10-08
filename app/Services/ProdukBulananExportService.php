<?php

namespace App\Services;

use App\Models\DataFlight;
use App\Models\DataFlightDocument;
use App\Models\DataFklim;
use App\Models\DataMetar;
use App\Models\DataMetReport;
use App\Models\DataSinoptik;
use App\Models\DataTafor;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProdukBulananExportService
{
    protected array $namaBulanIndo = [
        1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
        5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
        9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
    ];

    protected array $namaHariIndo = [
        0 => 'MINGGU', 1 => 'SENIN', 2 => 'SELASA', 3 => 'RABU',
        4 => 'KAMIS', 5 => 'JUMAT', 6 => 'SABTU'
    ];

    /**
     * Generate populated Spreadsheet for Laporan Produk Bulanan.
     */
    public function generateSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_laporan_produk_bulanan.xlsx');
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel Produk Bulanan tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);

        $monthNameUpper = $this->namaBulanIndo[$bulan] ?? 'JANUARI';
        $monthNameCapitalized = ucfirst(strtolower($monthNameUpper));
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // Current download date for signature
        $now = Carbon::now();
        $downloadDay = $now->day;
        $downloadMonthName = $this->namaBulanIndo[$now->month] ?? 'JANUARI';
        $downloadMonthCapitalized = ucfirst(strtolower($downloadMonthName));
        $downloadYear = $now->year;
        $tanggalDownload = "Halmahera Selatan, {$downloadDay} {$downloadMonthCapitalized} {$downloadYear}";

        // Fetch Staff Signatures
        $kepalaStasiun = Pegawai::where('role', 'Kepala Stasiun')
            ->orWhere('jabatan', 'like', '%Kepala Stasiun%')
            ->orWhere('role', 'like', '%Kepala%')
            ->first();
        $namaKepala = $kepalaStasiun ? $kepalaStasiun->nama : 'BEN ARTHER MOLLE, S. Tr., M. Si';

        $currentUser = Auth::user();
        $pembuatLaporan = $currentUser ? ($currentUser->nama ?? $currentUser->name) : 'Observer Stamet Labuha';

        // =========================================================================
        // 1. SHEET: Produk Data A (Harian)
        // =========================================================================
        $sheetA = $spreadsheet->getSheetByName('Produk Data A');
        if ($sheetA) {
            // Clean up any residual broken formula from template
            if ($sheetA->getCell('V9')->getValue() === '=#REF!') {
                $sheetA->setCellValue('V9', null);
            }

            // Header
            $sheetA->setCellValue('A4', "BULAN  :  {$monthNameUpper} {$tahun}");

            // Query Daily Data for Target Month
            $fdRecords = DataFlightDocument::whereBetween('departure_at', [$startDate, $endDate])->get();
            $flightRecords = DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])->get();
            $taforRecords = DataTafor::whereBetween('data_timestamp', [$startDate, $endDate])->get();
            $metarRecords = DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])->get();
            $metReportRecords = DataMetReport::whereBetween('data_timestamp', [$startDate, $endDate])->get();

            // Group by day
            $dailyFd = array_fill(1, 31, 0);
            foreach ($fdRecords as $r) {
                if ($r->departure_at) {
                    $d = Carbon::parse($r->departure_at)->day;
                    if ($d >= 1 && $d <= 31) $dailyFd[$d]++;
                }
            }

            $dailyFlightTO = array_fill(1, 31, 0);
            $dailyFlightLD = array_fill(1, 31, 0);

            foreach ($flightRecords as $r) {
                if ($r->tanggal) {
                    $dep = strtoupper(trim((string)$r->dep));
                    $arr = strtoupper(trim((string)$r->arr));
                    $d = (int) Carbon::parse($r->tanggal)->day;
                    if ($d >= 1 && $d <= 31) {
                        if ($dep === 'LAH' || $dep === 'WAEL') {
                            $dailyFlightTO[$d]++;
                        }
                        if ($arr === 'LAH' || $arr === 'WAEL') {
                            $dailyFlightLD[$d]++;
                        }
                    }
                }
            }

            $dailyFlightCount = $dailyFlightTO;

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
                    $dt = Carbon::parse($r->data_timestamp);
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
                    $d = Carbon::parse($r->data_timestamp)->day;
                    if ($d >= 1 && $d <= 31) $dailyMetReport[$d]++;
                }
            }

            // Populate rows 8 to 38 (Day 1 = Row 8, Day 31 = Row 38)
            for ($d = 1; $d <= 31; $d++) {
                $row = 7 + $d;
                if ($d <= $daysInMonth) {
                    $sheetA->setCellValue("A{$row}", $d);
                    $sheetA->setCellValue("B{$row}", '-'); // FF LN
                    $sheetA->setCellValue("C{$row}", $dailyFd[$d] > 0 ? $dailyFd[$d] : 0); // FF DN
                    $sheetA->setCellValue("D{$row}", $dailyTafor[$d] > 0 ? $dailyTafor[$d] : 0); // TAF
                    $sheetA->setCellValue("E{$row}", '-'); // ROFOR
                    $sheetA->setCellValue("F{$row}", '-'); // ARFOR
                    $sheetA->setCellValue("G{$row}", '-'); // SIGMET/VAR
                    $sheetA->setCellValue("H{$row}", '-'); // AERODROME WARNING
                    $sheetA->setCellValue("I{$row}", '-'); // PUBLIK
                    $sheetA->setCellValue("J{$row}", $dailyMetar[$d] > 0 ? $dailyMetar[$d] : 0); // METAR
                    $sheetA->setCellValue("K{$row}", $dailySpeci[$d] > 0 ? $dailySpeci[$d] : '-'); // SPECI
                    $sheetA->setCellValue("L{$row}", $dailyMetReport[$d] > 0 ? $dailyMetReport[$d] : 0); // MET REPORT
                    $sheetA->setCellValue("M{$row}", '-'); // SPECIAL
                    $sheetA->setCellValue("N{$row}", '-'); // KETERANGAN
                } else {
                    // Clear cells for non-existing days in the month
                    $sheetA->setCellValue("A{$row}", null);
                    $cols = ['B','C','D','E','F','G','H','I','J','K','L','M','N'];
                    foreach ($cols as $col) {
                        $sheetA->setCellValue("{$col}{$row}", null);
                    }
                }
            }

            // Formulas for Row 39 (JUMLAH)
            $lastRow = 7 + $daysInMonth;
            $sheetA->setCellValue('C39', "=SUM(C8:C{$lastRow})");
            $sheetA->setCellValue('D39', "=SUM(D8:D{$lastRow})");
            $sheetA->setCellValue('J39', "=SUM(J8:J{$lastRow})");
            $sheetA->setCellValue('L39', "=SUM(L8:L{$lastRow})");

            // Signatures
            $sheetA->setCellValue('K42', $tanggalDownload);
            $sheetA->setCellValue('E43', 'Pembuat Laporan,');
            $sheetA->setCellValue('K43', 'Kepala,');
            $sheetA->setCellValue('E47', $pembuatLaporan);
            $sheetA->setCellValue('K47', $namaKepala);
        }

        // =========================================================================
        // 2. SHEET: Produk Data B (Bulanan)
        // =========================================================================
        $sheetB = $spreadsheet->getSheetByName('Produk Data B');
        if ($sheetB) {
            $sheetB->setCellValue('A5', "TAHUN : {$tahun}");

            // Clean up any residual broken external link formulas in row 9 from template
            if (str_contains((string)$sheetB->getCell('D9')->getValue(), '[')) {
                $sheetB->setCellValue('D9', 115);
            }
            if (str_contains((string)$sheetB->getCell('J9')->getValue(), '[')) {
                $sheetB->setCellValue('J9', 736);
            }
            if (str_contains((string)$sheetB->getCell('N9')->getValue(), '[')) {
                $sheetB->setCellValue('N9', 41);
            }

            $yearStart = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
            $yearEnd = Carbon::createFromDate($tahun, 12, 31)->endOfYear();

            $yearFd = DataFlightDocument::whereBetween('departure_at', [$yearStart, $yearEnd])->get();
            $yearFlight = DataFlight::whereBetween('tanggal', [$yearStart->format('Y-m-d'), $yearEnd->format('Y-m-d')])->get();
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

            $monthlyFlightCount = array_fill(1, 12, 0);
            foreach ($yearFlight as $r) {
                if ($r->tanggal) {
                    $dep = strtoupper(trim((string)$r->dep));
                    if ($dep === 'LAH' || $dep === 'WAEL') {
                        $m = Carbon::parse($r->tanggal)->month;
                        $monthlyFlightCount[$m]++;
                    }
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
                    $dt = Carbon::parse($r->data_timestamp);
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
                    $m = Carbon::parse($r->data_timestamp)->month;
                    $monthlyMetReport[$m]++;
                }
            }

            // Populate rows 9 to 20 (Januari = Row 9, Desember = Row 20)
            for ($m = 1; $m <= 12; $m++) {
                $row = 8 + $m;

                // If month is after selected month ($m > $bulan), do not fill data
                if ($m > $bulan) {
                    $sheetB->setCellValue("C{$row}", null);
                    $sheetB->setCellValue("D{$row}", null);
                    $sheetB->setCellValue("J{$row}", null);
                    $sheetB->setCellValue("K{$row}", '-');
                    $sheetB->setCellValue("L{$row}", null);
                    $sheetB->setCellValue("N{$row}", null);
                    continue;
                }

                // Special case for Jan - Aug 2026: leave it, don't change anything from the template
                if ($tahun === 2026 && $m <= 8) {
                    continue;
                }

                $sheetB->setCellValue("A{$row}", $this->namaBulanIndo[$m]);
                $sheetB->setCellValue("B{$row}", '-');

                $ffDn = $monthlyFd[$m] > 0 ? $monthlyFd[$m] : 0;
                $taf = $monthlyTafor[$m] > 0 ? $monthlyTafor[$m] : 0;
                $metar = $monthlyMetar[$m] > 0 ? $monthlyMetar[$m] : 0;
                $speci = $monthlySpeci[$m] > 0 ? $monthlySpeci[$m] : '-';
                $metReport = $monthlyMetReport[$m] > 0 ? $monthlyMetReport[$m] : 0;
                $freq = $monthlyFlightCount[$m] > 0 ? $monthlyFlightCount[$m] : ($monthlyFd[$m] > 0 ? $monthlyFd[$m] : 0);

                $sheetB->setCellValue("C{$row}", $ffDn);
                $sheetB->setCellValue("D{$row}", $taf);
                $sheetB->setCellValue("J{$row}", $metar);
                $sheetB->setCellValue("K{$row}", $speci);
                $sheetB->setCellValue("L{$row}", $metReport);
                $sheetB->setCellValue("N{$row}", $freq);

                $sheetB->setCellValue("E{$row}", '-');
                $sheetB->setCellValue("F{$row}", '-');
                $sheetB->setCellValue("G{$row}", '-');
                $sheetB->setCellValue("H{$row}", '-');
                $sheetB->setCellValue("I{$row}", '-');
                $sheetB->setCellValue("M{$row}", '-');
            }

            // JUMLAH row 21
            $sheetB->setCellValue('C21', '=SUM(C9:C20)');
            $sheetB->setCellValue('D21', '=SUM(D9:D20)');
            $sheetB->setCellValue('J21', '=SUM(J9:J20)');
            $sheetB->setCellValue('L21', '=SUM(L9:L20)');
            $sheetB->setCellValue('N21', '=SUM(N9:N20)');

            // Signatures
            $sheetB->setCellValue('K24', $tanggalDownload);
            $sheetB->setCellValue('E25', 'Pembuat Laporan,');
            $sheetB->setCellValue('K25', 'Kepala,');
            $sheetB->setCellValue('E30', $pembuatLaporan);
            $sheetB->setCellValue('K30', $namaKepala);
        }

        // =========================================================================
        // 3. SHEET: Freq Penerbangan
        // =========================================================================
        $sheetFreq = $spreadsheet->getSheetByName('Freq Penerbangan');
        if ($sheetFreq) {
            $sheetFreq->setCellValue('A3', "BULAN  :  {$monthNameUpper} {$tahun}");

            $isJanAgs2026 = ($tahun === 2026 && $bulan <= 8);

            if (!$isJanAgs2026) {
                $colMap = [1 => 'C', 2 => 'D', 3 => 'E', 4 => 'F', 5 => 'G', 6 => 'H', 7 => 'I'];
                $weekRowMap = [1 => 8, 2 => 14, 3 => 20, 4 => 26, 5 => 32, 6 => 38];

                $grid = [];
                for ($w = 1; $w <= 6; $w++) {
                    for ($colIdx = 1; $colIdx <= 7; $colIdx++) {
                        $grid[$w][$colIdx] = null;
                    }
                }

                $rightList = [];
                for ($slot = 1; $slot <= 42; $slot++) {
                    $rightList[$slot] = ['tgl' => null, 'flt' => null];
                }

                $startIsoWeekday = $startDate->isoWeekday(); // 1 (Mon) to 7 (Sun)
                $currentWeek = 1;
                $currentWeekday = $startIsoWeekday;

                $dailyFreqData = (isset($dailyFlightCount) && array_sum($dailyFlightCount) > 0)
                    ? $dailyFlightCount
                    : ($dailyFd ?? array_fill(1, 31, 0));

                for ($d = 1; $d <= $daysInMonth; $d++) {
                    $fltCount = $dailyFreqData[$d] > 0 ? $dailyFreqData[$d] : 0;
                    $grid[$currentWeek][$currentWeekday] = $fltCount;

                    $slotIndex = (($currentWeek - 1) * 7) + $currentWeekday;
                    $rightList[$slotIndex] = ['tgl' => $d, 'flt' => $fltCount];

                    if ($currentWeekday === 7) {
                        $currentWeekday = 1;
                        $currentWeek++;
                    } else {
                        $currentWeekday++;
                    }
                }

                // 1. Populate Weekly Schedule Grid (Left Side: Rows 8, 14, 20, 26, 32, 38)
                foreach ($weekRowMap as $w => $row) {
                    for ($colIdx = 1; $colIdx <= 7; $colIdx++) {
                        $colLetter = $colMap[$colIdx];
                        $val = $grid[$w][$colIdx];
                        $sheetFreq->setCellValue("{$colLetter}{$row}", $val !== null ? $val : '-');
                    }
                    $sheetFreq->setCellValue("J{$row}", "=SUM(C{$row}:I{$row})");
                }

                // 2. Populate Daily List (Middle Side: Rows 7 to 48, Columns N & O)
                for ($slot = 1; $slot <= 42; $slot++) {
                    $row = 6 + $slot;
                    $item = $rightList[$slot];
                    $sheetFreq->setCellValue("N{$row}", $item['tgl']);
                    $sheetFreq->setCellValue("O{$row}", $item['flt']);
                }

                // 3. Populate Daily TO / LD / OF Table (Right Side: Rows 7 to 37, Columns U - Y)
                for ($d = 1; $d <= 31; $d++) {
                    $row = 6 + $d;
                    if ($d <= $daysInMonth) {
                        $sheetFreq->setCellValue("U{$row}", $d);
                        $sheetFreq->setCellValue("V{$row}", $d);
                        $sheetFreq->setCellValue("W{$row}", $dailyFlightTO[$d]);
                        $sheetFreq->setCellValue("X{$row}", $dailyFlightLD[$d]);
                        $sheetFreq->setCellValue("Y{$row}", null);
                    } else {
                        // Clear dates beyond this month (e.g. day 31 for Sept, day 29-31 for Feb)
                        $sheetFreq->setCellValue("U{$row}", null);
                        $sheetFreq->setCellValue("V{$row}", null);
                        $sheetFreq->setCellValue("W{$row}", null);
                        $sheetFreq->setCellValue("X{$row}", null);
                        $sheetFreq->setCellValue("Y{$row}", null);
                    }
                }

                // Total Formulas
                $sheetFreq->setCellValue('O49', '=J8+J14+J20+J26+J32+J38');
                $sheetFreq->setCellValue('O50', '=SUM(O7:O48)');
            }

            // Signatures
            $sheetFreq->setCellValue('F41', $tanggalDownload);
            $sheetFreq->setCellValue('B42', 'Pembuat Laporan,');
            $sheetFreq->setCellValue('F42', 'Kepala,');
            $sheetFreq->setCellValue('B47', $pembuatLaporan);
            $sheetFreq->setCellValue('F47', $namaKepala);
        }

        // =========================================================================
        // 4. SHEET: WXREV
        // =========================================================================
        $sheetWx = $spreadsheet->getSheetByName('WXREV');
        if ($sheetWx) {
            $sheetWx->setCellValue('A3', "BULAN  :  {$monthNameUpper} {$tahun}");

            // Signatures
            $sheetWx->setCellValue('F42', $tanggalDownload);
            $sheetWx->setCellValue('B43', 'Pembuat Laporan,');
            $sheetWx->setCellValue('F43', 'Kepala,');
            $sheetWx->setCellValue('B47', $pembuatLaporan);
            $sheetWx->setCellValue('F47', $namaKepala);
        }

        return $spreadsheet;
    }

    /**
     * Download Excel file as streamed response.
     */
    public function exportExcel(int $bulan, int $tahun): StreamedResponse
    {
        $spreadsheet = $this->generateSpreadsheet($bulan, $tahun);
        $monthName = $this->namaBulanIndo[$bulan] ?? 'BULAN';
        $filename = "Laporan_Produk_Bulanan_{$monthName}_{$tahun}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
