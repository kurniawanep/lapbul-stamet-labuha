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
            $cleanName = trim($observerName);
            $pegawai = Pegawai::where('nama', 'LIKE', "%{$cleanName}%")->first();
            if ($pegawai) {
                return $pegawai;
            }

            // Fuzzy match first word or name token
            $parts = explode(' ', $cleanName);
            if (!empty($parts[0]) && strlen($parts[0]) >= 3) {
                $pegawai = Pegawai::where('nama', 'LIKE', "%{$parts[0]}%")->first();
                if ($pegawai) {
                    return $pegawai;
                }
            }
        }

        // 2. Fall back to duty schedule by timestamp if available
        if (!empty($timestamp)) {
            return $this->getObserverByTimestamp($timestamp);
        }

        return null;
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
