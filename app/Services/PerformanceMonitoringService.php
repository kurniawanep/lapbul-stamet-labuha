<?php

namespace App\Services;

use App\Models\DataMetar;
use App\Models\DataPibal;
use App\Models\DataSinoptik;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PerformanceMonitoringService
{
    protected ObserverResolverService $observerResolver;

    public function __construct(ObserverResolverService $observerResolver)
    {
        $this->observerResolver = $observerResolver;
    }

    /**
     * Parse raw date-time string explicitly as UTC Carbon instance.
     */
    protected function parseUtc(?string $ts): ?Carbon
    {
        if (empty($ts)) {
            return null;
        }

        $clean = preg_replace('/[Zz]$/', '', trim($ts));
        return Carbon::parse($clean, 'UTC');
    }

    /**
     * Get actual sending timestamp of an observation item.
     * Prioritizes received_timestamp / sent_timestamp over data_timestamp.
     */
    protected function getActualSentTimestamp($item, Carbon $slotTime): Carbon
    {
        if (!empty($item->received_timestamp)) {
            return $this->parseUtc($item->received_timestamp);
        }

        if (!empty($item->sent_timestamp)) {
            return $this->parseUtc($item->sent_timestamp);
        }

        if (!empty($item->data_timestamp)) {
            return $this->parseUtc($item->data_timestamp);
        }

        return $slotTime;
    }

    /**
     * Check if a given UTC time is within Manual Observer Duty Hours (06:00 WIT - 18:00 WIT).
     * 06:00 WIT = 21:00 UTC (prev day)
     * 18:00 WIT = 09:00 UTC (current day)
     */
    protected function isManualMetarSlot(Carbon $utcTime): bool
    {
        $witHour = $utcTime->copy()->setTimezone('Asia/Jayapura')->hour;
        return $witHour >= 6 && $witHour <= 18;
    }

    /**
     * Calculate comprehensive staff performance metrics for a given Month and Year.
     */
    public function getMonthlyPerformance(int $bulan, int $tahun): array
    {
        $startDate = Carbon::createFromDate($tahun, $bulan, 1, 'UTC')->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $allPegawai = Pegawai::where('role', 'LIKE', '%Observer%')
            ->orWhereHas('jadwalDetails', function ($q) use ($startDate, $endDate) {
                $q->whereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()]);
            })
            ->get();

        if ($allPegawai->isEmpty()) {
            $allPegawai = Pegawai::all();
        }

        // Pre-fetch actual observation records for the month & build fast lookup maps
        $sinopRecords = DataSinoptik::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])->get();
        $sinopMap = [];
        foreach ($sinopRecords as $s) {
            $key = $this->parseUtc($s->data_timestamp)->format('Y-m-d H');
            $sinopMap[$key] = $s;
        }

        $metarRecords = DataMetar::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])->get();
        $metarMap = [];
        foreach ($metarRecords as $m) {
            $key = $this->parseUtc($m->data_timestamp)->format('Y-m-d H:i');
            $metarMap[$key] = $m;
            // Also map by hourly key if exact minute key isn't matched
            $hourlyKey = $this->parseUtc($m->data_timestamp)->format('Y-m-d H');
            if (!isset($metarMap[$hourlyKey])) {
                $metarMap[$hourlyKey] = $m;
            }
        }

        $pibalRecords = DataPibal::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->orWhereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();
        $pibalMap = [];
        foreach ($pibalRecords as $p) {
            $ts = $p->data_timestamp ?? $p->tanggal;
            $dt = $this->parseUtc($ts);
            if ($dt) {
                $day = $dt->day;
                $h = ($p->jam_utc !== null && $p->jam_utc !== '') ? (int)$p->jam_utc : $dt->hour;
                $key = "{$day}_{$h}";
                $pibalMap[$key] = $p;
            }
        }

        $taforRecords = \App\Models\DataTafor::whereBetween('data_timestamp', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->orWhereBetween('tanggal', [$startDate->toDateString(), $endDate->toDateString()])
            ->get();
        $taforMap = [];
        foreach ($taforRecords as $t) {
            $ts = $t->data_timestamp ?? $t->tanggal;
            $dt = $this->parseUtc($ts);
            if ($dt) {
                $day = $dt->day;
                $h = ($t->jam_utc !== null && $t->jam_utc !== '') ? (int)$t->jam_utc : $dt->hour;
                $key = "{$day}_{$h}";
                $taforMap[$key] = $t;
            }
        }

        // Initialize per-pegawai tracking structure
        $staffMetrics = [];
        foreach ($allPegawai as $p) {
            $staffMetrics[$p->id] = [
                'pegawai' => [
                    'id' => $p->id,
                    'nama' => $p->nama,
                    'nip' => $p->nip,
                    'jabatan' => $p->jabatan,
                ],
                'total_assigned' => 0,
                'timely_count' => 0,
                'late_count' => 0,
                'missing_count' => 0,
                'total_delay_minutes' => 0,
                'breakdown' => [
                    'sinop' => ['total' => 0, 'timely' => 0, 'late' => 0, 'missing' => 0, 'total_delay' => 0],
                    'metar' => ['total' => 0, 'timely' => 0, 'late' => 0, 'missing' => 0, 'total_delay' => 0],
                    'pibal_ppaa' => ['total' => 0, 'timely' => 0, 'late' => 0, 'missing' => 0, 'total_delay' => 0],
                    'pibal_ppbb' => ['total' => 0, 'timely' => 0, 'late' => 0, 'missing' => 0, 'total_delay' => 0],
                    'tafor' => ['total' => 0, 'timely' => 0, 'late' => 0, 'missing' => 0, 'total_delay' => 0],
                ],
                'details' => [],
            ];
        }

        // AWOS System performance tracking
        $awosStats = [
            'total_slots' => 0,
            'timely' => 0,
            'late' => 0,
            'missing' => 0,
        ];

        // Hourly heatmaps & statistics
        $hourlyDelays = array_fill(0, 24, 0);
        $hourlyTotal = array_fill(0, 24, 0);

        // 1. EVALUATE SINOPTIK (24 slots / day: 00..23 UTC)
        for ($d = 1; $d <= $daysInMonth; $d++) {
            for ($h = 0; $h < 24; $h++) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $hourlyTotal[$h]++;

                // Timely Window: :50 prev hour to :15 slot hour (inclusive of minute 15 up to :15:59)
                $windowStart = $slotTime->copy()->subMinutes(10);
                $windowEnd = $slotTime->copy()->addMinutes(15)->endOfMinute();

                $slotKey = $slotTime->format('Y-m-d H');
                $foundSinop = $sinopMap[$slotKey] ?? null;

                $observer = null;
                if ($foundSinop) {
                    $observer = $foundSinop->pegawai_id 
                        ? $allPegawai->find($foundSinop->pegawai_id) 
                        : $this->observerResolver->resolvePegawai($slotTime->toDateTimeString(), $foundSinop->observer_name, 'UTC');
                } else {
                    $observer = $this->observerResolver->getObserverByTimestamp($slotTime->toDateTimeString(), 'UTC');
                }

                $pId = $observer ? $observer->id : null;
                if ($pId && isset($staffMetrics[$pId])) {
                    $staffMetrics[$pId]['total_assigned']++;
                    $staffMetrics[$pId]['breakdown']['sinop']['total']++;

                    if ($foundSinop) {
                        $actualSent = $this->getActualSentTimestamp($foundSinop, $slotTime);
                        
                        if ($actualSent->between($windowStart, $windowEnd)) {
                            // Tepat Waktu
                            $staffMetrics[$pId]['timely_count']++;
                            $staffMetrics[$pId]['breakdown']['sinop']['timely']++;
                        } else {
                            // Terlambat
                            $staffMetrics[$pId]['late_count']++;
                            $staffMetrics[$pId]['breakdown']['sinop']['late']++;
                            $deadline = $slotTime->copy()->addMinutes(15);
                            $diffSec = max(0, $actualSent->getTimestamp() - $deadline->getTimestamp());
                            $delayMin = max(1, (int) ceil($diffSec / 60.0));

                            $staffMetrics[$pId]['total_delay_minutes'] += $delayMin;
                            $staffMetrics[$pId]['breakdown']['sinop']['total_delay'] += $delayMin;
                            $hourlyDelays[$h]++;

                            $staffMetrics[$pId]['details'][] = [
                                'type' => 'SINOP',
                                'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                'sent_at' => $actualSent->format('Y-m-d H:i') . ' UTC',
                                'status' => 'Terlambat',
                                'delay_minutes' => $delayMin,
                                'note' => "Terlambat {$delayMin} menit (Dikirim pada menit {$actualSent->minute}, batas akhir :15)",
                            ];
                        }
                    } else {
                        // Missing Data
                        $staffMetrics[$pId]['missing_count']++;
                        $staffMetrics[$pId]['breakdown']['sinop']['missing']++;
                        $hourlyDelays[$h]++;

                        $staffMetrics[$pId]['details'][] = [
                            'type' => 'SINOP',
                            'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                            'sent_at' => '-',
                            'status' => 'Missing Data',
                            'delay_minutes' => 0,
                            'note' => 'Tidak ada pengiriman data Sinoptik pada slot jam ini',
                        ];
                    }
                }
            }
        }

        // 2. EVALUATE METAR (24 hourly slots / day)
        // Manual Duty: 06:00 WIT - 18:00 WIT (13 hourly slots / day)
        // AWOS Auto: 18:30 WIT - 05:30 WIT (11 hourly slots / day)
        for ($d = 1; $d <= $daysInMonth; $d++) {
            for ($h = 0; $h < 24; $h++) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $isManual = $this->isManualMetarSlot($slotTime);

                $slotKey = $slotTime->format('Y-m-d H:i');
                $hourlyKey = $slotTime->format('Y-m-d H');
                $foundMetar = $metarMap[$slotKey] ?? ($metarMap[$hourlyKey] ?? null);

                // Timely Window: :58 to :02 (inclusive of minute 02 up to :02:59)
                $windowStart = $slotTime->copy()->subMinutes(2);
                $windowEnd = $slotTime->copy()->addMinutes(2)->endOfMinute();

                if ($isManual) {
                    // Manual METAR Duty Observer Assignment
                    $observer = null;
                    if ($foundMetar) {
                        $observer = $foundMetar->pegawai_id 
                            ? $allPegawai->find($foundMetar->pegawai_id) 
                            : $this->observerResolver->resolvePegawai($slotTime->toDateTimeString(), $foundMetar->observer_name, 'UTC');
                    } else {
                        $observer = $this->observerResolver->getObserverByTimestamp($slotTime->toDateTimeString(), 'UTC');
                    }

                    $pId = $observer ? $observer->id : null;
                    if ($pId && isset($staffMetrics[$pId])) {
                        $staffMetrics[$pId]['total_assigned']++;
                        $staffMetrics[$pId]['breakdown']['metar']['total']++;

                        if ($foundMetar) {
                            $actualSent = $this->getActualSentTimestamp($foundMetar, $slotTime);

                            if ($actualSent->between($windowStart, $windowEnd)) {
                                $staffMetrics[$pId]['timely_count']++;
                                $staffMetrics[$pId]['breakdown']['metar']['timely']++;
                            } elseif ($actualSent->lt($windowStart)) {
                                // Dikirim Lebih Awal
                                $diffSec = max(0, $windowStart->getTimestamp() - $actualSent->getTimestamp());
                                $earlyMin = max(1, (int) ceil($diffSec / 60.0));

                                $staffMetrics[$pId]['details'][] = [
                                    'type' => 'METAR (Manual)',
                                    'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                    'sent_at' => $actualSent->format('Y-m-d H:i') . ' UTC',
                                    'status' => 'Lebih Awal',
                                    'delay_minutes' => 0,
                                    'note' => "Dikirim {$earlyMin} menit lebih awal (Dikirim pada menit {$actualSent->minute})",
                                ];
                            } else {
                                $staffMetrics[$pId]['late_count']++;
                                $staffMetrics[$pId]['breakdown']['metar']['late']++;
                                $deadline = $slotTime->copy()->addMinutes(2);
                                $diffSec = max(0, $actualSent->getTimestamp() - $deadline->getTimestamp());
                                $delayMin = max(1, (int) ceil($diffSec / 60.0));

                                $staffMetrics[$pId]['total_delay_minutes'] += $delayMin;
                                $staffMetrics[$pId]['breakdown']['metar']['total_delay'] += $delayMin;

                                $staffMetrics[$pId]['details'][] = [
                                    'type' => 'METAR (Manual)',
                                    'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                    'sent_at' => $actualSent->format('Y-m-d H:i') . ' UTC',
                                    'status' => 'Terlambat',
                                    'delay_minutes' => $delayMin,
                                    'note' => "Terlambat {$delayMin} menit (Dikirim pada menit {$actualSent->minute}, batas akhir :02)",
                                ];
                            }
                        } else {
                            $staffMetrics[$pId]['missing_count']++;
                            $staffMetrics[$pId]['breakdown']['metar']['missing']++;

                            $staffMetrics[$pId]['details'][] = [
                                'type' => 'METAR (Manual)',
                                'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                'sent_at' => '-',
                                'status' => 'Missing Data',
                                'delay_minutes' => 0,
                                'note' => 'Pengamatan METAR Manual tidak dilaksanakan / tidak ada data',
                            ];
                        }
                    }
                } else {
                    // AWOS Auto METAR Tracking (Hourly slots)
                    $awosStats['total_slots']++;
                    if ($foundMetar) {
                        $actualSent = $this->getActualSentTimestamp($foundMetar, $slotTime);
                        if ($actualSent->between($windowStart, $windowEnd)) {
                            $awosStats['timely']++;
                        } elseif ($actualSent->lt($windowStart)) {
                            // Early
                        } else {
                            $awosStats['late']++;
                        }
                    } else {
                        $awosStats['missing']++;
                    }
                }
            }
        }

        // 3. EVALUATE PIBAL (PPAA & PPBB, 2 slots / day each: 00:00 & 12:00 UTC)
        $pibalHours = [0, 12];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            foreach ($pibalHours as $h) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');
                $windowEnd = $slotTime->copy()->addMinutes(45)->endOfMinute();

                $slotKey = "{$d}_{$h}";
                $foundPibal = $pibalMap[$slotKey] ?? null;

                $observer = null;
                if ($foundPibal) {
                    $observer = $foundPibal->pegawai_id 
                        ? $allPegawai->find($foundPibal->pegawai_id) 
                        : $this->observerResolver->resolvePegawai($slotTime->toDateTimeString(), $foundPibal->observer_name, 'UTC');
                } else {
                    $observer = $this->observerResolver->getObserverByTimestamp($slotTime->toDateTimeString(), 'UTC');
                }

                $pId = $observer ? $observer->id : null;
                if ($pId && isset($staffMetrics[$pId])) {
                    $sandi = $foundPibal ? ($foundPibal->sandi_pibal ?? ($foundPibal->raw_pibal ?? '')) : '';
                    $hasPpaa = $foundPibal && str_contains(strtoupper($sandi), 'PPAA');
                    $hasPpbb = $foundPibal && str_contains(strtoupper($sandi), 'PPBB');

                    $actualSent = $foundPibal ? $this->getActualSentTimestamp($foundPibal, $slotTime) : null;
                    $isTimely = $actualSent ? $actualSent->lte($windowEnd) : false;

                    // Evaluate PPAA
                    $staffMetrics[$pId]['total_assigned']++;
                    $staffMetrics[$pId]['breakdown']['pibal_ppaa']['total']++;

                    if ($hasPpaa) {
                        if ($isTimely) {
                            $staffMetrics[$pId]['timely_count']++;
                            $staffMetrics[$pId]['breakdown']['pibal_ppaa']['timely']++;
                        } else {
                            $staffMetrics[$pId]['late_count']++;
                            $staffMetrics[$pId]['breakdown']['pibal_ppaa']['late']++;
                            $deadline = $slotTime->copy()->addMinutes(45);
                            $diffSec = max(0, $actualSent->getTimestamp() - $deadline->getTimestamp());
                            $delayMin = max(1, (int) ceil($diffSec / 60.0));

                            $staffMetrics[$pId]['total_delay_minutes'] += $delayMin;
                            $staffMetrics[$pId]['breakdown']['pibal_ppaa']['total_delay'] += $delayMin;

                            $staffMetrics[$pId]['details'][] = [
                                'type' => 'PIBAL PPAA',
                                'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                'sent_at' => $actualSent->format('Y-m-d H:i') . ' UTC',
                                'status' => 'Terlambat',
                                'delay_minutes' => $delayMin,
                                'note' => "Pibal PPAA Terlambat {$delayMin} menit (Dikirim pada menit {$actualSent->minute}, batas akhir :45)",
                            ];
                        }
                    } else {
                        // Missing PPAA
                        $staffMetrics[$pId]['missing_count']++;
                        $staffMetrics[$pId]['breakdown']['pibal_ppaa']['missing']++;

                        $staffMetrics[$pId]['details'][] = [
                            'type' => 'PIBAL PPAA',
                            'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                            'sent_at' => '-',
                            'status' => 'Missing Data',
                            'delay_minutes' => 0,
                            'note' => 'Sandi Pibal PPAA tidak dilaksanakan / tidak ada data',
                        ];
                    }

                    // Evaluate PPBB
                    $staffMetrics[$pId]['total_assigned']++;
                    $staffMetrics[$pId]['breakdown']['pibal_ppbb']['total']++;

                    if ($hasPpbb) {
                        if ($isTimely) {
                            $staffMetrics[$pId]['timely_count']++;
                            $staffMetrics[$pId]['breakdown']['pibal_ppbb']['timely']++;
                        } else {
                            $staffMetrics[$pId]['late_count']++;
                            $staffMetrics[$pId]['breakdown']['pibal_ppbb']['late']++;
                            $deadline = $slotTime->copy()->addMinutes(45);
                            $diffSec = max(0, $actualSent->getTimestamp() - $deadline->getTimestamp());
                            $delayMin = max(1, (int) ceil($diffSec / 60.0));

                            $staffMetrics[$pId]['total_delay_minutes'] += $delayMin;
                            $staffMetrics[$pId]['breakdown']['pibal_ppbb']['total_delay'] += $delayMin;

                            $staffMetrics[$pId]['details'][] = [
                                'type' => 'PIBAL PPBB',
                                'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                                'sent_at' => $actualSent->format('Y-m-d H:i') . ' UTC',
                                'status' => 'Terlambat',
                                'delay_minutes' => $delayMin,
                                'note' => "Pibal PPBB Terlambat {$delayMin} menit (Dikirim pada menit {$actualSent->minute}, batas akhir :45)",
                            ];
                        }
                    } else {
                        // Missing PPBB
                        $staffMetrics[$pId]['missing_count']++;
                        $staffMetrics[$pId]['breakdown']['pibal_ppbb']['missing']++;

                        $staffMetrics[$pId]['details'][] = [
                            'type' => 'PIBAL PPBB',
                            'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                            'sent_at' => '-',
                            'status' => 'Missing Data',
                            'delay_minutes' => 0,
                            'note' => 'Sandi Pibal PPBB tidak ada / tidak dikirim',
                        ];
                    }
                }
            }
        }

        // 4. EVALUATE TAFOR (4 slots / day: 05, 11, 17, 23 UTC)
        // Note: TAFOR has no delay calculation; only tracked as Present (Timely) or Missing.
        $taforHours = [5, 11, 17, 23];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            foreach ($taforHours as $h) {
                $slotTime = Carbon::create($tahun, $bulan, $d, $h, 0, 0, 'UTC');

                $prevH = ($h == 0) ? 23 : ($h - 1);
                $targetDay = ($h == 0) ? ($d - 1) : $d;

                $keyExact = "{$d}_{$h}";
                $keyIssue = "{$targetDay}_{$prevH}";

                $foundTafor = $taforMap[$keyExact] ?? ($taforMap[$keyIssue] ?? null);

                $observer = null;
                if ($foundTafor) {
                    $observer = $foundTafor->pegawai_id 
                        ? $allPegawai->find($foundTafor->pegawai_id) 
                        : $this->observerResolver->resolvePegawai($slotTime->toDateTimeString(), $foundTafor->observer_name, 'UTC');
                } else {
                    $observer = $this->observerResolver->getObserverByTimestamp($slotTime->toDateTimeString(), 'UTC');
                }

                $pId = $observer ? $observer->id : null;
                if ($pId && isset($staffMetrics[$pId])) {
                    $staffMetrics[$pId]['total_assigned']++;
                    $staffMetrics[$pId]['breakdown']['tafor']['total']++;

                    if ($foundTafor) {
                        // TAFOR Data Present
                        $staffMetrics[$pId]['timely_count']++;
                        $staffMetrics[$pId]['breakdown']['tafor']['timely']++;
                    } else {
                        // TAFOR Missing Data
                        $staffMetrics[$pId]['missing_count']++;
                        $staffMetrics[$pId]['breakdown']['tafor']['missing']++;

                        $staffMetrics[$pId]['details'][] = [
                            'type' => 'TAFOR',
                            'slot_time' => $slotTime->format('Y-m-d H:i') . ' UTC',
                            'sent_at' => '-',
                            'status' => 'Missing Data',
                            'delay_minutes' => 0,
                            'note' => 'Tidak ada pengiriman data TAFOR pada slot jam ini',
                        ];
                    }
                }
            }
        }

        // Calculate final percentages and average delays per staff
        $formattedStaff = [];
        $totalStationSlots = 0;
        $totalStationTimely = 0;
        $totalStationLate = 0;
        $totalStationMissing = 0;

        foreach ($staffMetrics as $pId => $m) {
            $assigned = $m['total_assigned'];
            if ($assigned === 0) {
                continue;
            }

            $timely = $m['timely_count'];
            $late = $m['late_count'];
            $missing = $m['missing_count'];

            $timelyPct = round(($timely / $assigned) * 100, 1);
            $latePct = round(($late / $assigned) * 100, 1);
            $missingPct = round(($missing / $assigned) * 100, 1);

            $avgDelayMin = $late > 0 ? round($m['total_delay_minutes'] / $late, 1) : 0;

            // Breakdown Averages
            foreach (['sinop', 'metar', 'pibal_ppaa', 'pibal_ppbb', 'tafor'] as $type) {
                $tAssigned = max(1, $m['breakdown'][$type]['total']);
                $m['breakdown'][$type]['timely_pct'] = round(($m['breakdown'][$type]['timely'] / $tAssigned) * 100, 1);
                $m['breakdown'][$type]['late_pct'] = round(($m['breakdown'][$type]['late'] / $tAssigned) * 100, 1);
                $m['breakdown'][$type]['missing_pct'] = round(($m['breakdown'][$type]['missing'] / $tAssigned) * 100, 1);
                $m['breakdown'][$type]['avg_delay'] = $m['breakdown'][$type]['late'] > 0 
                    ? round($m['breakdown'][$type]['total_delay'] / $m['breakdown'][$type]['late'], 1) 
                    : 0;
            }

            $totalStationSlots += $assigned;
            $totalStationTimely += $timely;
            $totalStationLate += $late;
            $totalStationMissing += $missing;

            $formattedStaff[] = [
                'pegawai' => $m['pegawai'],
                'total_assigned' => $assigned,
                'timely_count' => $timely,
                'timely_rate_pct' => $timelyPct,
                'late_count' => $late,
                'late_rate_pct' => $latePct,
                'avg_delay_minutes' => $avgDelayMin,
                'missing_count' => $missing,
                'missing_rate_pct' => $missingPct,
                'breakdown' => $m['breakdown'],
                'details' => $m['details'],
            ];
        }

        // Sort leaderboard by timely_rate_pct descending
        usort($formattedStaff, fn($a, $b) => $b['timely_rate_pct'] <=> $a['timely_rate_pct']);

        $stationTimelyPct = $totalStationSlots > 0 ? round(($totalStationTimely / $totalStationSlots) * 100, 1) : 0;

        $awosStats['availability_pct'] = $awosStats['total_slots'] > 0 
            ? round((($awosStats['timely'] + $awosStats['late']) / $awosStats['total_slots']) * 100, 1) 
            : 0;

        return [
            'month' => $bulan,
            'year' => $tahun,
            'station_summary' => [
                'total_slots' => $totalStationSlots,
                'total_timely' => $totalStationTimely,
                'total_late' => $totalStationLate,
                'total_missing' => $totalStationMissing,
                'overall_compliance_pct' => $stationTimelyPct,
                'top_observer' => $formattedStaff[0]['pegawai']['nama'] ?? '-',
            ],
            'awos_summary' => $awosStats,
            'hourly_delays' => $hourlyDelays,
            'staff_rankings' => $formattedStaff,
        ];
    }
}
