<?php

namespace App\Services;

use App\Models\DataWxrev;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class WxrevExportService
{
    protected array $namaBulanIndo = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /**
     * Generate populated Spreadsheet object for WXREV Monthly Report.
     */
    public function generateSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/template__lapbul_wxrev.xlsx');
        if (! file_exists($templatePath)) {
            $templatePath = resource_path('templates/excel/template_lapbul_wxrev.xlsx');
        }
        if (! file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel WXREV tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getSheetByName('WXREV') ?? $spreadsheet->getActiveSheet();

        $monthNameUpper = strtoupper($this->namaBulanIndo[$bulan] ?? 'BULAN');

        // 1. Header Title & Month Info
        $sheet->setCellValue('A1', 'KUMPULAN BERITA WXREV');
        $sheet->setCellValue('A2', 'STASIUN METEOROLOGI OESMAN SADIK HALMAHERA SELATAN');
        $sheet->setCellValue('A3', "BULAN  : {$monthNameUpper} {$tahun}");

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // 2. Fetch Records for the target month
        $records = DataWxrev::whereBetween('data_timestamp', [
            $startDate->toDateTimeString(),
            $endDate->toDateTimeString(),
        ])->get();

        $recordsMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $recordsMap[$day] = $r;
        }

        // 3. Populate Rows 8 to 38 (Days 1 to 31)
        for ($day = 1; $day <= 31; $day++) {
            $row = 7 + $day;

            if ($day <= $daysInMonth) {
                $sheet->setCellValue("A{$row}", $day);
                $rec = $recordsMap[$day] ?? null;

                if ($rec) {
                    $sheet->setCellValue("B{$row}", $rec->mmyygp ?? '-');
                    $sheet->setCellValue("C{$row}", $rec->attxtxtntn ?? '-');
                    $sheet->setCellValue("D{$row}", $rec->appxpxpnpn ?? '-');
                    $sheet->setCellValue("E{$row}", $rec->auuxuxunun ?? '-');
                    $sheet->setCellValue("F{$row}", $rec->arrrrr ?? '-');
                    $sheet->setCellValue("G{$row}", $rec->rdrddfmfm1 ?? '-');
                    $sheet->setCellValue("H{$row}", '-');
                    $sheet->setCellValue("I{$row}", $rec->jam_kirim ?? '00,00Z VST');
                } else {
                    $sheet->setCellValue("B{$row}", '-');
                    $sheet->setCellValue("C{$row}", '-');
                    $sheet->setCellValue("D{$row}", '-');
                    $sheet->setCellValue("E{$row}", '-');
                    $sheet->setCellValue("F{$row}", '-');
                    $sheet->setCellValue("G{$row}", '-');
                    $sheet->setCellValue("H{$row}", '-');
                    $sheet->setCellValue("I{$row}", '-');
                }
            } else {
                // Clear non-existent days (e.g. day 31 in shorter months)
                $sheet->setCellValue("A{$row}", null);
                $sheet->setCellValue("B{$row}", null);
                $sheet->setCellValue("C{$row}", null);
                $sheet->setCellValue("D{$row}", null);
                $sheet->setCellValue("E{$row}", null);
                $sheet->setCellValue("F{$row}", null);
                $sheet->setCellValue("G{$row}", null);
                $sheet->setCellValue("H{$row}", null);
                $sheet->setCellValue("I{$row}", null);
            }
        }

        // 4. Signatures & Footer
        $now = Carbon::now();
        $downloadDay = sprintf('%02d', $now->day);
        $downloadMonthName = $this->namaBulanIndo[$now->month] ?? 'Januari';
        $downloadYear = $now->year;
        $tanggalTtd = "Halmahera Selatan, {$downloadDay} {$downloadMonthName} {$downloadYear}";

        $kepalaStasiun = Pegawai::where('role', 'Kepala Stasiun')
            ->orWhere('jabatan', 'like', '%Kepala Stasiun%')
            ->orWhere('role', 'like', '%Kepala%')
            ->first();
        $namaKepala = $kepalaStasiun ? $kepalaStasiun->nama : 'Ben Arther Molle, S.Tr., M.Si';
        $nipKepala = $kepalaStasiun && $kepalaStasiun->nip ? 'NIP. ' . $kepalaStasiun->nip : '';

        $currentUser = Auth::user();
        $pembuatLaporan = $currentUser ? ($currentUser->nama ?? $currentUser->name) : 'Syamsul Marasaoly';
        $nipPembuat = ($currentUser && isset($currentUser->nip) && $currentUser->nip) ? 'NIP. ' . $currentUser->nip : '';

        // Row 41
        $sheet->setCellValue('F41', $tanggalTtd);

        // Row 42
        $sheet->setCellValue('B42', 'Pembuat Laporan,');
        $sheet->setCellValue('F42', 'Kepala,');

        // Row 46
        $sheet->setCellValue('B46', $pembuatLaporan);
        $sheet->setCellValue('F46', $namaKepala);

        // Row 47 (NIP if present)
        if ($nipPembuat) {
            $sheet->setCellValue('B47', $nipPembuat);
        }
        if ($nipKepala) {
            $sheet->setCellValue('F47', $nipKepala);
        }

        $spreadsheet->setActiveSheetIndexByName('WXREV');

        return $spreadsheet;
    }

    /**
     * Download Excel file as streamed response.
     */
    public function exportExcel(int $bulan, int $tahun): StreamedResponse
    {
        $spreadsheet = $this->generateSpreadsheet($bulan, $tahun);
        $monthName = $this->namaBulanIndo[$bulan] ?? 'BULAN';
        $filename = "Lapbul_WXREV_{$monthName}_{$tahun}.xlsx";

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
