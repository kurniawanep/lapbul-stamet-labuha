<?php

namespace App\Services;

use App\Models\DataFlightDocument;
use Carbon\Carbon;

class FlightDocumentParserService
{
    /**
     * Check if text block or line contains Flight Document (FD) references.
     */
    public function isFlightDocumentMsg(string $rawText): bool
    {
        return (bool) (
            preg_match('/FD[_\s-]/i', $rawText) ||
            preg_match('/BMKG-FD/i', $rawText) ||
            preg_match('/Flight\s*Doc/i', $rawText) ||
            preg_match('/\.pdf\b/i', $rawText)
        );
    }

    /**
     * Parse raw text export / quick paste content for Flight Document WA dispatches.
     * Matches lines like:
     * "[17/07/26 04.30.15] Dinar C. Nirwana: <attached: FD_WAEL_20260717_0430.pdf>"
     * "17/07/26 04.30 - Dinar C. Nirwana: FD_WAEL_20260717_0430.pdf (file terlampir)"
     * "7/17/26, 4:30 PM - +62 813-5499-8893: BMKG-FD-2608-T5AG80"
     */
    public function parseMultiple(string $bulkText): array
    {
        $lines = explode("\n", $bulkText);
        $results = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || !$this->isFlightDocumentMsg($line)) {
                continue;
            }

            $dateStr = null;
            $timeStr = null;
            $senderName = null;
            $filename = null;

            // Extract Date (DD/MM/YY or MM/DD/YY)
            if (preg_match('/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/', $line, $m)) {
                $year = (int)$m[3];
                if ($year < 100) $year += 2000;
                $dateStr = sprintf('%04d-%02d-%02d', $year, (int)$m[2], (int)$m[1]);
            }

            // Extract Time (HH.MM or HH:MM)
            if (preg_match('/(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/', $line, $m)) {
                $timeStr = sprintf('%02d:%02d:00', (int)$m[1], (int)$m[2]);
            }

            // Extract Sender Name before colon
            if (preg_match('/(?:\]|-)\s*([^:]+):/', $line, $m)) {
                $senderName = trim($m[1]);
            }

            // Extract Filename / FD Code (e.g. FD_WAEL_20260717_0430.pdf or BMKG-FD-2608-T5AG80)
            if (preg_match('/(BMKG-FD-[A-Z0-9-]+)/i', $line, $m)) {
                $filename = strtoupper($m[1]);
            } elseif (preg_match('/(FD[^\s\(\)<>]+\.pdf)/i', $line, $m)) {
                $filename = trim($m[1]);
            } elseif (preg_match('/(FD[^\s\(\)<>]+)/i', $line, $m)) {
                $filename = trim($m[1]);
            }

            $timestamp = ($dateStr && $timeStr) ? "{$dateStr} {$timeStr}" : null;

            if ($filename || $timestamp) {
                $results[] = [
                    'filename' => $filename ?: 'FD_DOCUMENT.pdf',
                    'timestamp' => $timestamp,
                    'sender_name' => $senderName ?: 'WA Group Member',
                    'raw_line' => $line,
                ];
            }
        }

        return $results;
    }
}
