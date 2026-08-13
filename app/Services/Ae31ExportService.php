<?php

namespace App\Services;

use App\Models\DataPibal;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class Ae31ExportService
{
    protected array $namaBulan = [
        1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
        5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
        9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
    ];

    /**
     * Generate populated Ae. 31 Spreadsheet object for given month and year.
     */
    public function generateAe31Spreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_laporan_ae31.xlsx');
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel Ae.31 tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        // 1. Set Month & Year Header (Cell I10)
        $sheet->setCellValue('I10', ': ' . ($this->namaBulan[$bulan] ?? '') . ' ' . $tahun);

        // 2. Fetch PIBAL Data for the month
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $records = DataPibal::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        // Group records by day and UTC hour (0 or 12)
        $mappedData = [];
        foreach ($records as $r) {
            $dt = Carbon::parse($r->data_timestamp, 'UTC');
            $day = $dt->day;
            $hour = $dt->hour;

            $maxAltitude = null;
            if (!empty($r->hasil_lapisan_wd_ws_dddff)) {
                $laps = array_map(fn($item) => (int) $item['lapisan'], $r->hasil_lapisan_wd_ws_dddff);
                $validLaps = array_filter($laps, fn($l) => $l > 0);
                if (!empty($validLaps)) {
                    $maxAltitude = max($validLaps);
                }
            }

            $reason = $r->penghentian_pengamatan ?: '-';

            // If max altitude exists, display max altitude. Otherwise display observation cancellation reason.
            $altitudeDisplay = ($maxAltitude !== null) ? (string) $maxAltitude : $reason;

            $mappedData[$day][$hour] = [
                'altitude' => $altitudeDisplay,
                'reason' => $reason,
            ];
        }

        // 3. Populate daily rows (Day 1 = Row 16, Day 31 = Row 46)
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $rowNum = 15 + $day;

            // Pibal 00.00z -> Col G (Ketinggian), Col H (Alasan)
            if (isset($mappedData[$day][0])) {
                $sheet->setCellValue("G{$rowNum}", $mappedData[$day][0]['altitude']);
                $sheet->setCellValue("H{$rowNum}", $mappedData[$day][0]['reason']);
            } else {
                $sheet->setCellValue("G{$rowNum}", '-');
                $sheet->setCellValue("H{$rowNum}", '-');
            }

            // Pibal 12.00z -> Col K (Ketinggian), Col L (Alasan)
            if (isset($mappedData[$day][12])) {
                $sheet->setCellValue("K{$rowNum}", $mappedData[$day][12]['altitude']);
                $sheet->setCellValue("L{$rowNum}", $mappedData[$day][12]['reason']);
            } else {
                $sheet->setCellValue("K{$rowNum}", '-');
                $sheet->setCellValue("L{$rowNum}", '-');
            }
        }

        return $spreadsheet;
    }
}
