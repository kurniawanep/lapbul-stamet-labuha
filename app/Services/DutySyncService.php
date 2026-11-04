<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DutySyncService
{
    protected ObserverResolverService $resolver;

    public function __construct(ObserverResolverService $resolver)
    {
        $this->resolver = $resolver;
    }

    /**
     * Resynchronize duty personnel (Observer, Teknisi, PPNPN) for all operational observation records
     * for a specified month and year using high-efficiency direct DB bulk updates.
     */
    public function syncObservationsForPeriod(int $bulan, int $tahun): array
    {
        @set_time_limit(180);
        $startTime = microtime(true);

        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;

        $tableTimestampMap = [
            'data_sinoptik' => 'data_timestamp',
            'data_metar' => 'data_timestamp',
            'data_fklim' => 'data_timestamp',
            'data_met_report' => 'data_timestamp',
            'data_flight_document' => 'departure_at',
        ];

        $totalUpdated = 0;

        $jadwalBulanan = \App\Models\JadwalBulanan::where('bulan', $bulan)->where('tahun', $tahun)->first();
        
        $shifts = collect();
        if ($jadwalBulanan) {
            $shifts = \App\Models\JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
                ->where('is_tidak_masuk_kerja', false)
                ->whereNotNull('jam_masuk')
                ->whereNotNull('jam_keluar')
                ->get();
        }
        if ($shifts->isEmpty()) {
            $shifts = \App\Models\MasterShift::where('is_tidak_masuk_kerja', false)
                ->whereNotNull('jam_masuk')
                ->whereNotNull('jam_keluar')
                ->get();
        }

        $uniqueShiftWindows = $shifts->unique(function ($s) {
            return $s->jam_masuk . '-' . $s->jam_keluar;
        });

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $day);

            $windows = [];
            if ($uniqueShiftWindows->isNotEmpty()) {
                foreach ($uniqueShiftWindows as $s) {
                    $masuk = $s->jam_masuk;
                    $keluar = $s->jam_keluar;
                    if (!$masuk || !$keluar) {
                        continue;
                    }

                    $startCarbon = Carbon::parse("{$dateStr} {$masuk}", 'Asia/Jayapura');

                    if ($masuk <= $keluar) {
                        $endCarbon = Carbon::parse("{$dateStr} {$keluar}", 'Asia/Jayapura');
                        $sampleWit = $startCarbon->copy()->addMinutes(max(5, (int) ($startCarbon->diffInMinutes($endCarbon) / 2)))->toDateTimeString();
                    } else {
                        $endCarbon = Carbon::parse("{$dateStr} {$keluar}", 'Asia/Jayapura')->addDay();
                        $sampleWit = $startCarbon->copy()->addMinutes(30)->toDateTimeString();
                    }

                    $windows[] = [
                        'sample_wit' => $sampleWit,
                        'utc_start' => $startCarbon->copy()->setTimezone('UTC')->toDateTimeString(),
                        'utc_end' => $endCarbon->copy()->subSecond()->setTimezone('UTC')->toDateTimeString(),
                    ];
                }
            }

            // Fallback default windows if no shifts configured
            if (empty($windows)) {
                $windows = [
                    [
                        'sample_wit' => "{$dateStr} 08:00:00",
                        'utc_start' => Carbon::parse("{$dateStr} 07:00:00", 'Asia/Jayapura')->setTimezone('UTC')->toDateTimeString(),
                        'utc_end' => Carbon::parse("{$dateStr} 13:29:59", 'Asia/Jayapura')->setTimezone('UTC')->toDateTimeString(),
                    ],
                    [
                        'sample_wit' => "{$dateStr} 14:00:00",
                        'utc_start' => Carbon::parse("{$dateStr} 13:30:00", 'Asia/Jayapura')->setTimezone('UTC')->toDateTimeString(),
                        'utc_end' => Carbon::parse("{$dateStr} 19:29:59", 'Asia/Jayapura')->setTimezone('UTC')->toDateTimeString(),
                    ],
                    [
                        'sample_wit' => "{$dateStr} 20:00:00",
                        'utc_start' => Carbon::parse("{$dateStr} 19:30:00", 'Asia/Jayapura')->setTimezone('UTC')->toDateTimeString(),
                        'utc_end' => Carbon::parse("{$dateStr} 23:59:59", 'Asia/Jayapura')->addHours(7)->setTimezone('UTC')->toDateTimeString(),
                    ],
                ];
            }

            foreach ($windows as $win) {
                $sampleWit = $win['sample_wit'];
                $utcStart = $win['utc_start'];
                $utcEnd = $win['utc_end'];

                $observer = $this->resolver->getObserverByTimestamp($sampleWit, 'Asia/Jayapura');
                $teknisi = $this->resolver->getTeknisiByTimestamp($sampleWit, 'Asia/Jayapura');
                $ppnpn = $this->resolver->getPpnpnByTimestamp($sampleWit, 'Asia/Jayapura');

                $updatePayload = [
                    'pegawai_id' => $observer ? $observer->id : null,
                    'teknisi_id' => $teknisi ? $teknisi->id : null,
                    'ppnpn_id' => $ppnpn ? $ppnpn->id : null,
                ];

                foreach ($tableTimestampMap as $table => $timestampCol) {
                    if (!DB::getSchemaBuilder()->hasTable($table) || !DB::getSchemaBuilder()->hasColumn($table, $timestampCol)) {
                        continue;
                    }

                    $payload = $updatePayload;
                    if (DB::getSchemaBuilder()->hasColumn($table, 'observer_name')) {
                        $payload['observer_name'] = $observer ? $observer->nama : null;
                    }

                    $count = DB::table($table)
                        ->whereBetween($timestampCol, [$utcStart, $utcEnd])
                        ->update($payload);

                    $totalUpdated += $count;
                }
            }
        }

        $monthStart = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth()->toDateTimeString();
        $monthEnd = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth()->toDateTimeString();

        // Targeted synchronization for PIBAL (PF duty range -> fallback to P -> observer)
        if (DB::getSchemaBuilder()->hasTable('data_pibal') && DB::getSchemaBuilder()->hasColumn('data_pibal', 'data_timestamp')) {
            $pibalRecords = DB::table('data_pibal')
                ->whereBetween('data_timestamp', [$monthStart, $monthEnd])
                ->get(['id', 'data_timestamp', 'observer_name']);

            foreach ($pibalRecords as $pibal) {
                $officer = $this->resolver->getPibalDutyOfficer($pibal->data_timestamp, 'UTC');

                DB::table('data_pibal')
                    ->where('id', $pibal->id)
                    ->update([
                        'pegawai_id' => $officer ? $officer->id : null,
                        'observer_name' => $officer ? $officer->nama : $pibal->observer_name,
                        'teknisi_id' => null,
                        'ppnpn_id' => null,
                    ]);
                $totalUpdated++;
            }
        }

        // Targeted synchronization for TAFOR (PF duty range -> fallback to P -> observer)
        if (DB::getSchemaBuilder()->hasTable('data_tafor') && DB::getSchemaBuilder()->hasColumn('data_tafor', 'data_timestamp')) {
            $taforRecords = DB::table('data_tafor')
                ->whereBetween('data_timestamp', [$monthStart, $monthEnd])
                ->get(['id', 'data_timestamp', 'observer_name']);

            foreach ($taforRecords as $tafor) {
                $officer = $this->resolver->getTaforDutyOfficer($tafor->data_timestamp, 'UTC');

                DB::table('data_tafor')
                    ->where('id', $tafor->id)
                    ->update([
                        'pegawai_id' => $officer ? $officer->id : null,
                        'observer_name' => $officer ? $officer->nama : $tafor->observer_name,
                        'teknisi_id' => null,
                        'ppnpn_id' => null,
                    ]);
                $totalUpdated++;
            }
        }

        $duration = round(microtime(true) - $startTime, 3);
        Log::info("DutySyncService: Resynced observation data for {$bulan}/{$tahun} in {$duration}s ({$totalUpdated} DB rows updated).");

        return [
            'success' => true,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'duration_seconds' => $duration,
            'total_rows_updated' => $totalUpdated,
            'message' => "Sinkronisasi data pengamatan dengan jadwal dinas bulan {$bulan}/{$tahun} berhasil diselesaikan.",
        ];
    }
}
