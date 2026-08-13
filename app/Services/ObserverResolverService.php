<?php

namespace App\Services;

use App\Models\JadwalDetail;
use App\Models\Pegawai;
use Carbon\Carbon;

class ObserverResolverService
{
    /**
     * Resolve the duty observer (Pegawai) for a given date-time string in WIT timezone.
     *
     * @param string $dateTimeString e.g. "2026-08-10 08:30:00" or "2026-08-10 01:00:00"
     * @return Pegawai|null
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
