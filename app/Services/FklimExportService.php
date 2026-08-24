<?php

namespace App\Services;

use App\Models\DataFklim;
use App\Models\DataSinoptik;
use App\Services\ThunderstormService;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class FklimExportService
{
    protected array $namaBulan = [
        1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
        5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
        9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
    ];

    /**
     * Generate populated FKLIM Spreadsheet object for a given month and year.
     */
    public function generateFklimSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        $templatePath = resource_path('templates/excel/template_lapbul_fklim.xlsx');
        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template Excel FKLIM tidak ditemukan di {$templatePath}");
        }

        $spreadsheet = IOFactory::load($templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $monthNameUpper = strtoupper($this->namaBulan[$bulan] ?? 'JULI');

        // 1. Set Month & Year Headers (Halaman 1 & Halaman 2)
        $sheet->setCellValue('B9', ': ' . $monthNameUpper);
        $sheet->setCellValue('B10', ': ' . $tahun);

        $sheet->setCellValue('M2', 'Bulan : ' . $monthNameUpper);
        $sheet->setCellValue('M3', 'Tahun : ' . $tahun);

        // 2. Fetch FKLIM Data for the month
        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $sheet->setCellValue('S44', "Labuha, {$daysInMonth} {$monthNameUpper} {$tahun}");

        $records = DataFklim::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->get();

        $fklimMap = [];
        foreach ($records as $r) {
            $rawStr = is_string($r->data_timestamp) ? $r->data_timestamp : $r->data_timestamp->format('Y-m-d H:i:s');
            $dt = Carbon::parse($rawStr, 'UTC');
            $day = $dt->day;
            $fklimMap[$day] = $r;
        }

        // Fetch Sinoptik TS/RETS findings for the month
        $sinoptikRecords = DataSinoptik::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])->get();
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

        // 3. Populate daily rows
        // Halaman 1 (Cols A to J): Day 1 = Row 16, Day 31 = Row 46 ($rowH1 = 15 + $day)
        // Halaman 2 (Cols M to V): Day 1 = Row 10, Day 31 = Row 40 ($rowH2 = 9 + $day)
        for ($day = 1; $day <= 31; $day++) {
            $rowH1 = 15 + $day;
            $rowH2 = 9 + $day;

            if ($day <= $daysInMonth) {
                $rec = $fklimMap[$day] ?? null;

                // --- HALAMAN 1 (Row 16 to 46) ---
                $sheet->setCellValue("A{$rowH1}", $day);
                if ($rec) {
                    // BMKG Climatology Formula for Daily Average Temperature: (2*07.00 + 13.00 + 18.00) / 4
                    $tbkAvg = ($rec->tbk_0700 !== null && $rec->tbk_1300 !== null && $rec->tbk_1800 !== null)
                        ? round(((2 * $rec->tbk_0700) + $rec->tbk_1300 + $rec->tbk_1800) / 4.0, 1)
                        : $rec->tbk_avg;

                    $sheet->setCellValue("B{$rowH1}", $rec->tbk_0700);
                    $sheet->setCellValue("C{$rowH1}", $rec->tbk_1300);
                    $sheet->setCellValue("D{$rowH1}", $rec->tbk_1800);
                    $sheet->setCellValue("E{$rowH1}", $tbkAvg);
                    $sheet->setCellValue("F{$rowH1}", $rec->t_max);
                    $sheet->setCellValue("G{$rowH1}", $rec->t_min);

                    // Sunshine duration converted to % (divisor 8)
                    $ss8Pct = $rec->ss_8 !== null ? round(($rec->ss_8 / 8.0) * 100, 1) : null;

                    // Enrich cu_khusus with TS / RETS if applicable
                    $tsCode = $sinoptikTsMap[$day] ?? null;
                    $cuKhususEnriched = $this->enrichCuKhusus($rec->cu_khusus, $tsCode);

                    $sheet->setCellValue("H{$rowH1}", $rec->rr_0700);
                    $sheet->setCellValue("I{$rowH1}", $ss8Pct);
                    $sheet->setCellValue("J{$rowH1}", $cuKhususEnriched);
                } else {
                    $colsH1 = ['B','C','D','E','F','G','H','I','J'];
                    foreach ($colsH1 as $col) {
                        $sheet->setCellValue("{$col}{$rowH1}", null);
                    }
                }

                // --- HALAMAN 2 (Row 10 to 40) ---
                $sheet->setCellValue("M{$rowH2}", $day);
                if ($rec) {
                    // BMKG Climatology Formula for Daily Average RH: (2*07.00 + 13.00 + 18.00) / 4
                    $rhAvg = ($rec->rh_0700 !== null && $rec->rh_1300 !== null && $rec->rh_1800 !== null)
                        ? (int) round(((2 * $rec->rh_0700) + $rec->rh_1300 + $rec->rh_1800) / 4.0)
                        : $rec->rh_avg;

                    $sheet->setCellValue("N{$rowH2}", $rec->pp_qfe);
                    $sheet->setCellValue("O{$rowH2}", $rec->rh_0700);
                    $sheet->setCellValue("P{$rowH2}", $rec->rh_1300);
                    $sheet->setCellValue("Q{$rowH2}", $rec->rh_1800);
                    $sheet->setCellValue("R{$rowH2}", $rhAvg);

                    $sheet->setCellValue("S{$rowH2}", $rec->ff_avg);
                    $sheet->setCellValue("T{$rowH2}", $rec->wd_cardinal);
                    $sheet->setCellValue("U{$rowH2}", $rec->ff_max);
                    $sheet->setCellValue("V{$rowH2}", $rec->wd_ff_max);
                } else {
                    $colsH2 = ['N','O','P','Q','R','S','T','U','V'];
                    foreach ($colsH2 as $col) {
                        $sheet->setCellValue("{$col}{$rowH2}", null);
                    }
                }
            } else {
                // Days 29, 30, 31 for shorter months (<31 days)
                $sheet->setCellValue("A{$rowH1}", null);
                $colsH1 = ['B','C','D','E','F','G','H','I','J'];
                foreach ($colsH1 as $col) {
                    $sheet->setCellValue("{$col}{$rowH1}", null);
                }

                $sheet->setCellValue("M{$rowH2}", null);
                $colsH2 = ['N','O','P','Q','R','S','T','U','V'];
                foreach ($colsH2 as $col) {
                    $sheet->setCellValue("{$col}{$rowH2}", null);
                }
            }
        }

        // 4. Ensure number formatting on Summary rows (JUMLAH & RATA-RATA) displays 1 decimal place (0.0)
        $summaryColsH2 = ['N', 'O', 'P', 'Q', 'R', 'S'];
        foreach ($summaryColsH2 as $col) {
            $sheet->getStyle("{$col}41")->getNumberFormat()->setFormatCode('0.0');
            $sheet->getStyle("{$col}42")->getNumberFormat()->setFormatCode('0.0');
        }

        // 5. Calculate Most Frequent Wind Direction for T42 (wd_cardinal) and V42 (wd_ff_max)
        $tValues = [];
        $vValues = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $rec = $fklimMap[$day] ?? null;
            if ($rec) {
                if (!empty($rec->wd_cardinal)) {
                    $tValues[] = $rec->wd_cardinal;
                }
                if (!empty($rec->wd_ff_max)) {
                    $vValues[] = $rec->wd_ff_max;
                }
            }
        }

        $mostFrequentT = $this->getMostFrequentDirection($tValues);
        $mostFrequentV = $this->getMostFrequentDirection($vValues);

        $sheet->setCellValue('T42', $mostFrequentT);
        $sheet->setCellValue('V42', $mostFrequentV);

        return $spreadsheet;
    }

    /**
     * Calculate most frequent wind direction (mode) from an array of direction strings.
     */
    protected function getMostFrequentDirection(array $values): string
    {
        if (empty($values)) {
            return '-';
        }

        $counts = [];
        foreach ($values as $val) {
            $tokens = preg_split('/[;,\\/\\s]+/', trim((string) $val));
            foreach ($tokens as $token) {
                $token = strtoupper(trim($token));
                if (!empty($token) && $token !== 'C' && $token !== '-') {
                    $counts[$token] = ($counts[$token] ?? 0) + 1;
                }
            }
        }

        if (empty($counts)) {
            return '-';
        }

        $maxCount = max($counts);
        $topTokens = array_keys(array_filter($counts, fn($c) => $c === $maxCount));

        // Sort standard cardinal order for consistent display if tie
        $standardOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        usort($topTokens, function ($a, $b) use ($standardOrder) {
            $posA = array_search($a, $standardOrder);
            $posB = array_search($b, $standardOrder);
            $posA = $posA === false ? 99 : $posA;
            $posB = $posB === false ? 99 : $posB;
            return $posA <=> $posB;
        });

        return implode(';', $topTokens);
    }

    /**
     * Enrich Cuaca Khusus string with TS / RETS information if not already present.
     */
    protected function enrichCuKhusus(?string $cuKhusus, ?string $tsCode): ?string
    {
        $cuKhususTrim = trim((string) $cuKhusus);

        if (empty($tsCode)) {
            return $cuKhususTrim !== '' ? $cuKhususTrim : '-';
        }

        // Check if TS or RETS is already in cu_khusus string
        if ($cuKhususTrim !== '' && preg_match('/\b(TS|RETS)\b/i', $cuKhususTrim)) {
            return $cuKhususTrim;
        }

        if ($cuKhususTrim === '' || $cuKhususTrim === '-') {
            return $tsCode;
        }

        return "{$cuKhususTrim} + {$tsCode}";
    }
}
