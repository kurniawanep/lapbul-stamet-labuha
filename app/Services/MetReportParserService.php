<?php

namespace App\Services;

use Carbon\Carbon;

class MetReportParserService
{
    /**
     * Check if a raw text message contains MET REPORT (QAM) format.
     */
    public function isMetReport(string $rawText): bool
    {
        // 1. Must contain structured report header indicator
        $hasReportHeader = (bool) (
            preg_match('/(?:MET|SPECIAL)\s*REPORT/i', $rawText) ||
            preg_match('/(?:AIRPORT\s*\(WAEL\)|OESMAN\s*SADIK\s*\(WAEL\)|OESMAN\s*SADIK\s*AIRPORT)/i', $rawText) ||
            preg_match('/\bMET\s*REPORT\s*\(QAM\)/i', $rawText)
        );

        // 2. Must contain structured date and time fields
        $hasDateTime = (bool) (
            preg_match('/(?:DATE|TGL|TANGGAL|DT)\s*[:=]/i', $rawText) &&
            preg_match('/(?:TIME|JAM|WAKTU|TM)\s*[:=]/i', $rawText)
        );

        // 3. Must contain structured meteorological parameter fields
        $hasWeatherParams = (bool) (
            preg_match('/(?:WIND|WIN|ANGIN)\s*[:=]/i', $rawText) ||
            preg_match('/(?:VISIBILITY|VISIBILITAS|VIS)\s*[:=]/i', $rawText) ||
            preg_match('/QNH\s*[:=]/i', $rawText) ||
            preg_match('/QFE\s*[:=]/i', $rawText) ||
            preg_match('/(?:TT\/TD|TT\s*\/\s*TD|SUHU)\s*[:=]/i', $rawText)
        );

        // Valid only if structured report header + weather parameters, OR datetime + weather parameters
        return ($hasReportHeader && $hasWeatherParams) || ($hasDateTime && $hasWeatherParams);
    }

