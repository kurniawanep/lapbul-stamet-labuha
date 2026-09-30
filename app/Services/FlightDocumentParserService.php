<?php

namespace App\Services;

use Carbon\Carbon;

class FlightDocumentParserService
{
    /**
     * Check if text block or line contains Flight Document (FD) references.
     */
    public function isFlightDocumentMsg(string $rawText): bool
    {
        // Must match actual FD filenames (.pdf), BMKG-FD codes, or media attachments with FD
        if (preg_match('/(?:BMKG-)?FD[_\-\s][^\r\n<>:"\/\\|?*]+\.pdf/i', $rawText)) {
            return true;
        }
        if (preg_match('/BMKG-FD-[A-Z0-9-]+/i', $rawText)) {
            return true;
        }
        if (preg_match('/<Media omitted>|\(file terlampir\)|<attached:/i', $rawText) && preg_match('/FD[_\-\s]/i', $rawText)) {
            return true;
        }
        if (preg_match('/FD[_\-\s]WAEL/i', $rawText)) {
            return true;
        }
        return false;
    }

    /**
     * Parse raw text export / quick paste content for Flight Document WA dispatches.
     * Matches patterns like:
     * "21/03/2025, 06:10 - Stamet Oesman Sadik: <Media omitted>\nFD-IW1173-2025320.pdf"
     * "21/03/2025, 06:10 - Stamet Oesman Sadik: <Media omitted>\nFD IW 1173.pdf"
     * "21/03/2025, 06:10 - Stamet Oesman Sadik: FD_IW1173_20250320.pdf"
     * "[17/07/26 04.30.15] Dinar: <attached: FD_WAEL_20260717_0430.pdf>"
     * "7/17/26, 4:30 PM - Dinar: BMKG-FD-2608-T5AG80"
     */
    public function parseMultiple(string $bulkText): array
    {
        $bulkText = preg_replace('/[\x{00A0}\x{200B}\x{200E}\x{200F}\x{FEFF}]/u', ' ', $bulkText);

        // Split by WhatsApp message timestamp headers if present, else by newlines
        // Supports: [4:30 PM, 9/28/2026], [28/09/2026, 04:30], 28/09/2026, 04:30 -, [17/07/26 04.30.15], etc.
        $headerCheck = '/^\s*\[?(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[,\s]+\d{1,2}[.:]\d{2}|\d{1,2}[.:]\d{2}(?:[.:]\d{2})?(?:\s*[AP]M)?[,\s]+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/mi';
        if (preg_match($headerCheck, $bulkText)) {
            $splitPattern = '/(?=^\s*\[?(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[,\s]+\d{1,2}[.:]\d{2}|\d{1,2}[.:]\d{2}(?:[.:]\d{2})?(?:\s*[AP]M)?[,\s]+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}))/mi';
            $blocks = preg_split($splitPattern, $bulkText);
        } else {
            $blocks = explode("\n", $bulkText);
        }

        $results = [];

        foreach ($blocks as $block) {
            $block = trim($block);
            if (empty($block) || !$this->isFlightDocumentMsg($block)) {
                continue;
            }

            $dateStr = null;
            $timeStr = null;
            $senderName = null;
            $filename = null;
            $flightNumber = null;

            // 1. Extract Date from header: YYYY-MM-DD or YYYY/MM/DD
            if (preg_match('/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/', $block, $m)) {
                $dateStr = sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
            }
            // 2. Extract Date from header: DD/MM/YYYY or MM/DD/YYYY or YY
            elseif (preg_match('/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/', $block, $m)) {
                $p1 = (int)$m[1];
                $p2 = (int)$m[2];
                $year = (int)$m[3];
                if ($year < 100) $year += 2000;

                // Smart detection for Month vs Day
                if ($p1 > 12 && $p2 <= 12) {
                    // Clearly DD/MM/YYYY
                    $dateStr = sprintf('%04d-%02d-%02d', $year, $p2, $p1);
                } elseif ($p2 > 12 && $p1 <= 12) {
                    // Clearly MM/DD/YYYY (e.g. 9/29/2026)
                    $dateStr = sprintf('%04d-%02d-%02d', $year, $p1, $p2);
                } else {
                    // Both <= 12: Check if AM/PM is present (usually US M/D/Y) or default to DD/MM/Y
                    if (preg_match('/[AP]M/i', $block)) {
                        $dateStr = sprintf('%04d-%02d-%02d', $year, $p1, $p2);
                    } else {
                        $dateStr = sprintf('%04d-%02d-%02d', $year, $p2, $p1);
                    }
                }
            }

            // Extract Time (HH:MM or HH.MM with optional AM/PM or seconds)
            if (preg_match('/(?:^|\[|\s)(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?\s*([AP]M)?/i', $block, $m)) {
                $hour = (int)$m[1];
                $minute = (int)$m[2];
                $ampm = !empty($m[4]) ? strtoupper($m[4]) : null;
                if ($ampm === 'PM' && $hour < 12) {
                    $hour += 12;
                } elseif ($ampm === 'AM' && $hour === 12) {
                    $hour = 0;
                }
                $timeStr = sprintf('%02d:%02d:00', $hour, $minute);
            }

            // Extract Sender Name (avoid cutting off on phone number hyphens)
            if (preg_match('/^\[[^\]\n]+\]\s*([^:\n]+):/m', $block, $m)) {
                $senderName = trim($m[1]);
            } elseif (preg_match('/^[^\-\n]+-\s*([^:\n]+):/m', $block, $m)) {
                $senderName = trim($m[1]);
            } elseif (preg_match('/(?:\]|-)\s*([A-Za-z0-9\.\s_+\(\)~]+?):/', $block, $m)) {
                $sender = trim($m[1]);
                if (!preg_match('/^\d+[\/\-\.:]\d+$/', $sender)) {
                    $senderName = $sender;
                }
            }

            // Extract Filename / FD Code ending with .pdf or BMKG-FD code
            if (preg_match('/(BMKG-FD-[A-Z0-9-]+)/i', $block, $m)) {
                $filename = strtoupper(trim($m[1]));
            } elseif (preg_match('/(FD[_\-\s][^\r\n<>:"\/\\|?*•]+\.pdf)/i', $block, $m)) {
                $filename = trim($m[1]);
            } elseif (preg_match('/(FD[^\s\(\)<>•]+\.pdf)/i', $block, $m)) {
                $filename = trim($m[1]);
            } elseif (preg_match('/(FD[_\-\s][A-Za-z0-9_\-\s]+)/i', $block, $m)) {
                $filename = trim($m[1]);
            }

            // Extract Flight Number from filename or block (e.g. FD-IW1173-... -> IW 1173, FD-BMKG-IW1173.pdf -> IW 1173, FD IW 1173.pdf -> IW 1173, FD_2273.pdf -> IW 2273)
            if ($filename && preg_match('/(?:IW|JT|ID|GA|QG|SJ|IN|IL|XN)\s*[-_]?\s*(\d{3,4})/i', $filename, $fnMatch)) {
                $flightNumber = 'IW ' . $fnMatch[1];
            } elseif ($filename && preg_match('/FD[_\-\s]+(?:([A-Za-z]{2})[\s_\-]*)?(\d{3,4})/i', $filename, $fnMatch)) {
                $airlineCode = !empty($fnMatch[1]) ? strtoupper($fnMatch[1]) : 'IW';
                $flightNumber = $airlineCode . ' ' . $fnMatch[2];
            } elseif (preg_match('/\b(?:IW|WON)\s*[-_]?\s*(\d{3,4})\b/i', $block, $fnMatch)) {
                $flightNumber = 'IW ' . $fnMatch[1];
            }

            // Fallback Date Parsing from Filename if no header date found
            if ($filename && !$dateStr) {
                // Format: YYYYMMDD_HHMM e.g. FD_WAEL_20260717_0430.pdf
                if (preg_match('/(20\d{2})(\d{2})(\d{2})[_\s-](\d{2})(\d{2})/', $filename, $fnDate)) {
                    $dateStr = sprintf('%04d-%02d-%02d', (int)$fnDate[1], (int)$fnDate[2], (int)$fnDate[3]);
                    if (!$timeStr) {
                        $timeStr = sprintf('%02d:%02d:00', (int)$fnDate[4], (int)$fnDate[5]);
                    }
                }
                // Format: DDMMYYYY e.g. FD_IW1173_04092026.pdf, FD_IW1173_11042025.pdf, FD_IW1173_28092026.pdf
                elseif (preg_match('/[_\-](\d{2})(\d{2})(20\d{2})\.pdf$/i', $filename, $fnDate)) {
                    $dateStr = sprintf('%04d-%02d-%02d', (int)$fnDate[3], (int)$fnDate[2], (int)$fnDate[1]);
                }
                // Format: DDMMYY e.g. FD_IW1173_300325.pdf, FD_IW1173_040425.pdf
                elseif (preg_match('/[_\-](\d{2})(\d{2})(\d{2})\.pdf$/i', $filename, $fnDate)) {
                    $year = 2000 + (int)$fnDate[3];
                    $dateStr = sprintf('%04d-%02d-%02d', $year, (int)$fnDate[2], (int)$fnDate[1]);
                }
                // Format: YYYYMMDD or YYYYMDD e.g. FD-IW1173-2025320.pdf, FD-BMKG-2025326-9UEP.pdf
                elseif (preg_match('/(?:BMKG-|IW\d+-|FD-)(\d{4})(\d{1,2})(\d{2})/i', $filename, $fnDate)) {
                    $dateStr = sprintf('%04d-%02d-%02d', (int)$fnDate[1], (int)$fnDate[2], (int)$fnDate[3]);
                }
                // Format: 8-digit YYYYMMDD in filename e.g. FD_20260905
                elseif (preg_match('/(20\d{2})(\d{2})(\d{2})/', $filename, $fnDate)) {
                    $dateStr = sprintf('%04d-%02d-%02d', (int)$fnDate[1], (int)$fnDate[2], (int)$fnDate[3]);
                }
            }

            // Fallback default flight time based on typical schedule if time is not parsed
            if ($dateStr && !$timeStr) {
                if ($flightNumber && str_contains($flightNumber, '2273')) {
                    $timeStr = '09:00:00';
                } elseif ($flightNumber && str_contains($flightNumber, '2275')) {
                    $timeStr = '11:00:00';
                } else {
                    $timeStr = '06:00:00';
                }
            }

            $timestamp = ($dateStr && $timeStr) ? "{$dateStr} {$timeStr}" : ($dateStr ? "{$dateStr} 00:00:00" : null);

            // Infer route and type based on flight number
            $route = 'WAEL -> WAMM';
            $type = 'Terjadwal';
            if ($flightNumber) {
                if (str_contains($flightNumber, '1173') || str_contains($flightNumber, '1174')) {
                    $route = 'WAEL -> WAEE';
                    $type = 'Terjadwal';
                } elseif (preg_match('/227\d/', $flightNumber)) {
                    $route = 'WAEL -> WAMM';
                    $type = 'Charter';
                }
            }

            if ($filename || $timestamp) {
                $results[] = [
                    'filename' => $filename ?: 'FD_DOCUMENT.pdf',
                    'flight_number' => $flightNumber,
                    'route' => $route,
                    'type' => $type,
                    'timestamp' => $timestamp,
                    'sender_name' => $senderName ?: 'WA Group Member',
                    'raw_line' => $block,
                ];
            }
        }

        return $results;
    }
}
