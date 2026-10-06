<?php

namespace App\Services;

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

        // Fetch Staff Signatures
        $kepalaStasiun = Pegawai::where('jabatan', 'like', '%Kepala Stasiun%')
            ->orWhere('role', 'Kepala Stasiun')
            ->first();
        $namaKepala = $kepalaStasiun ? $kepalaStasiun->nama_lengkap : 'Ben Arther Molle, S.Tr., M.Si';

        $currentUser = Auth::user();
        $pembuatLaporan = $currentUser ? ($currentUser->nama_lengkap ?? $currentUser->name) : 'Observer Stamet Labuha';

        // =========================================================================
        // 1. SHEET: Produk Data A (Harian)
        // =========================================================================
        $sheetA = $spreadsheet->getSheetByName('Produk Data A');
        if ($sheetA) {
            // Header
            $sheetA->setCellValue('A4', "BULAN  :  {$monthNameUpper} {$tahun}");

            // Query Daily Data for Target Month
            $fdRecords = DataFlightDocument::whereBetween('departure_at', [$startDate, $endDate])->get();
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
            $sheetA->setCellValue('K42', "Halmahera Selatan, {$daysInMonth} {$monthNameCapitalized} {$tahun}");
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

            // Populate rows 9 to 20 (Januari = Row 9, Desember = Row 20)
            for ($m = 1; $m <= 12; $m++) {
                $row = 8 + $m;
                $sheetB->setCellValue("A{$row}", $this->namaBulanIndo[$m]);
                $sheetB->setCellValue("B{$row}", '-');
                $sheetB->setCellValue("C{$row}", $monthlyFd[$m] > 0 ? $monthlyFd[$m] : 0);
                $sheetB->setCellValue("D{$row}", $monthlyTafor[$m] > 0 ? $monthlyTafor[$m] : 0);
                $sheetB->setCellValue("E{$row}", '-');
                $sheetB->setCellValue("F{$row}", '-');
                $sheetB->setCellValue("G{$row}", '-');
                $sheetB->setCellValue("H{$row}", '-');
                $sheetB->setCellValue("I{$row}", '-');
                $sheetB->setCellValue("J{$row}", $monthlyMetar[$m] > 0 ? $monthlyMetar[$m] : 0);
                $sheetB->setCellValue("K{$row}", $monthlySpeci[$m] > 0 ? $monthlySpeci[$m] : '-');
                $sheetB->setCellValue("L{$row}", $monthlyMetReport[$m] > 0 ? $monthlyMetReport[$m] : 0);
                $sheetB->setCellValue("M{$row}", '-');
                $sheetB->setCellValue("N{$row}", $monthlyFd[$m] > 0 ? $monthlyFd[$m] : 0); // Frekuensi Penerbangan
            }

            // JUMLAH row 21
            $sheetB->setCellValue('C21', '=SUM(C9:C20)');
            $sheetB->setCellValue('D21', '=SUM(D9:D20)');
            $sheetB->setCellValue('J21', '=SUM(J9:J20)');
            $sheetB->setCellValue('L21', '=SUM(L9:L20)');
            $sheetB->setCellValue('N21', '=SUM(N9:N20)');

            // Signatures
            $sheetB->setCellValue('K24', "Halmahera Selatan, {$daysInMonth} {$monthNameCapitalized} {$tahun}");
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

            // Populate daily flights in column N & O (Day 1 = N12 / O12, Day 31 = N42 / O42)
            $dailyFdFreq = array_fill(1, 31, 0);
            if (isset($dailyFd)) {
                $dailyFdFreq = $dailyFd;
            }

            for ($d = 1; $d <= 31; $d++) {
                $row = 11 + $d;
                $sheetFreq->setCellValue("N{$row}", $d <= $daysInMonth ? $d : null);
                $sheetFreq->setCellValue("O{$row}", $d <= $daysInMonth ? ($dailyFdFreq[$d] > 0 ? $dailyFdFreq[$d] : 0) : null);
                
                if ($d <= $daysInMonth) {
                    $dtDay = Carbon::createFromDate($tahun, $bulan, $d);
                    $dayOfWeek = $dtDay->dayOfWeek; // 0 = Sunday, 1 = Monday
                    $sheetFreq->setCellValue("P{$row}", $this->namaHariIndo[$dayOfWeek]);
                } else {
                    $sheetFreq->setCellValue("P{$row}", null);
                }
            }

            // Total formula
            $sheetFreq->setCellValue('O50', "=SUM(O12:O" . (11 + $daysInMonth) . ")");

            // Signatures
            $sheetFreq->setCellValue('F41', "Halmahera Selatan, {$daysInMonth} {$monthNameCapitalized} {$tahun}");
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
            $sheetWx->setCellValue('F42', "Halmahera Selatan, {$daysInMonth} {$monthNameCapitalized} {$tahun}");
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
