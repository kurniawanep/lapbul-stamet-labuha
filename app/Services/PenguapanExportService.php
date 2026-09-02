<?php

namespace App\Services;

use App\Models\DataPenguapan;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class PenguapanExportService
{
    protected array $namaBulan = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
    ];

    /**
     * Generate populated Penguapan Spreadsheet object for a given month and year.
     */
    public function generatePenguapanSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_lapbul_penguapan.xlsx');
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel Penguapan tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $monthName = strtoupper($this->namaBulan[$bulan] ?? 'JULI');

        // 1. Set Month & Year Headers
        $sheet->setCellValue('G2', ': ' . $tahun);
        $sheet->setCellValue('G3', ': ' . $monthName);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // 2. Fetch Records
        $records = DataPenguapan::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        $penguapanMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $penguapanMap[$day] = $r;
        }

        $formatCellVal = function ($val) {
            if ($val === null) return null;
            $f = (float) $val;
            if ($f == 8888 || $f == 9999) return 0;
            return $val;
        };

        // 3. Populate Half 1: Days 1 to 15 (Rows 12 to 26)
        for ($day = 1; $day <= 15; $day++) {
            $row = 11 + $day;
            $rec = $penguapanMap[$day] ?? null;

            $sheet->setCellValue("A{$row}", $day);
            $sheet->setCellValue("K{$row}", $day);

            if ($rec) {
                $sheet->setCellValue("B{$row}", $formatCellVal($rec->op_diff_baca));
                $sheet->setCellValue("C{$row}", $formatCellVal($rec->rr_0700));
                $sheet->setCellValue("D{$row}", $formatCellVal($rec->op_eva));
                $sheet->setCellValue("E{$row}", '07.00');

                $sheet->setCellValue("L{$row}", $formatCellVal($rec->ws_avg_0c5));
                $sheet->setCellValue("M{$row}", $rec->t_air_avg !== null ? $formatCellVal($rec->t_air_avg) : '-');
            } else {
                $sheet->setCellValue("B{$row}", null);
                $sheet->setCellValue("C{$row}", null);
                $sheet->setCellValue("D{$row}", null);
                $sheet->setCellValue("E{$row}", '07.00');

                $sheet->setCellValue("L{$row}", null);
                $sheet->setCellValue("M{$row}", '-');
            }
        }

        // 4. Populate Half 2: Days 16 to 31 (Rows 12 to 27)
        for ($day = 16; $day <= 31; $day++) {
            $row = 12 + ($day - 16);

            if ($day <= $daysInMonth) {
                $rec = $penguapanMap[$day] ?? null;

                $sheet->setCellValue("F{$row}", $day);
                $sheet->setCellValue("N{$row}", $day);

                if ($rec) {
                    $sheet->setCellValue("G{$row}", $formatCellVal($rec->op_diff_baca));
                    $sheet->setCellValue("H{$row}", $formatCellVal($rec->rr_0700));
                    $sheet->setCellValue("I{$row}", $formatCellVal($rec->op_eva));
                    $sheet->setCellValue("J{$row}", '07.00');

                    $sheet->setCellValue("O{$row}", $formatCellVal($rec->ws_avg_0c5));
                    $sheet->setCellValue("P{$row}", $rec->t_air_avg !== null ? $formatCellVal($rec->t_air_avg) : '-');
                } else {
                    $sheet->setCellValue("G{$row}", null);
                    $sheet->setCellValue("H{$row}", null);
                    $sheet->setCellValue("I{$row}", null);
                    $sheet->setCellValue("J{$row}", '07.00');

                    $sheet->setCellValue("O{$row}", null);
                    $sheet->setCellValue("P{$row}", '-');
                }
            } else {
                // Clear cells for non-existent days (e.g. day 31 in shorter months)
                $sheet->setCellValue("F{$row}", null);
                $sheet->setCellValue("G{$row}", null);
                $sheet->setCellValue("H{$row}", null);
                $sheet->setCellValue("I{$row}", null);
                $sheet->setCellValue("J{$row}", null);

                $sheet->setCellValue("N{$row}", null);
                $sheet->setCellValue("O{$row}", null);
                $sheet->setCellValue("P{$row}", null);
            }
        }

        // 5. Summary Row & Total Formulas
        $sheet->setCellValue('B29', '=SUM(B12:B26)');
        $sheet->setCellValue('C29', '=SUM(C12:C26)');
        $sheet->setCellValue('D29', '=B29+C29');
        $sheet->setCellValue('G29', '=SUM(G12:G27)');
        $sheet->setCellValue('H29', '=SUM(H12:H27)');
        $sheet->setCellValue('I29', '=G29+H29');

        $sheet->setCellValue('C32', '=C29+H29');
        $sheet->setCellValue('C33', '=D29+I29');
        $sheet->setCellValue('D34', '=COUNTIF(C12:C26,">0")+COUNTIF(H12:H27,">0")');

        return $spreadsheet;
    }
}
