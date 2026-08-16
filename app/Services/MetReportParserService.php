<?php

namespace App\Services;

class MetReportParserService
{
    /**
     * Check if a raw text message contains MET REPORT (QAM) format.
     */
    public function isMetReport(string $rawText): bool
    {
        return (bool) (
            preg_match('/MET\s*REPORT/i', $rawText) ||
            preg_match('/QAM/i', $rawText) ||
            preg_match('/WAEL/i', $rawText) ||
            preg_match('/OESMAN\s*SADIK/i', $rawText) ||
            (preg_match('/DATE|TGL|TANGGAL/i', $rawText) && preg_match('/WIND|VISIBILITY|QNH|QFE/i', $rawText))
        );
    }

    /**
     * Parse raw MET REPORT (QAM) WhatsApp message into structured parameters.
     * Cleans raw_message up to the carrd.co link footer and removes trailing chat logs.
     */
    public function parse(string $rawText): array
    {
        // 1. Truncate rawText right after carrd.co link or trailing delimiter to strip unwanted chat logs
        $cleanRaw = trim($rawText);
        if (preg_match('/^(.*?(?:https?:\/\/[^\s]*carrd\.co[^\s]*))/is', $rawText, $m)) {
            $cleanRaw = trim($m[1]);
        } elseif (preg_match('/^(.*?(?:TREND\s*:\s*[^\r\n]+\s*={1,2}(?:\s*={5,})?))/is', $rawText, $m)) {
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
        if (preg_match('/(?:DATE|TGL|TANGGAL|DT)\s*[:=]?\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/i', $cleanRaw, $m)) {
            $year = (int)$m[3];
            if ($year < 100) {
                $year += 2000;
            }
            $dateStr = sprintf('%04d-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
        } elseif (preg_match('/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/', $cleanRaw, $m)) {
            $dateStr = sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
        }

        // Time extraction
        $timeStr = null;
        if (preg_match('/(?:TIME|JAM|WAKTU|TM)\s*[:=]?\s*(\d{1,2})[.:](\d{2})/i', $cleanRaw, $m)) {
            $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/(\d{2})[.:](\d{2})\s*(?:UTC|WIT|Z)?/i', $cleanRaw, $m)) {
            $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
        } elseif (preg_match('/(\d{2})(\d{2})\s*Z/i', $cleanRaw, $m)) {
            $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
        }

        if ($dateStr && $timeStr) {
            $res['data_timestamp'] = "{$dateStr} {$timeStr}";
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
            $res['trend'] = trim($m[1]);
        }

        return $res;
    }

    /**
     * Parse multiple MET REPORT (QAM) messages pasted together in bulk.
     * Cleanly truncates trailing WhatsApp chat logs from each report block.
     */
    public function parseMultiple(string $bulkText): array
    {
        $blocks = preg_split('/(?=MET\s*REPORT|QAM\b|OESMAN\s*SADIK|AIRPORT\s*\(WAEL\))/i', $bulkText);
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
