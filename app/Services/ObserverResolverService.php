<?php

namespace App\Services;

use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ObserverResolverService
{
    protected ?Collection $cachedAllPegawai = null;

    /**
     * @var array<string, Collection>
     */
    protected array $cachedJadwalDetailsByDate = [];

    /**
     * Get or cache all Pegawai.
     */
    public function getAllPegawai(): Collection
    {
        return $this->cachedAllPegawai ??= Pegawai::all();
    }

    /**
     * Reset internal in-memory caches.
     */
    public function resetCache(): void
    {
        $this->cachedAllPegawai = null;
        $this->cachedJadwalDetailsByDate = [];
    }

    /**
     * Pre-warm schedule and employee data for a given date range.
     */
    public function prewarm(Carbon $startDate, Carbon $endDate): void
    {
        $this->getAllPegawai();

        $details = JadwalDetail::with(['pegawai', 'shift'])
            ->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();

        foreach ($details->groupBy('tanggal') as $date => $group) {
            $this->cachedJadwalDetailsByDate[(string) $date] = $group;
        }
    }

    /**
     * Get schedule details for a specific date (from in-memory cache or single query).
     */
    public function getDetailsForDate(string $dateStr): Collection
    {
        if (isset($this->cachedJadwalDetailsByDate[$dateStr])) {
            return $this->cachedJadwalDetailsByDate[$dateStr];
        }

        $details = JadwalDetail::with(['pegawai', 'shift'])
            ->where('tanggal', $dateStr)
            ->get();

        $this->cachedJadwalDetailsByDate[$dateStr] = $details;
        return $details;
    }

    /**
     * Resolve Pegawai model by observer name or duty schedule timestamp.
     */
    public function resolvePegawai(?string $timestamp, ?string $observerName = null, ?string $fromTz = null): ?Pegawai
    {
        // 1. Try matching strictly by Jadwal Dinas Operasional (Observer piket) timestamp FIRST
        if (!empty($timestamp)) {
            $scheduledPegawai = $this->getObserverByTimestamp($timestamp, $fromTz);
            if ($scheduledPegawai) {
                return $scheduledPegawai;
            }
        }

        // 2. Fall back to matching by observer name string if schedule is missing
        if (!empty($observerName)) {
            return $this->resolvePegawaiByName($observerName);
        }

        return null;
    }

    /**
     * Resolve Pegawai model for PIBAL observation (prioritizes PF when within duty hours, fallback to P).
     */
    public function resolvePibalPegawai(?string $timestamp, ?string $observerName = null, ?string $fromTz = null): ?Pegawai
    {
        if (!empty($timestamp)) {
            $scheduledPegawai = $this->getPibalDutyOfficer($timestamp, $fromTz);
            if ($scheduledPegawai) {
                return $scheduledPegawai;
            }
        }

        if (!empty($observerName)) {
            return $this->resolvePegawaiByName($observerName);
        }

        return null;
    }

    /**
     * Resolve Pegawai model for TAFOR issuance (prioritizes PF when within duty hours, fallback to P).
     */
    public function resolveTaforPegawai(?string $timestamp, ?string $observerName = null, ?string $fromTz = null): ?Pegawai
    {
        if (!empty($timestamp)) {
            $scheduledPegawai = $this->getTaforDutyOfficer($timestamp, $fromTz);
            if ($scheduledPegawai) {
                return $scheduledPegawai;
            }
        }

        if (!empty($observerName)) {
            return $this->resolvePegawaiByName($observerName);
        }

        return null;
    }

    /**
     * Resolve Pegawai model for Forecaster products (Flight Document, etc.).
     */
    public function resolveForecastPegawai(?string $timestamp, ?string $forecasterName = null, ?string $fromTz = null): ?Pegawai
    {
        if (!empty($timestamp)) {
            $scheduledPegawai = $this->getForecastOrObserverDutyOfficer($timestamp, $fromTz);
            if ($scheduledPegawai) {
                return $scheduledPegawai;
            }
        }

        if (!empty($forecasterName)) {
            return $this->resolvePegawaiByName($forecasterName);
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

        $allPegawai = $this->getAllPegawai();

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
     * Parse a timestamp string into WIT (Asia/Jayapura) timezone.
     */
    protected function parseToWit(string $dateTimeString, ?string $fromTz = null): Carbon
    {
        if ($fromTz) {
            return Carbon::parse($dateTimeString, $fromTz)->setTimezone('Asia/Jayapura');
        }

        if (preg_match('/(Z|[+\-]\d{2}:?\d{2})$/i', trim($dateTimeString))) {
            return Carbon::parse($dateTimeString)->setTimezone('Asia/Jayapura');
        }

        return Carbon::parse($dateTimeString, 'Asia/Jayapura');
    }

    /**
     * Resolve the active JadwalDetail matching a timestamp, prioritizing the latest shift start
     * when multiple shifts overlap (intersect).
     */
    protected function resolveLatestActiveDetail(
        Carbon $witDt,
        callable $filter,
        ?callable $tieBreaker = null
    ): ?JadwalDetail {
        $timeStr = $witDt->format('H:i:s');
        $currentDateStr = $witDt->toDateString();
        $previousDateStr = $witDt->copy()->subDay()->toDateString();

        $candidates = [];

        foreach ($this->getDetailsForDate($currentDateStr)->filter($filter) as $detail) {
            $shift = $detail->shift;
            if (!$shift || !$shift->jam_masuk || !$shift->jam_keluar) {
                continue;
            }

            $isMatch = $shift->jam_masuk <= $shift->jam_keluar
                ? ($timeStr >= $shift->jam_masuk && $timeStr <= $shift->jam_keluar)
                : ($timeStr >= $shift->jam_masuk);

            if ($isMatch) {
                $candidates[] = [
                    'detail' => $detail,
                    'start_at' => "{$currentDateStr} {$shift->jam_masuk}",
                    'tie' => $tieBreaker ? (int) $tieBreaker($detail) : 0,
                ];
            }
        }

        foreach ($this->getDetailsForDate($previousDateStr)->filter($filter) as $detail) {
            $shift = $detail->shift;
            if (!$shift || !$shift->jam_masuk || !$shift->jam_keluar) {
                continue;
            }

            if ($shift->jam_masuk > $shift->jam_keluar && $timeStr <= $shift->jam_keluar) {
                $candidates[] = [
                    'detail' => $detail,
                    'start_at' => "{$previousDateStr} {$shift->jam_masuk}",
                    'tie' => $tieBreaker ? (int) $tieBreaker($detail) : 0,
                ];
            }
        }

        if (empty($candidates)) {
            return null;
        }

        usort($candidates, function (array $a, array $b) {
            // Prioritize the later starting shift when schedules intersect.
            $cmp = strcmp($b['start_at'], $a['start_at']);
            if ($cmp !== 0) {
                return $cmp;
            }

            return $b['tie'] <=> $a['tie'];
        });

        return $candidates[0]['detail'];
    }

    /**
     * Resolve the active operational observer/forecaster JadwalDetail for a given date-time string.
     */
    public function getObserverDetailByTimestamp(string $dateTimeString, ?string $fromTz = null): ?JadwalDetail
    {
        $dt = $this->parseToWit($dateTimeString, $fromTz);

        $filter = function ($detail) {
            $role = $detail->pegawai->role ?? '';
            $namaShift = strtoupper($detail->shift->nama_shift ?? '');
            $category = strtolower($detail->shift->category ?? 'operasional');

            return $detail->shift
                && $category === 'operasional'
                && $detail->shift->kode_shift !== 'A'
                && !str_contains($namaShift, 'TEKNISI')
                && !str_contains($namaShift, 'PPNPN')
                && !$detail->shift->is_tidak_masuk_kerja
                && $detail->pegawai
                && (str_contains($role, 'Observer') || str_contains($role, 'Forecaster'))
                && !str_contains($role, 'Teknisi');
        };

        $tieBreaker = function (JadwalDetail $detail): int {
            $kode = strtoupper($detail->shift->kode_shift ?? '');
            $nama = strtoupper($detail->shift->nama_shift ?? '');
            $isForecast = str_starts_with($kode, 'PF')
                || str_contains($nama, 'FORECAST')
                || str_contains($nama, 'FOD');

            return $isForecast ? 0 : 1;
        };

        return $this->resolveLatestActiveDetail($dt, $filter, $tieBreaker);
    }

    /**
     * Resolve the duty observer (Pegawai) for a given date-time string in WIT timezone.
     */
    public function getObserverByTimestamp(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        return $this->getObserverDetailByTimestamp($dateTimeString, $fromTz)?->pegawai;
    }

    /**
     * Resolve duty officer for PIBAL observation.
     * Rule: If PF (Pagi Forecast) is scheduled and active during the observation time range on that day,
     * PF is assigned. Otherwise falls back to P (Pagi Obs / observer piket).
     */
    public function getPibalDutyOfficer(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        return $this->getForecastOrObserverDutyOfficer($dateTimeString, $fromTz);
    }

    /**
     * Resolve duty officer for TAFOR issuance.
     * Rule: If PF (Pagi Forecast) is scheduled and active during the issuance time range on that day,
     * PF is assigned. Otherwise falls back to P (Pagi Obs / observer piket).
     */
    public function getTaforDutyOfficer(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        return $this->getForecastOrObserverDutyOfficer($dateTimeString, $fromTz);
    }

    /**
     * Core helper: Resolve Forecaster (PF) if active during duty hours, or fallback to P (Pagi Obs).
     */
    public function getForecastOrObserverDutyOfficer(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        $dt = $this->parseToWit($dateTimeString, $fromTz);

        $timeStr = $dt->format('H:i:s');
        $currentDateStr = $dt->toDateString();
        $previousDateStr = $dt->copy()->subDay()->toDateString();

        // 1. Check if PF (Pagi Forecast / Forecast) is scheduled on this date
        $pfDetail = $this->getDetailsForDate($currentDateStr)->first(function ($detail) {
            if (!$detail->shift || $detail->shift->is_tidak_masuk_kerja || !$detail->pegawai) {
                return false;
            }
            $role = $detail->pegawai->role ?? '';
            if ((!str_contains($role, 'Observer') && !str_contains($role, 'Forecaster')) || str_contains($role, 'Teknisi')) {
                return false;
            }
            $kode = $detail->shift->kode_shift ?? '';
            $nama = strtoupper($detail->shift->nama_shift ?? '');
            if (str_contains($nama, 'TEKNISI') || str_contains($nama, 'PPNPN')) {
                return false;
            }
            return ($kode === 'PF' || str_starts_with($kode, 'PF') || str_contains($nama, 'FORECAST') || str_contains($nama, 'FOD'));
        });

        if ($pfDetail && $pfDetail->pegawai) {
            $shift = $pfDetail->shift;
            // If PF has working hours configured, check if timeStr is within range
            if ($shift && $shift->jam_masuk && $shift->jam_keluar) {
                if ($shift->jam_masuk <= $shift->jam_keluar) {
                    if ($timeStr >= $shift->jam_masuk && $timeStr <= $shift->jam_keluar) {
                        return $pfDetail->pegawai;
                    }
                } else {
                    if ($timeStr >= $shift->jam_masuk || $timeStr <= $shift->jam_keluar) {
                        return $pfDetail->pegawai;
                    }
                }
            } else {
                // If PF has no explicit hours set, PF is responsible for all morning forecast/pibal tasks
                return $pfDetail->pegawai;
            }
        }

        // 2. Check overnight PF shift starting on previous date
        $prevPfDetail = $this->getDetailsForDate($previousDateStr)->first(function ($detail) {
            if (!$detail->shift || $detail->shift->is_tidak_masuk_kerja || !$detail->pegawai) {
                return false;
            }
            $role = $detail->pegawai->role ?? '';
            if ((!str_contains($role, 'Observer') && !str_contains($role, 'Forecaster')) || str_contains($role, 'Teknisi')) {
                return false;
            }
            $kode = $detail->shift->kode_shift ?? '';
            $nama = strtoupper($detail->shift->nama_shift ?? '');
            if (str_contains($nama, 'TEKNISI') || str_contains($nama, 'PPNPN')) {
                return false;
            }
            return ($kode === 'PF' || str_starts_with($kode, 'PF') || str_contains($nama, 'FORECAST') || str_contains($nama, 'FOD'));
        });

        if ($prevPfDetail && $prevPfDetail->pegawai && $prevPfDetail->shift) {
            $shift = $prevPfDetail->shift;
            if ($shift->jam_masuk && $shift->jam_keluar && $shift->jam_masuk > $shift->jam_keluar) {
                if ($timeStr <= $shift->jam_keluar) {
                    return $prevPfDetail->pegawai;
                }
            }
        }

        // 3. Check active duty Observer/Forecaster for this exact timestamp (Siang / Malam / Pagi Obs)
        $activeObserver = $this->getObserverByTimestamp($dateTimeString, $fromTz);
        if ($activeObserver) {
            return $activeObserver;
        }

        // 4. Fallback: Check if P (PAGI / PAGI OBS) is scheduled on this date (Observer/Forecaster ONLY)
        $pDetail = $this->getDetailsForDate($currentDateStr)->first(function ($detail) {
            if (!$detail->shift || $detail->shift->is_tidak_masuk_kerja || !$detail->pegawai) {
                return false;
            }
            $role = $detail->pegawai->role ?? '';
            if ((!str_contains($role, 'Observer') && !str_contains($role, 'Forecaster')) || str_contains($role, 'Teknisi')) {
                return false;
            }
            $kode = $detail->shift->kode_shift ?? '';
            $nama = strtoupper($detail->shift->nama_shift ?? '');
            if ($kode === 'A' || str_contains($nama, 'TEKNISI') || str_contains($nama, 'PPNPN')) {
                return false;
            }
            return in_array($kode, ['P', 'P1', 'PO']) || str_contains($nama, 'PAGI OBS') || str_contains($nama, 'PAGI');
        });

        if ($pDetail && $pDetail->pegawai) {
            return $pDetail->pegawai;
        }

        return null;
    }

    /**
     * Resolve duty Teknisi (Pegawai) for a given date-time string in WIT timezone.
     */
    public function getTeknisiByTimestamp(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        $dt = $this->parseToWit($dateTimeString, $fromTz);

        $teknisiFilter = function ($detail) {
            if (!$detail->shift || $detail->shift->is_tidak_masuk_kerja || !$detail->pegawai) {
                return false;
            }
            $role = $detail->pegawai->role ?? '';
            return str_contains($role, 'Teknisi')
                || str_contains($role, 'Peralatan')
                || str_contains($role, 'Komunikasi');
        };

        $tieBreaker = function (JadwalDetail $detail): int {
            return strtoupper($detail->shift->kode_shift ?? '') === 'A' ? 0 : 1;
        };

        $matched = $this->resolveLatestActiveDetail($dt, $teknisiFilter, $tieBreaker);
        if ($matched && $matched->pegawai) {
            return $matched->pegawai;
        }

        $fallback = $this->getDetailsForDate($dt->toDateString())->first($teknisiFilter);
        return $fallback ? $fallback->pegawai : null;
    }

    /**
     * Resolve duty PPNPN (Pegawai) for a given date-time string in WIT timezone.
     * Excludes shift 'A' (Pagi TU / Administrasi) and 'L' (Libur / Lepas).
     */
    public function getPpnpnByTimestamp(string $dateTimeString, ?string $fromTz = null): ?Pegawai
    {
        $dt = $this->parseToWit($dateTimeString, $fromTz);

        $ppnpnFilter = function ($detail) {
            if (!$detail->shift || $detail->shift->is_tidak_masuk_kerja || in_array($detail->shift->kode_shift, ['L', 'A']) || !$detail->pegawai) {
                return false;
            }
            return ($detail->pegawai->jenis_pegawai === 'PPNPN') || str_contains($detail->pegawai->role ?? '', 'PPNPN');
        };

        $matched = $this->resolveLatestActiveDetail($dt, $ppnpnFilter);
        if ($matched && $matched->pegawai) {
            return $matched->pegawai;
        }

        $fallback = $this->getDetailsForDate($dt->toDateString())->first($ppnpnFilter);
        return $fallback ? $fallback->pegawai : null;
    }
}
