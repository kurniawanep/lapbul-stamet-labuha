<?php

namespace App\Services;

use App\Models\DataPibal;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class LapbulPibalExportService
{
    protected array $namaBulanIndo = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
    ];

    // Table 1 (Upper Wind 1: Row 7 + Day) - Levels up to 15,000 ft
    protected array $levelColsMe39Table1 = [
        1000 => ['ddd' => 'K', 'ff' => 'M'],
        2000 => ['ddd' => 'O', 'ff' => 'Q'],
        3000 => ['ddd' => 'S', 'ff' => 'U'],
        5000 => ['ddd' => 'W', 'ff' => 'Y'],
        7000 => ['ddd' => 'AA', 'ff' => 'AC'],
        10000 => ['ddd' => 'AE', 'ff' => 'AG'],
        12000 => ['ddd' => 'AI', 'ff' => 'AK'],
        15000 => ['ddd' => 'AM', 'ff' => 'AO'],
    ];

    // Table 2 (Upper Wind 2: Row 65 + Day) - Levels beyond 15,000 ft
    protected array $levelColsMe39Table2 = [
        18000 => ['ddd' => 'K', 'ff' => 'M'],
        20000 => ['ddd' => 'O', 'ff' => 'Q'],
        25000 => ['ddd' => 'S', 'ff' => 'U'],
        30000 => ['ddd' => 'W', 'ff' => 'Y'],
        35000 => ['ddd' => 'AA', 'ff' => 'AC'],
        40000 => ['ddd' => 'AE', 'ff' => 'AG'],
        45000 => ['ddd' => 'AI', 'ff' => 'AK'],
        50000 => ['ddd' => 'AM', 'ff' => 'AO'],
    ];

    // Table 1 (Upper Air Steadiness 1: Row 5 + Day) - Levels up to 10,000 ft
    protected array $levelColsAe39Table1 = [
        'surface' => ['ddd' => 'B', 'ff' => 'C'],
        1000 => ['ddd' => 'F', 'ff' => 'G'],
        3000 => ['ddd' => 'J', 'ff' => 'K'],
        5000 => ['ddd' => 'N', 'ff' => 'O'],
        7000 => ['ddd' => 'R', 'ff' => 'S'],
        10000 => ['ddd' => 'V', 'ff' => 'W'],
    ];

    // Table 2 (Upper Air Steadiness 2: Row 45 + Day) - Levels beyond 10,000 ft (starting 15,000 ft)
    protected array $levelColsAe39Table2 = [
        15000 => ['ddd' => 'B', 'ff' => 'C'],
        20000 => ['ddd' => 'F', 'ff' => 'G'],
        25000 => ['ddd' => 'J', 'ff' => 'K'],
        30000 => ['ddd' => 'N', 'ff' => 'O'],
        35000 => ['ddd' => 'R', 'ff' => 'S'],
        40000 => ['ddd' => 'V', 'ff' => 'W'],
    ];

    /**
     * Generate populated Lapbul PIBAL (.xlsx) Spreadsheet object for given month and year.
     */
    public function generateLapbulPibalSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_lapbul_pibal.xlsx');
        if (!file_exists($templatePath)) {
            // Fallback if .xlsx template doesn't exist but .xlsm exists
            $templatePath = resource_path('templates/excel/template_lapbul_pibal.xlsm');
        }
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel Lapbul PIBAL tidak ditemukan di {$templatePath}");
        }

        $reader = IOFactory::createReaderForFile($templatePath);
        $spreadsheet = $reader->load($templatePath);

        // Strip macro flags to generate a clean, repair-free .xlsx file
        $spreadsheet->setHasMacros(false);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $records = DataPibal::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        // Map records by day (1..31) and hour (0 or 12)
        $mappedData = [];
        foreach ($records as $r) {
            $dt = Carbon::parse($r->data_timestamp, 'UTC');
            $day = $dt->day;
            $hour = $dt->hour;

            $mappedData[$day][$hour] = $r;
        }

        $bulanUpper = strtoupper($this->namaBulanIndo[$bulan]);
        $exportDateStr = 'Labuha, ' . Carbon::now()->day . ' ' . $this->namaBulanIndo[Carbon::now()->month] . ' ' . Carbon::now()->year;

        // ----------------------------------------------------
        // 1. POPULATE SHEET "Rekap"
        // ----------------------------------------------------
        $rekapSheet = $spreadsheet->getSheetByName('Rekap');
        if ($rekapSheet) {
            // Completely clean old rows and merged cells from template below row 2
            $highestRow = $rekapSheet->getHighestRow();
            if ($highestRow >= 3) {
                foreach ($rekapSheet->getMergeCells() as $merged) {
                    $parts = explode(':', $merged);
                    preg_match('/\d+/', $parts[0], $m);
                    if (isset($m[0]) && (int)$m[0] >= 3) {
                        $rekapSheet->unmergeCells($merged);
                    }
                }
                $rekapSheet->removeRow(3, $highestRow - 2);
            }

            $currentRow = 3;
            $finalRowOfMonth = 3;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $dayWritten = false;
                $lastRowOfDay = null;
                $dayPad = sprintf('%02d', $day);

                foreach ([0, 12] as $hourIndex => $hour) {
                    $hourStr = sprintf('%02d', $hour);

                    // Add 1 blank row gap before 12.00 Z if 00.00 Z was written for this day
                    if ($hourIndex > 0 && $dayWritten) {
                        $currentRow++;
                    }

                    $record = $mappedData[$day][$hour] ?? null;
                    $sandiText = trim($record->sandi_pibal ?? '');
                    $reason = $record->penghentian_pengamatan ?? null;

                    // Check if sandi is missing or NIL
                    $isNil = empty($sandiText) 
                        || strcasecmp($sandiText, 'NIL') === 0 
                        || strcasecmp($sandiText, 'NIL=') === 0 
                        || str_contains(strtoupper($sandiText), 'NIL');

                    if (!$isNil && $sandiText) {
                        $lines = explode("\n", $sandiText);
                        $firstLineOfHour = true;
                        foreach ($lines as $line) {
                            $line = trim($line);
                            if (empty($line)) continue;

                            $parts = preg_split('/\s+/', $line);

                            // Write date (Day, Month, Year) only on the very first row of the day
                            if (!$dayWritten) {
                                $rekapSheet->setCellValue("A{$currentRow}", $day);
                                $rekapSheet->setCellValue("B{$currentRow}", $this->namaBulanIndo[$bulan]);
                                $rekapSheet->setCellValue("C{$currentRow}", $tahun);
                                $dayWritten = true;
                            }

                            // Write hour (00 or 12) only on the first line of the hour block
                            if ($firstLineOfHour) {
                                $rekapSheet->setCellValue("D{$currentRow}", $hourStr);
                                $firstLineOfHour = false;
                            }

                            if (count($parts) >= 1) $rekapSheet->setCellValue("E{$currentRow}", $parts[0]);
                            if (count($parts) >= 2) $rekapSheet->setCellValue("F{$currentRow}", $parts[1]);
                            if (count($parts) >= 3) $rekapSheet->setCellValue("G{$currentRow}", $parts[2]);

                            for ($p = 3; $p < count($parts); $p++) {
                                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(5 + $p);
                                $rekapSheet->setCellValue("{$colLetter}{$currentRow}", $parts[$p]);
                            }

                            $lastRowOfDay = $currentRow;
                            $currentRow++;
                        }
                    } else {
                        // NIL or missing sandi -> Format as NO REP DUE TO [reason] with Center Alignment
                        $reasonStr = "NO REP DUE TO " . ($reason ?: 'UNSPECIFIED');

                        if (!$dayWritten) {
                            $rekapSheet->setCellValue("A{$currentRow}", $day);
                            $rekapSheet->setCellValue("B{$currentRow}", $this->namaBulanIndo[$bulan]);
                            $rekapSheet->setCellValue("C{$currentRow}", $tahun);
                            $dayWritten = true;
                        }

                        $rekapSheet->setCellValue("D{$currentRow}", $hourStr);
                        $rekapSheet->setCellValue("E{$currentRow}", "PPAA");
                        $rekapSheet->setCellValue("F{$currentRow}", "5{$dayPad}{$hourStr}1");
                        $rekapSheet->setCellValue("G{$currentRow}", "97460");

                        $rekapSheet->mergeCells("H{$currentRow}:J{$currentRow}");
                        $rekapSheet->setCellValue("H{$currentRow}", $reasonStr);

                        $currentRow++;

                        $rekapSheet->setCellValue("E{$currentRow}", "PPBB");
                        $rekapSheet->setCellValue("F{$currentRow}", "5{$dayPad}{$hourStr}1");
                        $rekapSheet->setCellValue("G{$currentRow}", "97460");

                        $rekapSheet->mergeCells("H{$currentRow}:J{$currentRow}");
                        $rekapSheet->setCellValue("H{$currentRow}", $reasonStr);

                        $lastRowOfDay = $currentRow;
                        $currentRow++;
                    }
                }

                // Apply solid black bottom border to columns A-J on the last row of each date
                if ($lastRowOfDay !== null) {
                    $rekapSheet->getStyle("A{$lastRowOfDay}:J{$lastRowOfDay}")
                        ->getBorders()
                        ->getBottom()
                        ->setBorderStyle(Border::BORDER_THIN)
                        ->getColor()
                        ->setARGB('FF000000');

                    $finalRowOfMonth = max($finalRowOfMonth, $lastRowOfDay);
                }
            }

            // ----------------------------------------------------
            // APPLY GLOBAL STYLING & TTD TO SHEET "Rekap"
            // ----------------------------------------------------
            if ($finalRowOfMonth >= 3) {
                // 1. Font Courier New 10 for all data cells A3:J{$finalRowOfMonth}
                $rekapSheet->getStyle("A3:J{$finalRowOfMonth}")
                    ->getFont()
                    ->setName('Courier New')
                    ->setSize(10);

                // 2. Alignment: Center for Tanggal & Jam (A, B, C, D)
                $rekapSheet->getStyle("A3:D{$finalRowOfMonth}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);

                // 3. Alignment: Left for Sandi Pilot Balon (E to J)
                $rekapSheet->getStyle("E3:J{$finalRowOfMonth}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                    ->setVertical(Alignment::VERTICAL_CENTER);

                // Re-apply Center Alignment specifically for merged NO REP cells in H-J
                for ($r = 3; $r <= $finalRowOfMonth; $r++) {
                    $val = (string) $rekapSheet->getCell("H{$r}")->getValue();
                    if (str_contains($val, 'NO REP DUE TO')) {
                        $rekapSheet->getStyle("H{$r}:J{$r}")
                            ->getAlignment()
                            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                            ->setVertical(Alignment::VERTICAL_CENTER);
                    }
                }

                // 4. Vertical Borders (Solid thin black lines down to $finalRowOfMonth)
                $rekapSheet->getStyle("A3:A{$finalRowOfMonth}")
                    ->getBorders()
                    ->getLeft()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->getColor()
                    ->setARGB('FF000000');

                $rekapSheet->getStyle("C3:C{$finalRowOfMonth}")
                    ->getBorders()
                    ->getRight()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->getColor()
                    ->setARGB('FF000000');

                $rekapSheet->getStyle("D3:D{$finalRowOfMonth}")
                    ->getBorders()
                    ->getRight()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->getColor()
                    ->setARGB('FF000000');

                $rekapSheet->getStyle("J3:J{$finalRowOfMonth}")
                    ->getBorders()
                    ->getRight()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->getColor()
                    ->setARGB('FF000000');

                // 5. Add Signature Block (TTD) at bottom of Sheet "Rekap"
                $ttdStart = $finalRowOfMonth + 3;

                // Export Date (Labuha, dd mmmm yyyy)
                $rekapSheet->mergeCells("H{$ttdStart}:J{$ttdStart}");
                $rekapSheet->setCellValue("H{$ttdStart}", $exportDateStr);
                $rekapSheet->getStyle("H{$ttdStart}:J{$ttdStart}")
                    ->getFont()
                    ->setName('Times New Roman')
                    ->setSize(12);
                $rekapSheet->getStyle("H{$ttdStart}:J{$ttdStart}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Titles
                $ttdTitleRow = $ttdStart + 1;
                $rekapSheet->mergeCells("B{$ttdTitleRow}:D{$ttdTitleRow}");
                $rekapSheet->setCellValue("B{$ttdTitleRow}", "Pembuat Laporan");
                $rekapSheet->getStyle("B{$ttdTitleRow}:D{$ttdTitleRow}")
                    ->getFont()
                    ->setName('Times New Roman')
                    ->setSize(12)
                    ->setBold(true);
                $rekapSheet->getStyle("B{$ttdTitleRow}:D{$ttdTitleRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $rekapSheet->mergeCells("H{$ttdTitleRow}:J{$ttdTitleRow}");
                $rekapSheet->setCellValue("H{$ttdTitleRow}", "Kepala");
                $rekapSheet->getStyle("H{$ttdTitleRow}:J{$ttdTitleRow}")
                    ->getFont()
                    ->setName('Times New Roman')
                    ->setSize(12)
                    ->setBold(true);
                $rekapSheet->getStyle("H{$ttdTitleRow}:J{$ttdTitleRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Names
                $ttdNameRow = $ttdStart + 6;
                $rekapSheet->mergeCells("B{$ttdNameRow}:D{$ttdNameRow}");
                $rekapSheet->setCellValue("B{$ttdNameRow}", "Mirza Chrisandy Pesulima, S.Tr");
                $rekapSheet->getStyle("B{$ttdNameRow}:D{$ttdNameRow}")
                    ->getFont()
                    ->setName('Times New Roman')
                    ->setSize(12);
                $rekapSheet->getStyle("B{$ttdNameRow}:D{$ttdNameRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $rekapSheet->mergeCells("H{$ttdNameRow}:J{$ttdNameRow}");
                $rekapSheet->setCellValue("H{$ttdNameRow}", "Ben Arther Molle, S.Tr., M.Si");
                $rekapSheet->getStyle("H{$ttdNameRow}:J{$ttdNameRow}")
                    ->getFont()
                    ->setName('Times New Roman')
                    ->setSize(12);
                $rekapSheet->getStyle("H{$ttdNameRow}:J{$ttdNameRow}")
                    ->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER);
            }
        }

        // ----------------------------------------------------
        // 2. POPULATE SHEET "Ae. 31"
        // ----------------------------------------------------
        $ae31Sheet = $spreadsheet->getSheetByName('Ae. 31');
        if ($ae31Sheet) {
            $ae31Sheet->setCellValue('I9', ': Hasil pengamatan kegiatan aerologi bulan ' . $this->namaBulanIndo[$bulan] . ' ' . $tahun . ' :');

            $maxObsAlt = 0;
            $maxObsDate = '';
            $maxObsHour = '';

            for ($day = 1; $day <= $daysInMonth; $day++) {
                foreach ([0, 12] as $hour) {
                    $altVal = '-';

                    if (isset($mappedData[$day][$hour])) {
                        $r = $mappedData[$day][$hour];
                        $maxAlt = null;

                        if (!empty($r->hasil_lapisan_wd_ws_dddff)) {
                            $laps = array_map(fn($item) => (int) $item['lapisan'], $r->hasil_lapisan_wd_ws_dddff);
                            $validLaps = array_filter($laps, fn($l) => $l > 0);
                            if (!empty($validLaps)) {
                                $maxAlt = max($validLaps);
                                if ($maxAlt > $maxObsAlt) {
                                    $maxObsAlt = $maxAlt;
                                    $maxObsDate = sprintf('%02d %s %04d', $day, $this->namaBulanIndo[$bulan], $tahun);
                                    $maxObsHour = sprintf('%02d.00 UTC', $hour);
                                }
                            }
                        }

                        // If max altitude exists, display max altitude. Otherwise display observation cancellation reason.
                        if ($maxAlt !== null) {
                            $altVal = (string) $maxAlt;
                        } else {
                            $altVal = $r->penghentian_pengamatan ?: '-';
                        }
                    }

                    // Days 1..16 go to top row (Row 15 for 00z, Row 19 for 12z)
                    // Days 17..31 go to bottom row (Row 17 for 00z, Row 21 for 12z)
                    if ($hour === 0) {
                        if ($day <= 16) {
                            $colStr = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(1 + $day);
                            $ae31Sheet->setCellValue("{$colStr}15", $altVal);
                        } else {
                            $colStr = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(1 + ($day - 16));
                            $ae31Sheet->setCellValue("{$colStr}17", $altVal);
                        }
                    } else {
                        if ($day <= 16) {
                            $colStr = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(1 + $day);
                            $ae31Sheet->setCellValue("{$colStr}19", $altVal);
                        } else {
                            $colStr = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(1 + ($day - 16));
                            $ae31Sheet->setCellValue("{$colStr}21", $altVal);
                        }
                    }
                }
            }

            if ($maxObsAlt > 0) {
                $ae31Sheet->setCellValue('I8', ": Pengamatan tertinggi " . number_format($maxObsAlt, 0, ',', '.') . " Feet, tanggal {$maxObsDate} jam {$maxObsHour}");
            }

            // Populate TTD block on "Ae. 31"
            $ae31Sheet->setCellValue('L32', $exportDateStr);
            $ae31Sheet->getStyle('L32')->getFont()->setName('Times New Roman')->setSize(12);
            $ae31Sheet->getStyle('L32')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ae31Sheet->setCellValue('B33', 'Pembuat Laporan');
            $ae31Sheet->getStyle('B33')->getFont()->setName('Times New Roman')->setSize(12)->setBold(true);
            $ae31Sheet->getStyle('B33')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ae31Sheet->setCellValue('L33', 'Kepala');
            $ae31Sheet->getStyle('L33')->getFont()->setName('Times New Roman')->setSize(12)->setBold(true);
            $ae31Sheet->getStyle('L33')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ae31Sheet->setCellValue('B38', 'Mirza Chrisandy Pesulima, S.Tr');
            $ae31Sheet->getStyle('B38')->getFont()->setName('Times New Roman')->setSize(12);
            $ae31Sheet->getStyle('B38')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $ae31Sheet->setCellValue('L38', 'Ben Arther Molle, S.Tr., M.Si');
            $ae31Sheet->getStyle('L38')->getFont()->setName('Times New Roman')->setSize(12);
            $ae31Sheet->getStyle('L38')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        // ----------------------------------------------------
        // 3. POPULATE SHEETS "Me. 39 & Me. 40" (00.00) & "Me. 39 & Me. 40 (2)" (12.00)
        // ----------------------------------------------------
        $meSheets = [
            0 => $spreadsheet->getSheetByName('Me. 39 & Me. 40'),
            12 => $spreadsheet->getSheetByName('Me. 39 & Me. 40 (2)'),
        ];

        foreach ($meSheets as $hour => $sheet) {
            if (!$sheet) continue;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $rowNumTable1 = 7 + $day;  // Upper Wind 1: Row 8..38 (Day 1..31)
                $rowNumTable2 = 65 + $day; // Upper Wind 2: Row 66..96 (Day 1..31)

                if (isset($mappedData[$day][$hour])) {
                    $r = $mappedData[$day][$hour];
                    $lapisanData = $r->hasil_lapisan_wd_ws_dddff ?? [];

                    $layersByHeight = [];
                    foreach ($lapisanData as $lap) {
                        $h = (int) ($lap['lapisan'] ?? -1);
                        $layersByHeight[$h] = $lap;
                    }

                    // Table 1: Levels up to 15,000 ft (Upper Wind 1)
                    foreach ($this->levelColsMe39Table1 as $targetHeight => $cols) {
                        if (isset($layersByHeight[$targetHeight])) {
                            $wd = $layersByHeight[$targetHeight]['wd'] ?? -1;
                            $ws = $layersByHeight[$targetHeight]['ws'] ?? -1;

                            if ($wd !== -1) $sheet->setCellValue("{$cols['ddd']}{$rowNumTable1}", $wd);
                            if ($ws !== -1) $sheet->setCellValue("{$cols['ff']}{$rowNumTable1}", $ws);
                        }
                    }

                    // Table 2: Levels beyond 15,000 ft (Upper Wind 2: 18000, 20000, 25000, 30000, 35000, 40000, 45000, 50000 ft)
                    foreach ($this->levelColsMe39Table2 as $targetHeight => $cols) {
                        if (isset($layersByHeight[$targetHeight])) {
                            $wd = $layersByHeight[$targetHeight]['wd'] ?? -1;
                            $ws = $layersByHeight[$targetHeight]['ws'] ?? -1;

                            if ($wd !== -1) $sheet->setCellValue("{$cols['ddd']}{$rowNumTable2}", $wd);
                            if ($ws !== -1) $sheet->setCellValue("{$cols['ff']}{$rowNumTable2}", $ws);
                        }
                    }
                }
            }

            // Populate TTD block on "Me. 39 & Me. 40" / "Me. 39 & Me. 40 (2)"
            $sheet->mergeCells('AB99:AO99');
            $sheet->setCellValue('AB99', $exportDateStr);
            $sheet->getStyle('AB99:AO99')
                ->getFont()
                ->setName('Times New Roman')
                ->setSize(12);
            $sheet->getStyle('AB99:AO99')
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->mergeCells('B100:O100');
            $sheet->setCellValue('B100', 'Pembuat Laporan');
            $sheet->getStyle('B100:O100')
                ->getFont()
                ->setName('Times New Roman')
                ->setSize(12)
                ->setBold(true);
            $sheet->getStyle('B100:O100')
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->mergeCells('AB100:AO100');
            $sheet->setCellValue('AB100', 'Kepala');
            $sheet->getStyle('AB100:AO100')
                ->getFont()
                ->setName('Times New Roman')
                ->setSize(12)
                ->setBold(true);
            $sheet->getStyle('AB100:AO100')
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->mergeCells('B105:O105');
            $sheet->setCellValue('B105', 'Mirza Chrisandy Pesulima, S.Tr');
            $sheet->getStyle('B105:O105')
                ->getFont()
                ->setName('Times New Roman')
                ->setSize(12);
            $sheet->getStyle('B105:O105')
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);

            $sheet->mergeCells('AB105:AO105');
            $sheet->setCellValue('AB105', 'Ben Arther Molle, S.Tr., M.Si');
            $sheet->getStyle('AB105:AO105')
                ->getFont()
                ->setName('Times New Roman')
                ->setSize(12);
            $sheet->getStyle('AB105:AO105')
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        // ----------------------------------------------------
        // 4. POPULATE SHEETS "Ae. 39" (00.00) & "Ae. 39 (2)" (12.00)
        // ----------------------------------------------------
        $ae39Sheets = [
            0 => $spreadsheet->getSheetByName('Ae. 39'),
            12 => $spreadsheet->getSheetByName('Ae. 39 (2)'),
        ];

        foreach ($ae39Sheets as $hour => $sheet) {
            if (!$sheet) continue;

            $sheet->setCellValue('C2', $bulanUpper);
            $sheet->setCellValue('C3', sprintf('%02d.00 Z', $hour));

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $rowNumTable1 = 5 + $day;  // Table 1 (up to 10,000 ft): Row 6..36
                $rowNumTable2 = 45 + $day; // Table 2 (15,000 ft & beyond): Row 46..76

                if (isset($mappedData[$day][$hour])) {
                    $r = $mappedData[$day][$hour];
                    $lapisanData = $r->hasil_lapisan_wd_ws_dddff ?? [];

                    $layersByHeight = [];
                    foreach ($lapisanData as $lap) {
                        $h = (int) ($lap['lapisan'] ?? -1);
                        $layersByHeight[$h] = $lap;
                    }

                    // Table 1: Surface & Upper Air Levels up to 10,000 ft
                    if ($r->wind_dir_surface !== null) {
                        $sheet->setCellValue("{$this->levelColsAe39Table1['surface']['ddd']}{$rowNumTable1}", $r->wind_dir_surface);
                    }
                    if ($r->wind_speed_surface !== null) {
                        $sheet->setCellValue("{$this->levelColsAe39Table1['surface']['ff']}{$rowNumTable1}", $r->wind_speed_surface);
                    }

                    foreach ([1000, 3000, 5000, 7000, 10000] as $targetHeight) {
                        if (isset($layersByHeight[$targetHeight])) {
                            $cols = $this->levelColsAe39Table1[$targetHeight];
                            $wd = $layersByHeight[$targetHeight]['wd'] ?? -1;
                            $ws = $layersByHeight[$targetHeight]['ws'] ?? -1;

                            if ($wd !== -1) $sheet->setCellValue("{$cols['ddd']}{$rowNumTable1}", $wd);
                            if ($ws !== -1) $sheet->setCellValue("{$cols['ff']}{$rowNumTable1}", $ws);
                        }
                    }

                    // Table 2: 15,000 ft & beyond (Upper Air Steadiness II)
                    foreach ([15000, 20000, 25000, 30000, 35000, 40000] as $targetHeight) {
                        if (isset($layersByHeight[$targetHeight])) {
                            $cols = $this->levelColsAe39Table2[$targetHeight];
                            $wd = $layersByHeight[$targetHeight]['wd'] ?? -1;
                            $ws = $layersByHeight[$targetHeight]['ws'] ?? -1;

                            if ($wd !== -1) $sheet->setCellValue("{$cols['ddd']}{$rowNumTable2}", $wd);
                            if ($ws !== -1) $sheet->setCellValue("{$cols['ff']}{$rowNumTable2}", $ws);
                        }
                    }
                }
            }
        }

        return $spreadsheet;
    }
}
