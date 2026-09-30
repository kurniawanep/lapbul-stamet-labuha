<?php

namespace App\Services;

use App\Models\DataSinoptik;
use Carbon\Carbon;
use DOMDocument;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class ThunderstormService
{
    /**
     * Check whether observation data qualifies as a Thunderstorm event.
     */
    public static function isThunderstorm($ww, $w1, $w2): bool
    {
        $wwVal = (is_numeric($ww) && $ww !== '') ? (int) $ww : null;
        $w1Val = (is_numeric($w1) && $w1 !== '') ? (int) $w1 : null;
        $w2Val = (is_numeric($w2) && $w2 !== '') ? (int) $w2 : null;

        if ($wwVal !== null) {
            if ($wwVal === 17 || $wwVal === 29) {
                return true;
            }
            if ($wwVal >= 91 && $wwVal <= 94) {
                return true;
            }
            if ($wwVal >= 95 && $wwVal <= 96) {
                return true;
            }
            if ($wwVal >= 98 && $wwVal <= 99) {
                return true;
            }
        }

        return ($w1Val === 9 || $w2Val === 9);
    }

    /**
     * Get descriptive category for Thunderstorm event.
     */
    public static function getThunderstormCategory($ww, $w1, $w2): string
    {
        $wwVal = (is_numeric($ww) && $ww !== '') ? (int) $ww : null;
        $w1Val = (is_numeric($w1) && $w1 !== '') ? (int) $w1 : null;
        $w2Val = (is_numeric($w2) && $w2 !== '') ? (int) $w2 : null;

        if ($wwVal !== null) {
            if ($wwVal === 17) {
                return 'Thunderstorm Tanpa Presipitasi (ww=17)';
            }
            if ($wwVal === 29) {
                return 'ReTS - Thunderstorm Jam Lalu (ww=29)';
            }
            if ($wwVal >= 91 && $wwVal <= 94) {
                return "Thunderstorm 1 Jam Lalu + Hujan (ww={$wwVal})";
            }
            if ($wwVal >= 95 && $wwVal <= 96) {
                return "Thunderstorm Ringan - Sedang (ww={$wwVal})";
            }
            if ($wwVal >= 98 && $wwVal <= 99) {
                return "Thunderstorm Lebat / Kombinasi Cuaca (ww={$wwVal})";
            }
        }

        if ($w1Val === 9 || $w2Val === 9) {
            return 'Cuaca Lalu ada Thunderstorm / ReTS (w1/w2=9)';
        }

        return 'Bukan Thunderstorm';
    }

    /**
     * Build 12 Months x 31 Days frequency matrix for a given target year.
     */
    public function getYearlyMatrix(int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, 1, 1)->startOfYear();
        $endDate = Carbon::createFromDate($tahun, 12, 31)->endOfYear();

        $records = DataSinoptik::query()
            ->whereBetween('data_timestamp', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereIn('present_weather_ww', ['17', '29', '91', '92', '93', '94', '95', '96', '98', '99', 17, 29, 91, 92, 93, 94, 95, 96, 98, 99])
                  ->orWhereIn('past_weather_w1', ['9', 9])
                  ->orWhereIn('past_weather_w2', ['9', 9]);
            })
            ->select(['id', 'data_timestamp', 'present_weather_ww', 'past_weather_w1', 'past_weather_w2'])
            ->get();

        // Group records by month (1..12) and day (1..31)
        $grouped = [];
        foreach ($records as $rec) {
            $ts = is_string($rec->data_timestamp)
                ? Carbon::parse($rec->data_timestamp, 'UTC')
                : $rec->data_timestamp;
            
            $m = (int) $ts->format('n');
            $d = (int) $ts->format('j');

            if (!isset($grouped[$m][$d])) {
                $grouped[$m][$d] = [];
            }
            $grouped[$m][$d][] = $rec;
        }

        $namaBulan = [
            1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL',
            5 => 'MEI', 6 => 'JUNI', 7 => 'JULI', 8 => 'AGUSTUS',
            9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER'
        ];

        $matrix = [];
        $monthlyTotals = [];
        $yearlyTotalDays = 0;
        $yearlyTotalSlots = 0;

        for ($m = 1; $m <= 12; $m++) {
            $daysInMonth = Carbon::createFromDate($tahun, $m, 1)->daysInMonth;
            $rowDays = [];
            $tsDaysCount = 0;

            for ($d = 1; $d <= 31; $d++) {
                if ($d > $daysInMonth) {
                    $rowDays[$d] = [
                        'valid' => false,
                        'code' => '',
                        'slots_count' => 0,
                        'has_ts' => false,
                    ];
                    continue;
                }

                $dayRecords = $grouped[$m][$d] ?? [];
                $tsSlots = 0;
                foreach ($dayRecords as $r) {
                    if (self::isThunderstorm($r->present_weather_ww, $r->past_weather_w1, $r->past_weather_w2)) {
                        $tsSlots++;
                    }
                }

                $hasTs = $tsSlots > 0;
                if ($hasTs) {
                    $tsDaysCount++;
                    $yearlyTotalSlots += $tsSlots;
                }

                $rowDays[$d] = [
                    'valid' => true,
                    'code' => $hasTs ? 'x' : '-',
                    'slots_count' => $tsSlots,
                    'has_ts' => $hasTs,
                ];
            }

            $monthlyTotals[$m] = $tsDaysCount;
            $yearlyTotalDays += $tsDaysCount;

            $matrix[$m] = [
                'month_num' => $m,
                'month_name' => $namaBulan[$m],
                'days' => $rowDays,
                'total_ts_days' => $tsDaysCount,
                'days_in_month' => $daysInMonth,
            ];
        }

        return [
            'matrix' => $matrix,
            'monthly_totals' => $monthlyTotals,
            'yearly_total_days' => $yearlyTotalDays,
            'yearly_total_slots' => $yearlyTotalSlots,
        ];
    }

    /**
     * Compute statistics for Dashboard.
     */
    public function getDashboardStats(int $bulan, int $tahun, ?array $yearlyInfo = null): array
    {
        if ($yearlyInfo === null) {
            $yearlyInfo = $this->getYearlyMatrix($tahun);
        }

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $monthRecords = DataSinoptik::query()
            ->whereBetween('data_timestamp', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereIn('present_weather_ww', ['17', '29', '91', '92', '93', '94', '95', '96', '98', '99', 17, 29, 91, 92, 93, 94, 95, 96, 98, 99])
                  ->orWhereIn('past_weather_w1', ['9', 9])
                  ->orWhereIn('past_weather_w2', ['9', 9]);
            })
            ->select(['id', 'data_timestamp', 'present_weather_ww', 'past_weather_w1', 'past_weather_w2'])
            ->get();

        $monthlyTsSlots = 0;
        $activeTsCount = 0; // ww in 17,29,91..96,98..99
        $pastTsCount = 0;   // w1 or w2 = 9 (and ww outside TS range)

        foreach ($monthRecords as $r) {
            $ww = $r->present_weather_ww;
            $w1 = $r->past_weather_w1;
            $w2 = $r->past_weather_w2;

            if (self::isThunderstorm($ww, $w1, $w2)) {
                $monthlyTsSlots++;

                $wwVal = (is_numeric($ww) && $ww !== '') ? (int) $ww : null;
                $isWwTs = ($wwVal !== null) && (
                    $wwVal === 17 || $wwVal === 29 ||
                    ($wwVal >= 91 && $wwVal <= 94) ||
                    ($wwVal >= 95 && $wwVal <= 96) ||
                    ($wwVal >= 98 && $wwVal <= 99)
                );

                if ($isWwTs) {
                    $activeTsCount++;
                } else {
                    $pastTsCount++;
                }
            }
        }

        $mostActiveMonthNum = 1;
        $maxTsDays = -1;
        foreach ($yearlyInfo['monthly_totals'] as $m => $total) {
            if ($total > $maxTsDays) {
                $maxTsDays = $total;
                $mostActiveMonthNum = $m;
            }
        }

        $namaBulan = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        return [
            'yearly_total_days' => $yearlyInfo['yearly_total_days'],
            'yearly_total_slots' => $yearlyInfo['yearly_total_slots'],
            'monthly_ts_days' => $yearlyInfo['matrix'][$bulan]['total_ts_days'] ?? 0,
            'monthly_ts_slots' => $monthlyTsSlots,
            'active_ts_count' => $activeTsCount,
            'past_ts_count' => $pastTsCount,
            'most_active_month' => $namaBulan[$mostActiveMonthNum] ?? '-',
            'most_active_month_days' => max(0, $maxTsDays),
        ];
    }

    /**
     * Export thunderstorm.docx report filled with target year frequency matrix data.
     */
    public function exportDocx(int $tahun, int $targetBulan = 12): StreamedResponse
    {
        $templatePath = resource_path('templates/thunderstorm.docx');
        if (!file_exists($templatePath)) {
            abort(404, 'File template thunderstorm.docx tidak ditemukan.');
        }

        $yearlyInfo = $this->getYearlyMatrix($tahun);
        $matrix = $yearlyInfo['matrix'];

        $tempFile = tempnam(sys_get_temp_dir(), 'ts_docx_') . '.docx';
        copy($templatePath, $tempFile);

        $zip = new ZipArchive();
        if ($zip->open($tempFile) === true) {
            $xml = $zip->getFromName('word/document.xml');

            // Format Indonesian date for report generation (e.g. "24 Agustus 2026")
            $bulanIndo = [
                1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
                5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
                9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
            ];
            $today = Carbon::now();
            $formattedDate = $today->format('d') . ' ' . ($bulanIndo[(int)$today->format('n')] ?? '') . ' ' . $today->format('Y');

            // Replace header year and signature date in XML
            $xml = str_replace('XXXX', (string) $tahun, $xml);
            $xml = str_replace('DD MMMM YYYY', $formattedDate, $xml);

            $dom = new DOMDocument();
            // Suppress minor XML load warnings
            @$dom->loadXML($xml);

            $wNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
            $rows = $dom->getElementsByTagNameNS($wNs, 'tr');

            // Rows index 1..12 correspond to JANUARI..DESEMBER
            for ($m = 1; $m <= 12; $m++) {
                if (!isset($rows[$m])) continue;
                $row = $rows[$m];
                $cells = $row->getElementsByTagNameNS($wNs, 'tc');
                $daysInfo = $matrix[$m]['days'] ?? [];
                $isMonthIncluded = ($m <= $targetBulan);

                for ($d = 1; $d <= 31; $d++) {
                    if (!isset($cells[$d])) continue;
                    $cell = $cells[$d];
                    $info = $daysInfo[$d] ?? ['valid' => false, 'code' => ''];

                    $val = '';
                    if ($isMonthIncluded && $info['valid']) {
                        $val = $info['code']; // 'x' or '-'
                    }

                    $pList = $cell->getElementsByTagNameNS($wNs, 'p');
                    if ($pList->length > 0) {
                        $p = $pList->item(0);
                        while ($p->firstChild) {
                            $p->removeChild($p->firstChild);
                        }

                        $pPr = $dom->createElementNS($wNs, 'w:pPr');
                        $jc = $dom->createElementNS($wNs, 'w:jc');
                        $jc->setAttribute('w:val', 'center');
                        $pPr->appendChild($jc);
                        $p->appendChild($pPr);

                        if ($val !== '') {
                            $r = $dom->createElementNS($wNs, 'w:r');
                            $t = $dom->createElementNS($wNs, 'w:t', $val);
                            $r->appendChild($t);
                            $p->appendChild($r);
                        }
                    }
                }
            }

            $newXml = $dom->saveXML();
            $zip->addFromString('word/document.xml', $newXml);
            $zip->close();
        }

        $filename = "Laporan_Frekuensi_Thunderstorm_{$tahun}_" . str_pad($targetBulan, 2, '0', STR_PAD_LEFT) . ".docx";

        return response()->streamDownload(function () use ($tempFile) {
            readfile($tempFile);
            @unlink($tempFile);
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }
}
