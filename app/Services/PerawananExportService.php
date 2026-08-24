<?php

namespace App\Services;

use App\Models\DataPerawanan;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class PerawananExportService
{
    protected array $namaBulan = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
    ];

    /**
     * Generate populated Perawanan Spreadsheet object for a given month and year.
     */
    public function generatePerawananSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_lapbul_perawanan.xlsx');
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel Perawanan tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $monthName = $this->namaBulan[$bulan] ?? 'Juli';

        // 1. Set Month & Year Headers
        $sheet->setCellValue('B5', ': ' . $monthName);
        $sheet->setCellValue('B6', ': ' . $tahun);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // 2. Set Footer Date (Use current date when exported)
        $now = Carbon::now();
        $todayDay = $now->day;
        $todayMonthName = $this->namaBulan[$now->month] ?? 'Agustus';
        $todayYear = $now->year;
        $sheet->setCellValue('E45', "Labuha, {$todayDay} {$todayMonthName} {$todayYear}");

        // 3. Fetch Records
        $records = DataPerawanan::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        $perawananMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $day = Carbon::parse($rawStr, 'UTC')->day;
            $perawananMap[$day] = $r;
        }

        // 4. Populate Daily Rows 13 to 43 (Days 1 to 31)
        for ($day = 1; $day <= 31; $day++) {
            $row = 12 + $day;

            if ($day <= $daysInMonth) {
                $rec = $perawananMap[$day] ?? null;
                $sheet->setCellValue("A{$row}", $day);

                if ($rec) {
                    $sheet->setCellValue("B{$row}", $rec->clear);
                    $sheet->setCellValue("C{$row}", $rec->partly_cloudy);
                    $sheet->setCellValue("D{$row}", $rec->cloudy);
                    $sheet->setCellValue("E{$row}", $rec->totally_cloudy);
                    $sheet->setCellValue("F{$row}", $rec->total_observation);
                    $sheet->setCellValue("G{$row}", $this->getDominantCondition($rec));
                } else {
                    $sheet->setCellValue("B{$row}", null);
                    $sheet->setCellValue("C{$row}", null);
                    $sheet->setCellValue("D{$row}", null);
                    $sheet->setCellValue("E{$row}", null);
                    $sheet->setCellValue("F{$row}", null);
                    $sheet->setCellValue("G{$row}", null);
                }
            } else {
                $sheet->setCellValue("A{$row}", null);
                $sheet->setCellValue("B{$row}", null);
                $sheet->setCellValue("C{$row}", null);
                $sheet->setCellValue("D{$row}", null);
                $sheet->setCellValue("E{$row}", null);
                $sheet->setCellValue("F{$row}", null);
                $sheet->setCellValue("G{$row}", null);
            }
        }

        // 5. Summary Row Formulas
        $sheet->setCellValue('B44', '=SUM(B13:B43)');
        $sheet->setCellValue('C44', '=SUM(C13:C43)');
        $sheet->setCellValue('D44', '=SUM(D13:D43)');
        $sheet->setCellValue('E44', '=SUM(E13:E43)');
        $sheet->setCellValue('F44', '=SUM(F13:F43)');

        // Clear stray numbers in template outside data area
        $sheet->setCellValue('H43', null);
        $sheet->setCellValue('H44', null);

        return $spreadsheet;
    }

    /**
     * Determine the dominant cloudiness condition for 1 day (most frequent category).
     * Tie-breaker order: Cerah > Berawan Sebagian > Berawan > Berawan Banyak.
     */
    protected function getDominantCondition(?DataPerawanan $rec): ?string
    {
        if (!$rec) {
            return null;
        }

        $priorityOrder = [
            'Cerah' => (int) $rec->clear,
            'Berawan Sebagian' => (int) $rec->partly_cloudy,
            'Berawan' => (int) $rec->cloudy,
            'Berawan Banyak' => (int) $rec->totally_cloudy,
        ];

        $maxVal = max($priorityOrder);
        if ($maxVal <= 0) {
            return null;
        }

        foreach ($priorityOrder as $category => $hours) {
            if ($hours === $maxVal) {
                return $category;
            }
        }

        return null;
    }
}