    /**
     * Parse raw MET REPORT (QAM) WhatsApp message into structured parameters.
     * Cleans raw_message up to the carrd.co link footer and removes trailing chat logs.
     */
    public function parse(string $rawText): array
    {
        // Normalize non-breaking spaces and other Unicode spaces to normal spaces
        $rawText = preg_replace('/[\x{00A0}\x{200B}\x{200E}\x{200F}\x{FEFF}]/u', ' ', $rawText);

        // 1. Truncate rawText right after carrd.co link or trailing delimiter to strip unwanted chat logs
        $cleanRaw = trim($rawText);
        if (preg_match('/^(.*?(?:https?:\/\/[^\s]*carrd\.co[^\s]*))/is', $rawText, $m)) {
            $cleanRaw = trim($m[1]);
        } elseif (preg_match('/^(.*?(?:TREND\s*[:=]?\s*[^\r\n]+\s*={1,2}(?:\s*={5,})?))/isu', $rawText, $m)) {
            $cleanRaw = trim($m[1]);
        }

        $res = [
            'station_code' => 'WAEL',
            'station_name' => 'Oesman Sadik Airport (WAEL)',
            'data_timestamp' => null,
            'wind' => null,
            'visibility' => null,
            'weather' => null,
            'cloud' => null,
            'temp_drybulb' => null,
            'temp_dewpoint' => null,
            'qnh_hpa' => null,
            'qnh_inhg' => null,
            'qfe_hpa' => null,
            'qfe_inhg' => null,
            'remarks' => null,
            'trend' => null,
            'raw_message' => $cleanRaw,
        ];

        // Station Code (WAEL or fallback)
        if (preg_match('/AIRPORT\s*\(([^)]+)\)/i', $cleanRaw, $m)) {
            $res['station_code'] = trim($m[1]);
        } elseif (preg_match('/\b(WAEL)\b/i', $cleanRaw, $m)) {
            $res['station_code'] = strtoupper($m[1]);
        }

        // Date extraction
        $dateStr = null;
        $day = null;
        $month = null;
        $year = null;

        // 1. Try explicit DATE / TGL / TANGGAL / DT line
        if (preg_match('/(?:DATE|TGL|TANGGAL|DT)\s*[:=]?\s*(\d{1,4})\s*[\/\-\.\s]\s*(\d{1,2})\s*[\/\-\.\s]\s*(\d{2,4})/i', $cleanRaw, $m)) {
            $d = (int)$m[1];
            $mo = (int)$m[2];
            $yr = (int)$m[3];
            if ($yr < 100) {
                $yr += 2000;
            }
            if ($d >= 1 && $d <= 31 && $mo >= 1 && $mo <= 12 && checkdate($mo, $d, $yr)) {
                $day = $d;
                $month = $mo;
                $year = $yr;
            } elseif ($d > 31 && strlen((string)$d) === 3) {
                // Handle 3-digit typing typo like 132
                $d1 = (int)substr((string)$d, 0, 2);
                $d3 = (int)(substr((string)$d, 0, 1) . substr((string)$d, 2, 1));
                $d2 = (int)substr((string)$d, 1, 2);
                if ($d1 <= 31 && checkdate($mo, $d1, $yr)) {
                    $day = $d1;
                    $month = $mo;
                    $year = $yr;
                } elseif ($d3 <= 31 && checkdate($mo, $d3, $yr)) {
                    $day = $d3;
                    $month = $mo;
                    $year = $yr;
                } elseif ($d2 <= 31 && checkdate($mo, $d2, $yr)) {
                    $day = $d2;
                    $month = $mo;
                    $year = $yr;
                }
            }
        }

        // 2. If invalid or not found, try WhatsApp header timestamp date e.g. "12/06/2025, 14:16"
        if (!$day && preg_match('/(?:^|\n)\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})\s*,\s*\d{1,2}[.:]\d{2}/', $cleanRaw, $m)) {
            $d = (int)$m[1];
            $mo = (int)$m[2];
            $yr = (int)$m[3];
            if (checkdate($mo, $d, $yr)) {
                $day = $d;
                $month = $mo;
                $year = $yr;
            }
        }

        // 3. Fallback to any standalone date in text with valid checkdate
        if (!$day && preg_match('/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/', $cleanRaw, $m)) {
            $d = (int)$m[1];
            $mo = (int)$m[2];
            $yr = (int)$m[3];
            if (checkdate($mo, $d, $yr)) {
                $day = $d;
                $month = $mo;
                $year = $yr;
            }
        }

        if ($day && $month && $year) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);
        }

        // Time extraction (standardized to UTC)
        $timeStr = null;
        $tzParsed = null;
        if (preg_match('/(?:TIME|JAM|WAKTU|TM)\s*[:=]?\s*(\d{1,2})\s*[.:]+\s*(\d{2})(?:\s*(UTC|WIT|Z|WITA|WIB))?/i', $cleanRaw, $m)) {
            $h = (int)$m[1];
            $min = (int)$m[2];
            $tzParsed = !empty($m[3]) ? strtoupper($m[3]) : null;
            if ($h >= 0 && $h <= 23 && $min >= 0 && $min <= 59) {
                $timeStr = sprintf('%02d:%02d:00', $h, $min);
            }
        } elseif (preg_match('/\b([01]?\d|2[0-3])\s*[.:]+\s*([0-5]\d)\s*(UTC|WIT|Z|WITA|WIB)\b/i', $cleanRaw, $m)) {
            $tzParsed = strtoupper($m[3]);
            $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/\b([01]?\d|2[0-3])([0-5]\d)\s*Z\b/i', $cleanRaw, $m)) {
            $tzParsed = 'Z';
            $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
        }

        if ($dateStr && $timeStr) {
            if ($tzParsed === 'WIT') {
                $utcDt = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$timeStr}", 'Asia/Jayapura')->setTimezone('UTC');
                $res['data_timestamp'] = $utcDt->format('Y-m-d H:i:s');
            } elseif ($tzParsed === 'WITA') {
                $utcDt = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$timeStr}", 'Asia/Makassar')->setTimezone('UTC');
                $res['data_timestamp'] = $utcDt->format('Y-m-d H:i:s');
            } elseif ($tzParsed === 'WIB') {
                $utcDt = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$timeStr}", 'Asia/Jakarta')->setTimezone('UTC');
                $res['data_timestamp'] = $utcDt->format('Y-m-d H:i:s');
            } else {
                $res['data_timestamp'] = "{$dateStr} {$timeStr}";
            }
        }

        // WIND (Normalize e.g. "260 / 06 KT" to "260/06 KT")
        if (preg_match('/(?:WIND|WIN|ANGIN)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $windRaw = trim($m[1]);
            $res['wind'] = preg_replace('/(\d{3})\s*\/\s*(\d{2})/', '$1/$2', $windRaw);
        }

        // VISIBILITY
        if (preg_match('/(?:VISIBILITY|VISIBILITAS|VIS)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $res['visibility'] = trim($m[1]);
        }

        // WEATHER
        if (preg_match('/(?:WEATHER|WX|CUACA)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $res['weather'] = trim($m[1]);
        }

        // CLOUD
        if (preg_match('/(?:CLOUD|CLD|AWAN)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $res['cloud'] = trim($m[1]);
        }

        // TT/TD Suhu
        if (preg_match('/(?:TT\/TD|TT\s*\/\s*TD|SUHU)\s*[:=]?\s*(-?\d+)(?:[°C]*)\s*\/\s*(-?\d+)/i', $cleanRaw, $m)) {
            $res['temp_drybulb'] = (float)$m[1];
            $res['temp_dewpoint'] = (float)$m[2];
        } elseif (preg_match('/TT\s*[:=]?\s*(-?\d+).*?TD\s*[:=]?\s*(-?\d+)/i', $cleanRaw, $m)) {
            $res['temp_drybulb'] = (float)$m[1];
            $res['temp_dewpoint'] = (float)$m[2];
        } elseif (preg_match('/(-?\d+)\s*°?C?\s*\/\s*(-?\d+)\s*°?C?/i', $cleanRaw, $m)) {
            if (preg_match('/TT|TD|°C/i', $cleanRaw)) {
                $res['temp_drybulb'] = (float)$m[1];
                $res['temp_dewpoint'] = (float)$m[2];
            }
        }

        // QNH
        if (preg_match('/QNH\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s)\s*(\d+(?:\.\d+)?)/i', $cleanRaw, $m)) {
            $res['qnh_hpa'] = (float)$m[1];
            $res['qnh_inhg'] = (float)$m[2];
        } elseif (preg_match('/QNH\s*[:=]?\s*(\d+(?:\.\d+)?)/i', $cleanRaw, $m)) {
            $res['qnh_hpa'] = (float)$m[1];
        }

        // QFE
        if (preg_match('/QFE\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s)\s*(\d+(?:\.\d+)?)/i', $cleanRaw, $m)) {
            $res['qfe_hpa'] = (float)$m[1];
            $res['qfe_inhg'] = (float)$m[2];
        } elseif (preg_match('/QFE\s*[:=]?\s*(\d+(?:\.\d+)?)/i', $cleanRaw, $m)) {
            $res['qfe_hpa'] = (float)$m[1];
        }

        // REMARKS
        if (preg_match('/(?:REMARKS|RMK|CATATAN)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $res['remarks'] = trim($m[1]);
        }

        // TREND
        if (preg_match('/(?:TREND)\s*[:=]?\s*([^\r\n]+)/i', $cleanRaw, $m)) {
            $res['trend'] = trim(ltrim(trim($m[1]), ':= '));
        }

        // A valid MET REPORT must have at least one core weather parameter
        $hasCoreParam = !empty($res['wind']) || !empty($res['visibility']) || !empty($res['qnh_hpa']) || !empty($res['qfe_hpa']) || !empty($res['cloud']) || $res['temp_drybulb'] !== null;
        if (!$hasCoreParam) {
            $res['data_timestamp'] = null;
        }

        return $res;
    }

    /**
     * Parse multiple MET REPORT (QAM) messages pasted together in bulk.
     * Cleanly truncates trailing WhatsApp chat logs from each report block.
     */
    public function parseMultiple(string $bulkText): array
    {
        $bulkText = preg_replace('/[\x{00A0}\x{200B}\x{200E}\x{200F}\x{FEFF}]/u', ' ', $bulkText);
        
        if (preg_match('/^\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*,\s*\d{1,2}[.:]\d{2}/m', $bulkText)) {
            $blocks = preg_split('/(?=^\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\s*,\s*\d{1,2}[.:]\d{2})/m', $bulkText);
        } else {
            $blocks = preg_split('/(?=(?:MET|SPECIAL)\s*REPORT|AIRPORT\s*\(WAEL\))/i', $bulkText);
        }

        $results = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block)) {
                continue;
            }

            if (substr_count($block, 'carrd.co') > 1) {
                $subBlocks = preg_split('/(https?:\/\/[^\s]*carrd\.co[^\s]*)/i', $block, -1, PREG_SPLIT_DELIM_CAPTURE);
                $tempAcc = '';
                foreach ($subBlocks as $sub) {
                    $tempAcc .= $sub;
                    if (str_contains($sub, 'carrd.co')) {
                        if ($this->isMetReport($tempAcc)) {
                            $parsed = $this->parse($tempAcc);
                            if ($parsed['data_timestamp']) {
                                $results[] = $parsed;
                            }
                        }
                        $tempAcc = '';
                    }
                }
                if (!empty(trim($tempAcc)) && $this->isMetReport($tempAcc)) {
                    $parsed = $this->parse($tempAcc);
                    if ($parsed['data_timestamp']) {
                        $results[] = $parsed;
                    }
                }
            } else {
                if ($this->isMetReport($block)) {
                    $parsed = $this->parse($block);
                    if ($parsed['data_timestamp']) {
                        $results[] = $parsed;
                    }
                }
            }
        }

        return $results;
    }
}
