<?php

namespace App\Services;

use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Carbon\Carbon;

class ObserverResolverService
{
    /**
     * Resolve Pegawai model by observer name or duty schedule timestamp.
     */
    public function resolvePegawai(?string $timestamp, ?string $observerName = null): ?Pegawai
    {
        // 1. Try matching by observer name if provided
        if (!empty($observerName)) {
            $matchedPegawai = $this->resolvePegawaiByName($observerName);
            if ($matchedPegawai) {
                return $matchedPegawai;
            }
        }

        // 2. Fall back to duty schedule by timestamp if available
        if (!empty($timestamp)) {
            return $this->getObserverByTimestamp($timestamp);
        }

        return null;
    }

    /**
     * Intelligent multi-stage matching of observer name with Pegawai records.
     */
    public function resolvePegawaiByName(string $observerName): ?Pegawai
    {
        $cleanObs = $this->normalizeName($observerName);
        if (empty($cleanObs)) {
            return null;
        }

        $allPegawai = Pegawai::all();

        // Stage 1: Exact Normalized Match (without academic titles & punctuation)
        foreach ($allPegawai as $pegawai) {
            $cleanPeg = $this->normalizeName($pegawai->nama);
            if ($cleanPeg === $cleanObs) {
                return $pegawai;
            }
        }

        // Stage 2: Token & Initial/Abbreviation Matching
        $obsTokens = array_values(array_filter(explode(' ', $cleanObs)));
        if (empty($obsTokens)) {
            return null;
        }

        $bestCandidate = null;
        $highestScore = 0.0;

        foreach ($allPegawai as $pegawai) {
            $cleanPeg = $this->normalizeName($pegawai->nama);
            $pegTokens = array_values(array_filter(explode(' ', $cleanPeg)));

            if ($this->matchTokensInOrder($obsTokens, $pegTokens)) {
                return $pegawai;
            }

            // Stage 3: String similarity percentage
            similar_text($cleanObs, $cleanPeg, $percent);
            if ($percent > $highestScore) {
                $highestScore = $percent;
                $bestCandidate = $pegawai;
            }
        }

        // Accept similarity score if >= 75%
        if ($bestCandidate && $highestScore >= 75.0) {
            return $bestCandidate;
        }

        return null;
    }

    /**
     * Check if observer name tokens match employee name tokens sequentially,
     * supporting initials (e.g. "c." -> "cahya", "m." -> "muhd").
     */
    protected function matchTokensInOrder(array $obsTokens, array $pegTokens): bool
    {
        $pegIdx = 0;
        $matchedCount = 0;
        $pegCount = count($pegTokens);

        foreach ($obsTokens as $obsToken) {
            $found = false;

            while ($pegIdx < $pegCount) {
                $pegToken = $pegTokens[$pegIdx];
                $pegIdx++;

                // Direct token equality
                if ($obsToken === $pegToken) {
                    $found = true;
                    $matchedCount++;
                    break;
                }

                // Initial matching (e.g., "c" vs "cahya", "m" vs "muhd")
                if (strlen($obsToken) === 1 && str_starts_with($pegToken, $obsToken)) {
                    $found = true;
                    $matchedCount++;
                    break;
                }

                // Initial on pegToken (e.g., "cahya" vs "c")
                if (strlen($pegToken) === 1 && str_starts_with($obsToken, $pegToken)) {
                    $found = true;
                    $matchedCount++;
                    break;
                }
            }

            if (!$found) {
                return false;
            }
        }

        return $matchedCount === count($obsTokens);
    }

    /**
     * Clean and normalize name by removing academic titles, punctuation, and extra spaces.
     */
    public function normalizeName(string $name): string
    {
        // Convert to lowercase
        $normalized = strtolower(trim($name));

        // Remove common academic titles (front & rear titles)
        $titlePatterns = [
            '/\b(s\.?\s*tr\.?\s*met\.?|s\.?\s*tr\.?\s*inst\.?|s\.?\s*tr\.?|m\.?\s*si\.?|m\.?\s*kom\.?|s\.?\s*t\.?|s\.?\s*si\.?|dr\.?|drs\.?|ir\.?|d3|d4)\b/i',
        ];

        $normalized = preg_replace($titlePatterns, '', $normalized);

        // Remove punctuation marks (commas, periods, quotes)
        $normalized = preg_replace('/[^\w\s]/u', ' ', $normalized);

        // Replace multiple spaces with a single space
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        return trim($normalized);
    }

    /**
     * Resolve the duty observer (Pegawai) for a given date-time string in WIT timezone.
     */
    public function getObserverByTimestamp(string $dateTimeString): ?Pegawai
    {
        $dt = Carbon::parse($dateTimeString, 'Asia/Jayapura');
        $timeStr = $dt->format('H:i:s');
        $currentDateStr = $dt->toDateString();
        $previousDateStr = $dt->copy()->subDay()->toDateString();

        // 1. Check details starting on the current date
        $currentDetails = JadwalDetail::with(['pegawai', 'shift'])
            ->where('tanggal', $currentDateStr)
            ->get();

        foreach ($currentDetails as $detail) {
            $shift = $detail->shift;
            if (!$shift || !$shift->jam_masuk || !$shift->jam_keluar) {
                continue;
            }

            if ($shift->jam_masuk <= $shift->jam_keluar) {
                if ($timeStr >= $shift->jam_masuk && $timeStr <= $shift->jam_keluar) {
                    return $detail->pegawai;
                }
            } else {
                // Overnight shift starting today (e.g., 19:30 to 23:59:59)
                if ($timeStr >= $shift->jam_masuk) {
                    return $detail->pegawai;
                }
            }
        }

        // 2. Check overnight details starting on the previous date (e.g., 00:00:00 to 01:45:00)
        $previousDetails = JadwalDetail::with(['pegawai', 'shift'])
            ->where('tanggal', $previousDateStr)
            ->get();

        foreach ($previousDetails as $detail) {
            $shift = $detail->shift;
            if (!$shift || !$shift->jam_masuk || !$shift->jam_keluar) {
                continue;
            }

            if ($shift->jam_masuk > $shift->jam_keluar) {
                if ($timeStr <= $shift->jam_keluar) {
                    return $detail->pegawai;
                }
            }
        }

        return null;
    }
}
