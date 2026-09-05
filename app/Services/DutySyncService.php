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
            'data_tafor' => 'data_timestamp',
            'data_pibal' => 'data_timestamp',
            'data_fklim' => 'data_timestamp',
            'data_met_report' => 'data_timestamp',
            'data_flight_document' => 'departure_at',
        ];

        $totalUpdated = 0;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $day);

            // Shift windows in WIT (Asia/Jayapura)
            // 1. Shift Pagi: 07:00 to 13:30 WIT -> UTC: (Date - 1 day) 22:00:00 to (Date) 04:30:00
            // 2. Shift Siang: 13:30 to 19:30 WIT -> UTC: (Date) 04:30:00 to (Date) 10:30:00
            // 3. Shift Malam: 19:30 to 07:00 WIT (next day) -> UTC: (Date) 10:30:00 to (Date + 1 day) 22:00:00

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
