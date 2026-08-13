<?php

namespace App\Services;

use App\Models\DataMetar;
use App\Models\DataTafor;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class VerifikasiTaforExportService
{
    protected string $templatePath;

    public function __construct()
    {
        $this->templatePath = resource_path('templates/excel/template_laporan_verifikasi_tafor.xlsx');
    }

    /**
     * Clean raw TAF text: strip text before 'TAF', remove newlines and '='.
     */
    public function cleanTaf(?string $text): string
    {
        if (empty($text)) return '';
        $pos = strpos($text, 'TAF');
        $tafContent = $pos !== false ? substr($text, $pos) : $text;
        $tafContent = str_replace(["\n", "\r", '='], ' ', $tafContent);
        return trim(preg_replace('/\s+/', ' ', $tafContent));
    }

    /**
     * Clean raw METAR text for Excel formula compatibility (remove headers, AUTO, COR, '=').
     */
    public function cleanMetarForExcel(string $sandiRaw): string
    {
        $lines = explode("\n", $sandiRaw);
        $nonEmptyLines = array_filter(array_map('trim', $lines));
        $rawText = !empty($nonEmptyLines) ? end($nonEmptyLines) : $sandiRaw;
        $rawText = str_replace('=', '', $rawText);
        $rawText = preg_replace('/\bCOR\b/', '', $rawText);
        $rawText = preg_replace('/\bAUTO\b/', '', $rawText);
        return trim(preg_replace('/\s+/', ' ', $rawText));
    }

    /**
     * Parse meteorological elements from TAF segment text.
     */
    public function parseElements(string $text): array
    {
        $res = [];
        $textClean = preg_replace('/\b\d{4}\/\d{4}\b/', ' ', $text);

        // 1. Wind (DDDFFGFFKT or VRBFFKT)
        if (preg_match('/(\d{3}|VRB)(\d{2})(G\d{2})?KT/', $textClean, $w)) {
            $res['wind_dir'] = $w[1] !== 'VRB' ? $w[1] : 999;
            $res['wind_speed'] = (int) $w[2];
            $res['gusty'] = !empty($w[3]) ? (int) substr($w[3], 1) : 0;
        }

        // 2. Visibility
        if (preg_match('/\b(\d{4})\b/', $textClean, $v)) {
            $res['vis'] = (int) $v[1];
        } elseif (strpos($textClean, 'CAVOK') !== false) {
            $res['vis'] = 9999;
        }

        // 3. Weather / Endapan
        if (preg_match('/(?:\s|^)([\+\-](?:RA|TSRA|SHRA|DZ|HZ|BR|FG|VCSH|VCTS|TS|NSW))/', $textClean, $wx)) {
            $val = trim($wx[1]);
            $res['weather'] = $val === 'NSW' ? 0 : $val;
        }

        // 4. Clouds (CB > BKN > Lowest)
        if (preg_match_all('/(FEW|SCT|BKN|OVC|NSC|NCD|SKC)(\d{3})?(CB|TCU)?/', $textClean, $matches, PREG_SET_ORDER)) {
            $valid = array_filter($matches, fn($c) => !in_array($c[1], ['NSC', 'NCD', 'SKC']));
            if (empty($valid)) {
                $res['cloud_amt'] = $matches[0][1];
                $res['cloud_hgt'] = 0;
            } else {
                $sig = array_filter($valid, fn($c) => !empty($c[3]));
                if (!empty($sig)) {
                    usort($sig, fn($a, $b) => ((int)($a[2] ?? 999)) <=> ((int)($b[2] ?? 999)));
                    $target = array_values($sig)[0];
                } else {
                    $bkn = array_filter($valid, fn($c) => in_array($c[1], ['BKN', 'OVC']));
                    $searchArr = !empty($bkn) ? $bkn : $valid;
                    usort($searchArr, fn($a, $b) => ((int)($a[2] ?? 999)) <=> ((int)($b[2] ?? 999)));
                    $target = array_values($searchArr)[0];
                }
                $res['cloud_amt'] = $target[1];
                $res['cloud_hgt'] = !empty($target[2]) ? ((int)$target[2]) * 100 : 0;
            }
        }

        return $res;
    }

    /**
     * Parse TAF text into structured validity segments (GENERAL, BECMG, TEMPO, FM).
     */
    public function parseTafSegments(string $tafText): array
    {
        if (empty($tafText) || $tafText === 'NIL') return [];

        $keywords = '/\b((?:PROB\d{2}\s+)?(?:BECMG|TEMPO|FM\d{6})|(?:BECMG|TEMPO)\s+PROB\d{2})\b/';
        $parts = preg_split($keywords, $tafText, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (empty($parts)) return [];

        $segments = [];
        $baseText = $parts[0];
        if (!preg_match('/(\d{2})(\d{2})\/(\d{2})(\d{2})/', $baseText, $m)) {
            return [];
        }

        $sd = (int) $m[1];
        $sh = (int) $m[2];
        $ed = (int) $m[3];
        $eh = (int) $m[4];

        $segments[] = [
            'type' => 'GENERAL',
            'start_day' => $sd,
            'start_hour' => $sh,
            'end_day' => $ed,
            'end_hour' => $eh,
            'elements' => $this->parseElements($baseText),
        ];

        for ($i = 1; $i < count($parts); $i += 2) {
            $gTypeRaw = $parts[$i];
            $gText = $parts[$i + 1] ?? '';

            if (strpos($gTypeRaw, 'BECMG') !== false) {
                $gType = 'BECMG';
            } elseif (strpos($gTypeRaw, 'TEMPO') !== false) {
                $gType = 'TEMPO';
            } elseif (strpos($gTypeRaw, 'FM') !== false) {
                $gType = 'FM';
            } else {
                $gType = 'TEMPO';
            }

            if ($gType === 'FM') {
                if (preg_match('/FM(\d{2})(\d{2})\d{2}/', $gTypeRaw, $fmMatch)) {
                    $segments[] = [
                        'type' => 'FM',
                        'start_day' => (int) $fmMatch[1],
                        'start_hour' => (int) $fmMatch[2],
                        'end_day' => $segments[0]['end_day'],
                        'end_hour' => $segments[0]['end_hour'],
                        'elements' => $this->parseElements($gText),
                    ];
                }
                continue;
            }

            if (preg_match('/(\d{2})(\d{2})\/(\d{2})(\d{2})/', $gText, $rMatch)) {
                $segments[] = [
                    'type' => $gType,
                    'start_day' => (int) $rMatch[1],
                    'start_hour' => (int) $rMatch[2],
                    'end_day' => (int) $rMatch[3],
                    'end_hour' => (int) $rMatch[4],
                    'elements' => $this->parseElements($gText),
                ];
            }
        }

        return $segments;
    }

    /**
     * Compute effective weather parameters for a given day and hour.
     */
    public function getEffectiveWeather(array $segments, int $day, int $hour): array
    {
        if (empty($segments)) {
            return ['status' => 'NIL', 'elements' => []];
        }

        $effective = [
            'wind_dir' => 0,
            'wind_speed' => 0,
            'gusty' => 0,
            'vis' => 9999,
            'weather' => 0,
            'cloud_amt' => 'NCD',
            'cloud_hgt' => 0,
        ];
        $effective = array_merge($effective, $segments[0]['elements']);

        $currentType = 'GENERAL';
        $targetAbs = $day * 24 + $hour;

        // 1. Permanent changes (FM / BECMG)
        for ($i = 1; $i < count($segments); $i++) {
            $seg = $segments[$i];
            $sAbs = $seg['start_day'] * 24 + $seg['start_hour'];
            $eAbs = $seg['end_day'] * 24 + $seg['end_hour'];

            if (in_array($seg['type'], ['FM', 'BECMG'])) {
                if ($targetAbs >= $sAbs) {
                    $effective = array_merge($effective, $seg['elements']);
                    if ($seg['type'] === 'BECMG' && $targetAbs <= $eAbs) {
                        $currentType = 'BECMG';
                    } else {
                        $currentType = 'GENERAL';
                    }
                }
            }
        }

        // 2. Temporary changes (TEMPO)
        for ($i = 1; $i < count($segments); $i++) {
            $seg = $segments[$i];
            $sAbs = $seg['start_day'] * 24 + $seg['start_hour'];
            $eAbs = $seg['end_day'] * 24 + $seg['end_hour'];

            if ($seg['type'] === 'TEMPO' && $sAbs <= $targetAbs && $targetAbs <= $eAbs) {
                $tempElements = array_merge($effective, $seg['elements']);
                return ['status' => 'TEMPO', 'elements' => $tempElements];
            }
        }

        return ['status' => $currentType, 'elements' => $effective];
    }

    /**
     * Safely write cell value handling merged cell regions and alignment.
     */
    protected function writeToCell($ws, int $row, int $col, $value, bool $center = false): void
    {
        $coord = Coordinate::stringFromColumnIndex($col) . $row;
        $targetCell = null;
        foreach ($ws->getMergeCells() as $range) {
            if ($ws->getCell($coord)->isInRange($range)) {
                $bounds = Coordinate::rangeBoundaries($range);
                $targetCell = $ws->getCell([$bounds[0][0], $bounds[0][1]]);
                break;
            }
        }
        if (!$targetCell) {
            $targetCell = $ws->getCell([$col, $row]);
        }

        $targetCell->setValue($value);

        if ($center) {
            $targetCell->getStyle()->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $targetCell->getStyle()->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        }
    }

    /**
     * Generate populated Spreadsheet for TAFOR Verification Report.
     */
    public function generateVerifikasiTaforSpreadsheet(int $bulan, int $tahun): Spreadsheet
    {
        if (!file_exists($this->templatePath)) {
            throw new \RuntimeException("Template Excel tidak ditemukan di path: {$this->templatePath}");
        }

        $spreadsheet = IOFactory::load($this->templatePath);
        $namaBulanIndo = [
            1 => 'JANUARI', 2 => 'FEBRUARI', 3 => 'MARET', 4 => 'APRIL', 5 => 'MEI', 6 => 'JUNI',
            7 => 'JULI', 8 => 'AGUSTUS', 9 => 'SEPTEMBER', 10 => 'OKTOBER', 11 => 'NOVEMBER', 12 => 'DESEMBER',
        ];
        $namaBulanStr = $namaBulanIndo[$bulan] ?? 'JANUARI';
        $numDaysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;

        // 1. Fetch TAFOR records from database for target month (plus 1 day prior 21Z for 00Z slot)
        $startTaforRange = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth()->subHours(6);
        $endTaforRange = Carbon::createFromDate($tahun, $bulan, $numDaysInMonth)->endOfMonth()->addDay();

        $taforItems = DataTafor::whereBetween('data_timestamp', [$startTaforRange, $endTaforRange])
            ->whereNotNull('sandi')
            ->orderBy('data_timestamp', 'asc')
            ->get();

        $tafMap = [];
        foreach ($taforItems as $item) {
            $dt = Carbon::parse($item->data_timestamp);
            $sandiClean = $this->cleanTaf($item->sandi);
            if (empty($sandiClean)) {
                continue;
            }

            // Extract validity start_hour if present (e.g. 0106/0206 -> 6)
            $validityHour = null;
            if (preg_match('/(\d{2})(\d{2})\/(\d{2})(\d{2})/', $sandiClean, $vMatch)) {
                $validityHour = (int) $vMatch[2];
            }

            // Extract issuance hour from sandi text if present (e.g. 010500Z -> 5)
            $sandiIssuanceHour = null;
            if (preg_match('/\b\d{2}(\d{2})\d{2}Z\b/', $sandiClean, $sMatch)) {
                $sandiIssuanceHour = (int) $sMatch[1];
            }

            $effectiveHour = $sandiIssuanceHour !== null ? $sandiIssuanceHour : $dt->hour;

            $slot = '';
            if ($validityHour === 0 || $effectiveHour >= 21 || $effectiveHour <= 2) {
                $slot = '00';
            } elseif ($validityHour === 6 || ($effectiveHour >= 3 && $effectiveHour <= 9)) {
                $slot = '06';
            } else {
                continue;
            }

            $effectiveDt = $dt->copy();
            if ($effectiveHour >= 21) {
                $effectiveDt->addHours(4);
            }

            if ((int)$effectiveDt->month === $bulan && (int)$effectiveDt->year === $tahun) {
                $dayKey = (string) $effectiveDt->day;
                if (!isset($tafMap[$dayKey])) {
                    $tafMap[$dayKey] = [];
                }

                $isCor = (bool) preg_match('/\b(?:COR|CCA|CCB)\b/i', $item->sandi);
                if (!isset($tafMap[$dayKey][$slot]) || $isCor) {
                    $tafMap[$dayKey][$slot] = $sandiClean;
                }
            }
        }

        // 2. Fetch METAR records from database for target month
        $startMetarRange = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endMetarRange = Carbon::createFromDate($tahun, $bulan, $numDaysInMonth)->endOfMonth()->addDays(2);

        $metarItems = DataMetar::whereBetween('data_timestamp', [$startMetarRange, $endMetarRange])
            ->whereNotNull('sandi')
            ->orderBy('data_timestamp', 'asc')
            ->get();

        $metarMap = [];
        foreach ($metarItems as $item) {
            $dt = Carbon::parse($item->data_timestamp);
            if ((int)$dt->month === $bulan && (int)$dt->year === $tahun) {
                $targetHour = null;
                $targetDay = (int) $dt->day;

                if ($dt->minute >= 55) {
                    $nextHourDt = $dt->copy()->addHour();
                    $targetHour = (int) $nextHourDt->hour;
                    $targetDay = (int) $nextHourDt->day;
                } elseif ($dt->minute <= 10) {
                    $targetHour = (int) $dt->hour;
                    $targetDay = (int) $dt->day;
                }

                if ($targetHour === null) {
                    continue;
                }

                $key = "{$targetDay}_{$targetHour}";
                $sandiRaw = $item->sandi;
                $isCor = (bool) preg_match('/\bCOR\b/', $sandiRaw);
                $rawText = $this->cleanMetarForExcel($sandiRaw);

                if (!isset($metarMap[$key])) {
                    $metarMap[$key] = ['text' => $rawText, 'is_cor' => $isCor];
                } else {
                    $existingIsCor = $metarMap[$key]['is_cor'];
                    if ($isCor || !$existingIsCor) {
                        $metarMap[$key] = ['text' => $rawText, 'is_cor' => $isCor];
                    }
                }
            }
        }

        // 3. Fill Excel Sheets for Day 1..numDaysInMonth
        for ($d = 1; $d <= 31; $d++) {
            $dayStr = (string) $d;
            if (!$spreadsheet->sheetNameExists($dayStr)) {
                continue;
            }

            $ws = $spreadsheet->getSheetByName($dayStr);

            if ($d > $numDaysInMonth) {
                $spreadsheet->removeSheetByIndex($spreadsheet->getIndex($ws));
                continue;
            }

            // Fill Month/Year header
            $ws->setCellValue('B3', "BULAN : {$namaBulanStr}");
            $ws->setCellValue('E3', "TAHUN : {$tahun}");

            $dayTafs = $tafMap[$dayStr] ?? [];
            $taf00 = $dayTafs['00'] ?? 'NIL';
            $taf06 = $dayTafs['06'] ?? 'NIL';

            $this->writeToCell($ws, 4, 5, $taf00, false);
            $this->writeToCell($ws, 31, 5, $taf06, false);

            $seg00 = $this->parseTafSegments($taf00);
            $seg06 = $this->parseTafSegments($taf06);

            $configs = [
                ['segs' => $seg00, 'start_r' => 7, 'end_r' => 31, 'base_d' => $d, 'raw_text' => $taf00],
                ['segs' => $seg06, 'start_r' => 34, 'end_r' => 58, 'base_d' => $d, 'raw_text' => $taf06],
            ];

            foreach ($configs as $cfg) {
                if ($cfg['raw_text'] === 'NIL') {
                    continue;
                }

                for ($r = $cfg['start_r']; $r < $cfg['end_r']; $r++) {
                    $cellTime = $ws->getCell([3, $r])->getValue();
                    if ($cellTime !== null) {
                        $h = 0;
                        if (is_numeric($cellTime)) {
                            $h = (int) round($cellTime * 24);
                        } elseif (is_string($cellTime) && strpos($cellTime, ':') !== false) {
                            $parts = explode(':', $cellTime);
                            $h = (int) $parts[0];
                        }

                        $res = $this->getEffectiveWeather($cfg['segs'], $d, $h);
                        $status = $res['status'];
                        $el = $res['elements'];

                        // Write parsed TAFOR elements with CENTER alignment
                        $this->writeToCell($ws, $r, 4, $status, true);            // Col D: Change Group Status
                        $this->writeToCell($ws, $r, 6, $el['wind_dir'] ?? null, true);   // Col F: Wind Dir
                        $this->writeToCell($ws, $r, 7, $el['wind_speed'] ?? null, true); // Col G: Wind Speed
                        $this->writeToCell($ws, $r, 8, $el['gusty'] ?? null, true);      // Col H: Gusty
                        $this->writeToCell($ws, $r, 9, $el['vis'] ?? null, true);        // Col I: Vis
                        $this->writeToCell($ws, $r, 10, $el['weather'] ?? null, true);   // Col J: Weather
                        $this->writeToCell($ws, $r, 11, $el['cloud_amt'] ?? null, true); // Col K: Cloud Amt
                        $this->writeToCell($ws, $r, 12, $el['cloud_hgt'] ?? null, true); // Col L: Cloud Hgt
                    }
                }
            }

            // Fill METAR data in Column M (col 13)
            $ranges = [[7, 31], [34, 58]];
            foreach ($ranges as $rng) {
                for ($r = $rng[0]; $r < $rng[1]; $r++) {
                    $cellTime = $ws->getCell([3, $r])->getValue();
                    if ($cellTime !== null) {
                        $hExcel = 0;
                        if (is_numeric($cellTime)) {
                            $hExcel = (int) round($cellTime * 24);
                        } elseif (is_string($cellTime) && strpos($cellTime, ':') !== false) {
                            $parts = explode(':', $cellTime);
                            $hExcel = (int) $parts[0];
                        }

                        $tDay = $d;
                        if ($rng[0] === 34 && $hExcel < 6) {
                            $tDay = $d + 1;
                        }

                        $key = "{$tDay}_{$hExcel}";
                        if (isset($metarMap[$key])) {
                            $this->writeToCell($ws, $r, 13, $metarMap[$key]['text'], false);
                        }
                    }
                }
            }
        }

        return $spreadsheet;
    }
}
