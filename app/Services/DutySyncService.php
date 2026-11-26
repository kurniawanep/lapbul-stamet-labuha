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

        $this->resolver->resetCache();
        $monthStart = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $monthEnd = Carbon::createFromDate($tahun, $bulan, $daysInMonth)->endOfMonth();
        $this->resolver->prewarm($monthStart->copy()->subDays(2), $monthEnd->copy()->addDays(2));

        $utcMonthStart = sprintf('%04d-%02d-01 00:00:00', $tahun, $bulan);
        $utcMonthEnd = sprintf('%04d-%02d-%02d 23:59:59', $tahun, $bulan, $daysInMonth);
        $witDay1StartInUtc = Carbon::create($tahun, $bulan, 1, 0, 0, 0, 'Asia/Jayapura')
            ->setTimezone('UTC')
            ->toDateTimeString();

        $schema = DB::getSchemaBuilder();
        $resolvedByTs = [];

        foreach ($tableTimestampMap as $table => $timestampCol) {
            if (!$schema->hasTable($table) || !$schema->hasColumn($table, $timestampCol)) {
                continue;
            }

            $hasObserverNameCol = $schema->hasColumn($table, 'observer_name');
            $records = DB::table($table)
                ->whereBetween($timestampCol, [$witDay1StartInUtc, $utcMonthEnd])
                ->get(['id', $timestampCol]);

            $batches = [];
            foreach ($records as $record) {
                $rawTs = $record->{$timestampCol};
                if (empty($rawTs)) {
                    continue;
                }

                $ts = is_string($rawTs) ? $rawTs : (string) $rawTs;
                if (!isset($resolvedByTs[$ts])) {
                    $resolvedByTs[$ts] = [
                        'observer' => $this->resolver->getObserverByTimestamp($ts, 'UTC'),
                        'teknisi' => $this->resolver->getTeknisiByTimestamp($ts, 'UTC'),
                        'ppnpn' => $this->resolver->getPpnpnByTimestamp($ts, 'UTC'),
                    ];
                }

                $resolved = $resolvedByTs[$ts];
                $observer = $resolved['observer'];
                $teknisi = $resolved['teknisi'];
                $ppnpn = $resolved['ppnpn'];

                // Do not clobber previous UTC month tail records if no schedule exists for that hour.
                if ($ts < $utcMonthStart && !$observer && !$teknisi && !$ppnpn) {
                    continue;
                }

                $key = ($observer ? $observer->id : 'n')
                    . '|' . ($teknisi ? $teknisi->id : 'n')
                    . '|' . ($ppnpn ? $ppnpn->id : 'n');

                if (!isset($batches[$key])) {
                    $payload = [
                        'pegawai_id' => $observer ? $observer->id : null,
                        'teknisi_id' => $teknisi ? $teknisi->id : null,
                        'ppnpn_id' => $ppnpn ? $ppnpn->id : null,
                    ];
                    if ($hasObserverNameCol) {
                        $payload['observer_name'] = $observer ? $observer->nama : null;
                    }
                    $batches[$key] = [
                        'payload' => $payload,
                        'ids' => [],
                    ];
                }

                $batches[$key]['ids'][] = $record->id;
            }

            foreach ($batches as $batch) {
                foreach (array_chunk($batch['ids'], 500) as $idChunk) {
                    $count = DB::table($table)
                        ->whereIn('id', $idChunk)
                        ->update($batch['payload']);
                    $totalUpdated += $count;
                }
            }
        }

        $monthStart = $utcMonthStart;
        $monthEnd = $utcMonthEnd;

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
