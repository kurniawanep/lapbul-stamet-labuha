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
        return (bool) (
            preg_match('/FD[_\-][A-Za-z0-9]/i', $rawText) ||
            preg_match('/BMKG-FD/i', $rawText) ||
            preg_match('/FD_WAEL/i', $rawText) ||
            (preg_match('/<Media omitted>|\(file terlampir\)|<attached:/i', $rawText) && preg_match('/FD[_\-]/i', $rawText))
        );
    }

    /**
     * Parse raw text export / quick paste content for Flight Document WA dispatches.
     * Matches patterns like:
     * "21/03/2025, 06:10 - Stamet Oesman Sadik: <Media omitted>\nFD-IW1173-2025320.pdf"
     * "21/03/2025, 06:10 - Stamet Oesman Sadik: FD_IW1173_20250320.pdf"
     * "[17/07/26 04.30.15] Dinar: <attached: FD_WAEL_20260717_0430.pdf>"
     * "7/17/26, 4:30 PM - Dinar: BMKG-FD-2608-T5AG80"
     */
    public function parseMultiple(string $bulkText): array
    {
        $bulkText = preg_replace('/[\x{00A0}\x{200B}\x{200E}\x{200F}\x{FEFF}]/u', ' ', $bulkText);

        // Split by WhatsApp message timestamp headers if present, else by newlines
        if (preg_match('/^\s*\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[,\s]+\d{1,2}[.:]\d{2}/m', $bulkText)) {
            $blocks = preg_split('/(?=^\s*\[?\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}[,\s]+\d{1,2}[.:]\d{2})/m', $bulkText);
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

            // 1. Extract Date from header: YYYY-MM-DD
            if (preg_match('/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/', $block, $m)) {
                $dateStr = sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
            }
            // 2. Extract Date from header: DD/MM/YYYY or DD/MM/YY
            elseif (preg_match('/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/', $block, $m)) {
                $year = (int)$m[3];
                if ($year < 100) $year += 2000;
                $dateStr = sprintf('%04d-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
            }

            // Extract Time (HH.MM or HH:MM)
            if (preg_match('/(?:^|\[|\s)(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/', $block, $m)) {
                $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
            }

            // Extract Sender Name (after ] or - before :)
            if (preg_match('/(?:\]|-)\s*([A-Za-z0-9\.\s_+\(\)~]+?):/', $block, $m)) {
                $sender = trim($m[1]);
                if (!preg_match('/^\d+[\/\-\.:]\d+/', $sender)) {
                    $senderName = $sender;
                }
            }

            // Extract Filename / FD Code (e.g. FD-IW1173-2025320.pdf, FD_WAEL_20260717_0430.pdf, BMKG-FD-2608-T5AG80)
            if (preg_match('/(BMKG-FD-[A-Z0-9-]+)/i', $block, $m)) {
                $filename = strtoupper(trim($m[1]));
            } elseif (preg_match('/(FD[_\-][A-Z0-9_\-]+\.pdf)/i', $block, $m)) {
                $filename = trim($m[1]);
            } elseif (preg_match('/(FD[^\s\(\)<>]+\.pdf)/i', $block, $m)) {
                $filename = trim($m[1]);
            } elseif (preg_match('/(FD[_\-][A-Z0-9_\-]+)/i', $block, $m)) {
                $filename = trim($m[1]);
            }

            // Extract Flight Number from filename (e.g. FD-IW1173-... -> IW 1173, FD_IW2273_... -> IW 2273, FD-2273-... -> IW 2273)
            if ($filename && preg_match('/FD[_\-]([A-Z]{2})?(\d{3,4})/i', $filename, $fnMatch)) {
                $airlineCode = !empty($fnMatch[1]) ? strtoupper($fnMatch[1]) : 'IW';
                $flightNumber = $airlineCode . ' ' . $fnMatch[2];
            }

            // Fallback: If filename has timestamp like FD_WAEL_20260717_0430.pdf
            if ($filename && preg_match('/(\d{4})(\d{2})(\d{2})[_\s-](\d{2})(\d{2})/', $filename, $fnDate)) {
                if (!$dateStr) {
                    $dateStr = sprintf('%04d-%02d-%02d', (int)$fnDate[1], (int)$fnDate[2], (int)$fnDate[3]);
                }
                if (!$timeStr) {
                    $timeStr = sprintf('%02d:%02d:00', (int)$fnDate[4], (int)$fnDate[5]);
                }
            }

            $timestamp = ($dateStr && $timeStr) ? "{$dateStr} {$timeStr}" : ($dateStr ? "{$dateStr} 00:00:00" : null);

            // Infer route and type based on flight number
            $route = 'WAEL -> WAMM';
            $type = 'Terjadwal';
            if ($flightNumber) {
                if (str_contains($flightNumber, '1173')) {
                    $route = 'WAEL -> WAEE';
                    $type = 'Terjadwal';
                } elseif (str_contains($flightNumber, '2273') || str_contains($flightNumber, '2275') || str_contains($flightNumber, '2277')) {
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
