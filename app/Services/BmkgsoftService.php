<?php

namespace App\Services;

use App\Models\DataMetar;
use App\Models\DataPibal;
use App\Models\DataSinoptik;
use App\Models\DataTafor;
use Carbon\Carbon;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BmkgsoftService
{
    protected string $baseUrl;
    protected string $username;
    protected string $password;
    protected ObserverResolverService $observerResolver;

    public function __construct()
    {
        $this->baseUrl = config('services.bmkgsoft.base_url', 'https://bmkgsatu.bmkg.go.id');
        $this->username = config('services.bmkgsoft.username', '97460');
        $this->password = config('services.bmkgsoft.password', 'opr97460');
        $this->observerResolver = app(ObserverResolverService::class);
    }

    /**
     * Get bearer authentication token from BMKGSoft API (cached for 6 hours).
     */
    public function getToken(bool $forceRefresh = false): ?string
    {
        if ($forceRefresh) {
            Cache::forget('bmkgsoft_token');
        }

        return Cache::remember('bmkgsoft_token', now()->addHours(6), function () {
            try {
                $response = Http::withoutVerifying()
                    ->timeout(15)
                    ->withHeaders([
                        'accept' => 'application/json',
                        'content-type' => 'application/json',
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ])
                    ->post("{$this->baseUrl}/api/v21/user/session/login", [
                        'username' => $this->username,
                        'password' => $this->password,
                    ]);

                if ($response->successful()) {
                    $token = $response->json('data.token');
                    if ($token) {
                        return $token;
                    }
                }

                Log::error("BMKGSoft Login Failed", [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            } catch (\Exception $e) {
                Log::error("BMKGSoft Login Exception: " . $e->getMessage());
                return null;
            }
        });
    }

    /**
     * Fetch PIBAL observation data from BMKGSoft API using active type_name=Pibal endpoint.
     */
    public function fetchPibalDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $token = $this->getToken();
        if (!$token) {
            return [
                'success' => false,
                'data' => [],
                'error' => 'Gagal mendapatkan token otentikasi BMKGSoft.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/db/bmkgsatu/@export_data";
            $response = Http::withoutVerifying()
                ->retry(2, 500)
                ->timeout(30)
                ->withHeaders([
                    'accept' => 'application/json',
                    'Authorization' => "Bearer {$token}",
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url, [
                    'station_id' => $stationId,
                    'data_timestamp__gte' => $dateFrom,
                    'data_timestamp__lte' => $dateTo,
                    '_size' => 100,
                    'type_name' => 'Pibal',
                    '_metadata' => 'station_id,station_name,data_timestamp,alias_station_id,source_data,station_elevation,wind_dir_surface,wind_speed_surface,sandi_pibal,pembacaan_azimuth_elevasi[azimuth],pembacaan_azimuth_elevasi[elevasi],hasil_lapisan_wd_ws_dddff[lapisan],hasil_lapisan_wd_ws_dddff[wd],hasil_lapisan_wd_ws_dddff[ws],hasil_lapisan_wd_ws_dddff[dddff],penghentian_pengamatan,observer_name',
                ]);

            if ($response->status() === 401) {
                $token = $this->getToken(true);
                if ($token) {
                    $response = Http::withoutVerifying()
                        ->retry(2, 500)
                        ->timeout(30)
                        ->withHeaders([
                            'accept' => 'application/json',
                            'Authorization' => "Bearer {$token}",
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        ])
                        ->get($url, [
                            'station_id' => $stationId,
                            'data_timestamp__gte' => $dateFrom,
                            'data_timestamp__lte' => $dateTo,
                            '_size' => 100,
                            'type_name' => 'Pibal',
                            '_metadata' => 'station_id,station_name,data_timestamp,alias_station_id,source_data,station_elevation,wind_dir_surface,wind_speed_surface,sandi_pibal,pembacaan_azimuth_elevasi[azimuth],pembacaan_azimuth_elevasi[elevasi],hasil_lapisan_wd_ws_dddff[lapisan],hasil_lapisan_wd_ws_dddff[wd],hasil_lapisan_wd_ws_dddff[ws],hasil_lapisan_wd_ws_dddff[dddff],penghentian_pengamatan,observer_name',
                        ]);
                }
            }

            if ($response->successful()) {
                $payload = $response->json();
                return [
                    'success' => true,
                    'data' => is_array($payload) ? ($payload['data'] ?? $payload) : [],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "HTTP {$response->status()}: " . $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'data' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Sync PIBAL observation data into data_pibal table.
     */
    public function syncPibalData(string $startDate, string $endDate, int $stationId = 138): array
    {
        @set_time_limit(120);

        $fetchResult = $this->fetchPibalDataWithResult($startDate, $endDate, $stationId);

        if (!$fetchResult['success']) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Gagal mengambil data dari BMKGSoft API.',
                'error_reason' => $fetchResult['error'],
                'details' => [],
            ];
        }

        $items = $fetchResult['data'];
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($items as $item) {
            $timestamp = $item['data_timestamp'] ?? null;
            $observerName = $item['observer_name'] ?? null;

            if (!$timestamp) {
                $failedCount++;
                $details[] = [
                    'timestamp' => 'N/A',
                    'observer' => $observerName,
                    'status' => 'gagal',
                    'reason' => 'Missing data_timestamp field',
                ];
                continue;
            }

            $pegawai = $this->observerResolver->resolvePegawai($timestamp, $observerName, 'UTC');
            if (!$pegawai) {
                $pegawai = $this->observerResolver->getObserverByTimestamp($timestamp, 'UTC');
            }

            try {
                DataPibal::updateOrCreate(
                    [
                        'data_timestamp' => Carbon::parse($timestamp)->format('Y-m-d H:i:s'),
                    ],
                    [
                        'station_id' => $item['station_id'] ?? $stationId,
                        'alias_station_id' => $item['alias_station_id'] ?? 97460,
                        'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                        'wind_dir_surface' => $item['wind_dir_surface'] ?? null,
                        'wind_speed_surface' => $item['wind_speed_surface'] ?? null,
                        'station_elevation' => $item['station_elevation'] ?? null,
                        'raw_pibal' => $item['sandi_pibal'] ?? ($item['raw_pibal'] ?? null),
                        'sandi_pibal' => $item['sandi_pibal'] ?? null,
                        'penghentian_pengamatan' => $item['penghentian_pengamatan'] ?? null,
                        'hasil_lapisan_wd_ws_dddff' => $item['hasil_lapisan_wd_ws_dddff'] ?? null,
                        'pembacaan_azimuth_elevasi' => $item['pembacaan_azimuth_elevasi'] ?? null,
                        'observer_name' => $pegawai ? $pegawai->nama : ($observerName ?? null),
                        'pegawai_id' => $pegawai ? $pegawai->id : null,
                    ]
                );

                $syncedCount++;
                $details[] = [
                    'timestamp' => $timestamp,
                    'observer' => $pegawai ? $pegawai->nama : ($observerName ?? 'Unassigned'),
                    'status' => 'berhasil',
                    'reason' => null,
                ];
            } catch (\Exception $e) {
                $failedCount++;
                $details[] = [
                    'timestamp' => $timestamp,
                    'observer' => $observerName,
                    'status' => 'gagal',
                    'reason' => $e->getMessage(),
                ];
            }
        }

        // GTS Pilot Monitoring Enrichment Loop (Concurrent HTTP Pool)
        try {
            $token = $this->getToken();
            if ($token) {
                $start = Carbon::parse($startDate);
                $end = Carbon::parse($endDate);
                $maxMonDate = $end->gt(now()) ? now() : $end;

                $dates = [];
                $currentDate = $start->copy();
                while ($currentDate->lte($maxMonDate)) {
                    $dates[] = $currentDate->format('Y-m-d');
                    $currentDate->addDay();
                }

                $dateChunks = array_chunk($dates, 7);
                foreach ($dateChunks as $dateChunk) {
                    $responses = Http::pool(function (Pool $pool) use ($dateChunk, $token) {
                        $requests = [];
                        foreach ($dateChunk as $dateStr) {
                            $requests[$dateStr] = $pool->withoutVerifying()
                                ->timeout(10)
                                ->withHeaders([
                                    'accept' => 'application/json',
                                    'Authorization' => "Bearer {$token}",
                                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                ])
                                ->get("{$this->baseUrl}/api/v21/monitoring/gts/pilot/daily/date/{$dateStr}");
                        }
                        return $requests;
                    });

                    foreach ($responses as $resMon) {
                        if ($resMon instanceof \Illuminate\Http\Client\Response && $resMon->successful()) {
                            $monData = $resMon->json('data') ?? [];
                            $foundStn = null;
                            foreach ($monData as $stn) {
                                $stnStr = strtoupper(json_encode($stn));
                                if (str_contains($stnStr, '97460') || str_contains($stnStr, 'WAEL') || str_contains($stnStr, 'OESMAN') || str_contains($stnStr, 'LABUHA')) {
                                    $foundStn = $stn;
                                    break;
                                }
                            }

                            if ($foundStn) {
                                foreach ($foundStn as $field) {
                                    if (is_array($field) && isset($field['raw']) && is_array($field['raw']) && count($field['raw']) > 0) {
                                        $firstRaw = $field['raw'][0];
                                        $tsData = $firstRaw['timestamp_data'] ?? null;
                                        $tsSent = $firstRaw['timestamp_sent_data'] ?? null;

                                        if ($tsData && $tsSent) {
                                            $dtSlot = Carbon::parse($tsData)->setTimezone('UTC')->format('Y-m-d H:i:s');
                                            $dtSent = Carbon::parse($tsSent)->setTimezone('UTC')->format('Y-m-d H:i:s');
                                            $deltaMin = isset($firstRaw['delta_min']) ? (float) $firstRaw['delta_min'] : null;

                                            $status = 'tepat_waktu';
                                            $delayMinutes = 0;

                                            if ($deltaMin !== null) {
                                                if ($deltaMin >= 0 && $deltaMin <= 45) {
                                                    $status = 'tepat_waktu';
                                                } elseif ($deltaMin < 0) {
                                                    $status = 'lebih_awal';
                                                } else {
                                                    $status = 'terlambat';
                                                    $delayMinutes = max(1, (int) ceil($deltaMin - 45));
                                                }
                                            }

                                            $rec = DataPibal::where('data_timestamp', $dtSlot)->first();
                                            if ($rec) {
                                                $rec->update([
                                                    'received_timestamp' => $dtSent,
                                                    'sent_timestamp' => $dtSent,
                                                    'delta_min' => $deltaMin,
                                                    'monitoring_status' => $status,
                                                    'delay_minutes' => $delayMinutes,
                                                ]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("GTS Pilot monitoring enrichment error: " . $e->getMessage());
        }

        return [
            'success' => true,
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'total_fetched' => count($items),
            'message' => "Berhasil menyinkronkan {$syncedCount} dari " . count($items) . " data PIBAL.",
            'error_reason' => null,
            'details' => $details,
        ];
    }

    /**
     * Fetch TAFOR GTS observation data from BMKGSoft API v21 GTS Entry.
     */
    public function fetchTaforDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $token = $this->getToken();
        if (!$token) {
            return [
                'success' => false,
                'data' => [],
                'error' => 'Gagal mendapatkan token otentikasi BMKGSoft.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/api/v21/gts/entry";
            $response = Http::withoutVerifying()
                ->retry(2, 500)
                ->timeout(30)
                ->withHeaders([
                    'accept' => 'application/json',
                    'Authorization' => "Bearer {$token}",
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url, [
                    'start' => 0,
                    'size' => 100,
                    'type_message' => 'taf',
                    'cccc' => 'WAEL',
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'order_by' => 'data_timestamp',
                    'is_order_by_asc' => 'true',
                ]);

            if ($response->status() === 401) {
                $token = $this->getToken(true);
                if ($token) {
                    $response = Http::withoutVerifying()
                        ->retry(2, 500)
                        ->timeout(30)
                        ->withHeaders([
                            'accept' => 'application/json',
                            'Authorization' => "Bearer {$token}",
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        ])
                        ->get($url, [
                            'start' => 0,
                            'size' => 100,
                            'type_message' => 'taf',
                            'cccc' => 'WAEL',
                            'date_from' => $dateFrom,
                            'date_to' => $dateTo,
                            'order_by' => 'data_timestamp',
                            'is_order_by_asc' => 'true',
                        ]);
                }
            }

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json('data', []),
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "HTTP {$response->status()}: " . $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'data' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Sync TAFOR observation data into data_tafor table using 10-day chunked looping.
     */
    public function syncTaforData(string $startDate, string $endDate, int $stationId = 138): array
    {
        @set_time_limit(120);

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $totalSynced = 0;
        $totalFailed = 0;
        $totalFetched = 0;
        $allDetails = [];
        $overallError = null;

        $chunkStart = $start->copy();
        while ($chunkStart->lte($end)) {
            $chunkEnd = $chunkStart->copy()->addDays(9)->endOfDay();
            if ($chunkEnd->gt($end)) {
                $chunkEnd = $end->copy();
            }

            $dateFromStr = $chunkStart->format('Y-m-d\TH:i:s\Z');
            $dateToStr = $chunkEnd->format('Y-m-d\TH:i:s\Z');

            $fetchResult = $this->fetchTaforDataWithResult($dateFromStr, $dateToStr, $stationId);

            if (!$fetchResult['success']) {
                $overallError = $fetchResult['error'];
                break;
            }

            $items = $fetchResult['data'];
            $totalFetched += count($items);

            foreach ($items as $item) {
                $timestamp = $item['data_timestamp'] ?? null;
                $observerName = $item['sender_username'] ?? ($item['observer_name'] ?? null);

                if (!$timestamp) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => 'N/A',
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => 'Missing data_timestamp field',
                    ];
                    continue;
                }

                $pegawai = $this->observerResolver->getObserverByTimestamp($timestamp, 'UTC');

                try {
                    DataTafor::updateOrCreate(
                        [
                            'data_timestamp' => Carbon::parse($timestamp)->format('Y-m-d H:i:s'),
                        ],
                        [
                            'bmkgsoft_entry_id' => $item['id'] ?? null,
                            'station_id' => $item['bmkgsoft_id'] ?? $stationId,
                            'alias_station_id' => $item['station_wmo_id'] ?? 97460,
                            'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                            'cccc' => $item['cccc'] ?? 'WAEL',
                            'ttaaii' => $item['ttaaii'] ?? 'FTID40',
                            'type_message' => $item['type_message'] ?? 'taf',
                            'bbb' => $item['bbb'] ?? null,
                            'received_timestamp' => isset($item['received_timestamp']) ? Carbon::parse($item['received_timestamp'])->format('Y-m-d H:i:s') : null,
                            'sent_timestamp' => isset($item['sent_timestamp']) ? Carbon::parse($item['sent_timestamp'])->format('Y-m-d H:i:s') : null,
                            'sandi' => $item['sandi'] ?? null,
                            'status' => $item['status'] ?? 'sent',
                            'sender_username' => $item['sender_username'] ?? null,
                            'observer_name' => $pegawai ? $pegawai->nama : null,
                            'pegawai_id' => $pegawai ? $pegawai->id : null,
                        ]
                    );

                    $totalSynced++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $pegawai ? $pegawai->nama : ($observerName ?? 'Unassigned'),
                        'status' => 'berhasil',
                        'reason' => null,
                    ];
                } catch (\Exception $e) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => $e->getMessage(),
                    ];
                }
            }

            $chunkStart = $chunkEnd->copy()->addSecond();
        }

        if ($overallError && $totalSynced === 0) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Gagal mengambil data TAFOR dari BMKGSoft API.',
                'error_reason' => $overallError,
                'details' => [],
            ];
        }

        return [
            'success' => true,
            'synced_count' => $totalSynced,
            'failed_count' => $totalFailed,
            'total_fetched' => $totalFetched,
            'message' => "Berhasil menyinkronkan {$totalSynced} dari {$totalFetched} data TAFOR.",
            'error_reason' => $overallError,
            'details' => $allDetails,
        ];
    }

    /**
     * Fetch METAR GTS observation data from BMKGSoft API v21 GTS Entry.
     */
    public function fetchMetarDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $token = $this->getToken();
        if (!$token) {
            return [
                'success' => false,
                'data' => [],
                'error' => 'Gagal mendapatkan token otentikasi BMKGSoft.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/api/v21/gts/entry";
            $response = Http::withoutVerifying()
                ->retry(2, 500)
                ->timeout(30)
                ->withHeaders([
                    'accept' => 'application/json',
                    'Authorization' => "Bearer {$token}",
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url, [
                    'start' => 0,
                    'size' => 100,
                    'type_message' => 'metar',
                    'cccc' => 'WAEL',
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'order_by' => 'data_timestamp',
                    'is_order_by_asc' => 'true',
                ]);

            if ($response->status() === 401) {
                $token = $this->getToken(true);
                if ($token) {
                    $response = Http::withoutVerifying()
                        ->retry(2, 500)
                        ->timeout(30)
                        ->withHeaders([
                            'accept' => 'application/json',
                            'Authorization' => "Bearer {$token}",
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        ])
                        ->get($url, [
                            'start' => 0,
                            'size' => 100,
                            'type_message' => 'metar',
                            'cccc' => 'WAEL',
                            'date_from' => $dateFrom,
                            'date_to' => $dateTo,
                            'order_by' => 'data_timestamp',
                            'is_order_by_asc' => 'true',
                        ]);
                }
            }

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json('data', []),
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "HTTP {$response->status()}: " . $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'data' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Sync METAR observation data into data_metar table using 2-day chunked looping.
     */
    public function syncMetarData(string $startDate, string $endDate, int $stationId = 138): array
    {
        @set_time_limit(120);

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $totalSynced = 0;
        $totalFailed = 0;
        $totalFetched = 0;
        $allDetails = [];
        $overallError = null;

        $chunkStart = $start->copy();
        while ($chunkStart->lte($end)) {
            $chunkEnd = $chunkStart->copy()->addDays(1)->endOfDay();
            if ($chunkEnd->gt($end)) {
                $chunkEnd = $end->copy();
            }

            $dateFromStr = $chunkStart->format('Y-m-d\TH:i:s\Z');
            $dateToStr = $chunkEnd->format('Y-m-d\TH:i:s\Z');

            $fetchResult = $this->fetchMetarDataWithResult($dateFromStr, $dateToStr, $stationId);

            if (!$fetchResult['success']) {
                $overallError = $fetchResult['error'];
                break;
            }

            $items = $fetchResult['data'];
            $totalFetched += count($items);

            foreach ($items as $item) {
                $timestamp = $item['data_timestamp'] ?? null;
                $observerName = $item['sender_username'] ?? ($item['observer_name'] ?? null);

                if (!$timestamp) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => 'N/A',
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => 'Missing data_timestamp field',
                    ];
                    continue;
                }

                $pegawai = $this->observerResolver->getObserverByTimestamp($timestamp, 'UTC');

                try {
                    DataMetar::updateOrCreate(
                        [
                            'data_timestamp' => Carbon::parse($timestamp)->format('Y-m-d H:i:s'),
                        ],
                        [
                            'bmkgsoft_entry_id' => $item['id'] ?? null,
                            'station_id' => $item['bmkgsoft_id'] ?? $stationId,
                            'alias_station_id' => $item['station_wmo_id'] ?? 97460,
                            'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                            'cccc' => $item['cccc'] ?? 'WAEL',
                            'ttaaii' => $item['ttaaii'] ?? 'SAID40',
                            'type_message' => $item['type_message'] ?? 'metar',
                            'bbb' => $item['bbb'] ?? null,
                            'received_timestamp' => isset($item['received_timestamp']) ? Carbon::parse($item['received_timestamp'])->format('Y-m-d H:i:s') : null,
                            'sent_timestamp' => isset($item['sent_timestamp']) ? Carbon::parse($item['sent_timestamp'])->format('Y-m-d H:i:s') : null,
                            'sandi' => $item['sandi'] ?? null,
                            'status' => $item['status'] ?? 'sent',
                            'sender_username' => $item['sender_username'] ?? null,
                            'observer_name' => $pegawai ? $pegawai->nama : null,
                            'pegawai_id' => $pegawai ? $pegawai->id : null,
                        ]
                    );

                    $totalSynced++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $pegawai ? $pegawai->nama : ($observerName ?? 'Unassigned'),
                        'status' => 'berhasil',
                        'reason' => null,
                    ];
                } catch (\Exception $e) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => $e->getMessage(),
                    ];
                }
            }

            $chunkStart = $chunkEnd->copy()->addSecond();
        }

        // Enrich delay/transmission timestamps from GTS METAR daily monitoring endpoint (Concurrent HTTP Pool)
        try {
            $token = $this->getToken();
            if ($token) {
                $start = Carbon::parse($startDate);
                $end = Carbon::parse($endDate);
                $maxMonDate = $end->gt(now()) ? now() : $end;

                $dates = [];
                $currentDate = $start->copy();
                while ($currentDate->lte($maxMonDate)) {
                    $dates[] = $currentDate->format('Y-m-d');
                    $currentDate->addDay();
                }

                $dateChunks = array_chunk($dates, 7);
                foreach ($dateChunks as $dateChunk) {
                    $responses = Http::pool(function (Pool $pool) use ($dateChunk, $token) {
                        $requests = [];
                        foreach ($dateChunk as $dateStr) {
                            $requests[$dateStr] = $pool->withoutVerifying()
                                ->timeout(10)
                                ->withHeaders([
                                    'accept' => 'application/json',
                                    'Authorization' => "Bearer {$token}",
                                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                ])
                                ->get("{$this->baseUrl}/api/v21/monitoring/gts/metar/daily/date/{$dateStr}");
                        }
                        return $requests;
                    });

                    foreach ($responses as $resMon) {
                        if ($resMon instanceof \Illuminate\Http\Client\Response && $resMon->successful()) {
                            $monData = $resMon->json('data') ?? [];
                            $foundStn = null;
                            foreach ($monData as $stn) {
                                $stnStr = strtoupper(json_encode($stn));
                                if (str_contains($stnStr, '97460') || str_contains($stnStr, 'WAEL') || str_contains($stnStr, 'OESMAN') || str_contains($stnStr, 'LABUHA')) {
                                    $foundStn = $stn;
                                    break;
                                }
                            }

                            if ($foundStn) {
                                foreach ($foundStn as $field) {
                                    if (isset($field['raw']) && is_array($field['raw']) && count($field['raw']) > 0) {
                                        // Always use the FIRST transmission time (field['raw'][0])
                                        $firstRaw = $field['raw'][0];
                                        $tsData = $firstRaw['timestamp_data'] ?? null;
                                        $tsSent = $firstRaw['timestamp_sent_data'] ?? null;

                                        if ($tsData && $tsSent) {
                                            $dtSlot = Carbon::parse($tsData)->setTimezone('UTC')->format('Y-m-d H:i:s');
                                            $dtSent = Carbon::parse($tsSent)->setTimezone('UTC')->format('Y-m-d H:i:s');

                                            $rec = DataMetar::where('data_timestamp', $dtSlot)->first();
                                            if ($rec) {
                                                $rec->update([
                                                    'received_timestamp' => $dtSent,
                                                    'sent_timestamp' => $dtSent,
                                                ]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("GTS METAR monitoring enrichment error: " . $e->getMessage());
        }

        if ($overallError && $totalSynced === 0) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Gagal mengambil data METAR dari BMKGSoft API.',
                'error_reason' => $overallError,
                'details' => [],
            ];
        }

        return [
            'success' => true,
            'synced_count' => $totalSynced,
            'failed_count' => $totalFailed,
            'total_fetched' => $totalFetched,
            'message' => "Berhasil menyinkronkan {$totalSynced} dari {$totalFetched} data METAR.",
            'error_reason' => $overallError,
            'details' => $allDetails,
        ];
    }

    /**
     * Fetch Synoptic observation data from BMKGSoft API v21 export preview.
     */
    public function fetchSinoptikDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $token = $this->getToken();
        if (!$token) {
            return [
                'success' => false,
                'data' => [],
                'error' => 'Gagal mendapatkan token otentikasi BMKGSoft.',
            ];
        }

        try {
            $url = "{$this->baseUrl}/api/v21/export/observation/by-station/preview";
            $response = Http::withoutVerifying()
                ->retry(2, 500)
                ->timeout(30)
                ->withHeaders([
                    'accept' => 'application/json',
                    'content-type' => 'application/json',
                    'Authorization' => "Bearer {$token}",
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->post($url, [
                    'station_id' => [$stationId],
                    'data_type' => 'sinoptik',
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ]);

            if ($response->status() === 401) {
                // Token might be expired, force refresh once
                $token = $this->getToken(true);
                if ($token) {
                    $response = Http::withoutVerifying()
                        ->retry(2, 500)
                        ->timeout(30)
                        ->withHeaders([
                            'accept' => 'application/json',
                            'content-type' => 'application/json',
                            'Authorization' => "Bearer {$token}",
                            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        ])
                        ->post($url, [
                            'station_id' => [$stationId],
                            'data_type' => 'sinoptik',
                            'date_from' => $dateFrom,
                            'date_to' => $dateTo,
                        ]);
                }
            }

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json('data', []),
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "HTTP {$response->status()}: " . $response->body(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'data' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Sync Synoptic observation data into data_sinoptik table using chunked looping.
     */
    public function syncSinoptikData(string $startDate, string $endDate, int $stationId = 138): array
    {
        @set_time_limit(120);

        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $totalSynced = 0;
        $totalFailed = 0;
        $totalFetched = 0;
        $allDetails = [];
        $overallError = null;

        $chunkStart = $start->copy();
        while ($chunkStart->lte($end)) {
            $chunkEnd = $chunkStart->copy()->addDays(3)->endOfDay();
            if ($chunkEnd->gt($end)) {
                $chunkEnd = $end->copy();
            }

            $dateFromStr = $chunkStart->format('Y-m-d\TH:i:s\Z');
            $dateToStr = $chunkEnd->format('Y-m-d\TH:i:s\Z');

            $fetchResult = $this->fetchSinoptikDataWithResult($dateFromStr, $dateToStr, $stationId);

            if (!$fetchResult['success']) {
                $overallError = $fetchResult['error'];
                break;
            }

            $payloadData = $fetchResult['data'];
            $headersList = $payloadData['headers'] ?? [];
            $rowsList = $payloadData['rows'] ?? ($payloadData['data'] ?? []);

            $totalFetched += count($rowsList);

            $headerMap = array_flip($headersList);

            $getValue = function (array $row, string $key) use ($headerMap) {
                if (isset($headerMap[$key])) {
                    $colIdx = $headerMap[$key];
                    return $row[$colIdx] ?? null;
                }
                return null;
            };

            foreach ($rowsList as $row) {
                $timestamp = $getValue($row, 'data_timestamp');
                $observerName = $getValue($row, 'observer_name');
                $sandiRaw = $getValue($row, 'edited_encoded_synop') ?? $getValue($row, 'encoded_synop');

                if (!$timestamp) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => 'N/A',
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => 'Missing data_timestamp field',
                    ];
                    continue;
                }

                $pegawai = $this->observerResolver->getObserverByTimestamp($timestamp, 'UTC');

                try {
                    DataSinoptik::updateOrCreate(
                        [
                            'data_timestamp' => Carbon::parse($timestamp)->format('Y-m-d H:i:s'),
                        ],
                        [
                            'station_id' => $stationId,
                            'station_name' => $getValue($row, 'station_name') ?? 'Stasiun Meteorologi Oesman Sadik',
                            'sandi' => $sandiRaw,
                            'temp_drybulb' => $getValue($row, 'temp_drybulb_c_tttttt'),
                            'temp_max' => $getValue($row, 'temp_max_c_txtxtx'),
                            'temp_min' => $getValue($row, 'temp_min_c_tntntn'),
                            'temp_wetbulb' => $getValue($row, 'temp_wetbulb_c'),
                            'temp_dewpoint' => $getValue($row, 'temp_dewpoint_c_tdtdtd'),
                            'humidity' => $getValue($row, 'relative_humidity_pc'),
                            'pressure_qff' => $getValue($row, 'pressure_qff_mb_derived'),
                            'pressure_qfe' => $getValue($row, 'pressure_qfe_mb_derived'),
                            'wind_dir' => $getValue($row, 'wind_dir_deg_dd'),
                            'wind_speed' => $getValue($row, 'wind_speed_ff'),
                            'visibility' => $getValue($row, 'visibility_vv'),
                            'rainfall' => $getValue($row, 'rainfall_last_mm'),
                            'cloud_cover' => $getValue($row, 'cloud_cover_oktas_m'),
                            'observer_name' => $pegawai ? $pegawai->nama : null,
                            'pegawai_id' => $pegawai ? $pegawai->id : null,

                            // Weather & Indicators
                            'present_weather_ww' => $getValue($row, 'present_weather_ww'),
                            'past_weather_w1' => $getValue($row, 'past_weather_w1'),
                            'past_weather_w2' => $getValue($row, 'past_weather_w2'),
                            'wind_indicator_iw' => $getValue($row, 'wind_indicator_iw'),
                            'weather_indicator_ix' => $getValue($row, 'weather_indicator_ix'),
                            'rainfall_indicator_ir' => $getValue($row, 'rainfall_indicator_ir'),

                            // Pressure details
                            'pressure_reading_mb' => $getValue($row, 'pressure_reading_mb'),
                            'pressure_temp_c' => $getValue($row, 'pressure_temp_c'),
                            'pressure_3h_diff_ppp' => $getValue($row, 'pressure_3h_diff_mb_ppp'),
                            'pressure_24h_diff_p24' => $getValue($row, 'pressure_24h_diff_mb_p24'),

                            // Cloud Types & Cover
                            'cloud_low_type_cl' => $getValue($row, 'cloud_low_type_cl'),
                            'cloud_med_type_cm' => $getValue($row, 'cloud_med_type_cm'),
                            'cloud_high_type_ch' => $getValue($row, 'cloud_high_type_ch'),
                            'cloud_low_cover_oktas' => $getValue($row, 'cloud_low_cover_oktas'),
                            'cloud_med_cover_oktas' => $getValue($row, 'cloud_med_cover_oktas'),
                            'cloud_high_cover_oktas' => $getValue($row, 'cloud_high_cover_oktas'),

                            // Cloud Layers
                            'cloud_layer_1_type' => $getValue($row, 'cloud_layer_1_type_c'),
                            'cloud_layer_1_height' => $getValue($row, 'cloud_layer_1_height_m_hshs'),
                            'cloud_layer_1_amt' => $getValue($row, 'cloud_layer_1_amt_oktas_ns'),

                            'cloud_layer_2_type' => $getValue($row, 'cloud_layer_2_type_c'),
                            'cloud_layer_2_height' => $getValue($row, 'cloud_layer_2_height_m_hshs'),
                            'cloud_layer_2_amt' => $getValue($row, 'cloud_layer_2_amt_oktas_ns'),

                            'cloud_layer_3_type' => $getValue($row, 'cloud_layer_3_type_c'),
                            'cloud_layer_3_height' => $getValue($row, 'cloud_layer_3_height_m_hshs'),
                            'cloud_layer_3_amt' => $getValue($row, 'cloud_layer_3_amt_oktas_ns'),

                            'cloud_layer_4_type' => $getValue($row, 'cloud_layer_4_type_c'),
                            'cloud_layer_4_height' => $getValue($row, 'cloud_layer_4_height_m_hshs'),
                            'cloud_layer_4_amt' => $getValue($row, 'cloud_layer_4_amt_oktas_ns'),

                            // Rainfall periods
                            'rainfall_6h_rrr' => $getValue($row, 'rainfall_6h_rrr'),
                            'rainfall_24h_rrrr' => $getValue($row, 'rainfall_24h_rrrr'),

                            // Solar, Sunshine, Evaporation & Land
                            'solar_rad_24h' => $getValue($row, 'solar_rad_24h_jcm2_f24'),
                            'sunshine_hours' => $getValue($row, 'sunshine_h_sss'),
                            'evaporation_24h' => $getValue($row, 'evaporation_24hours_mm_eee'),
                            'evaporation_indicator_ie' => $getValue($row, 'evaporation_eq_indicator_ie'),
                            'land_cond' => $getValue($row, 'land_cond'),
                            'land_note' => $getValue($row, 'land_note'),

                            // Encoded Synop
                            'encoded_synop' => $getValue($row, 'encoded_synop'),
                        ]
                    );

                    $totalSynced++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $pegawai ? $pegawai->nama : ($observerName ?? 'Unassigned'),
                        'status' => 'berhasil',
                        'reason' => null,
                    ];
                } catch (\Exception $e) {
                    $totalFailed++;
                    $allDetails[] = [
                        'timestamp' => $timestamp,
                        'observer' => $observerName,
                        'status' => 'gagal',
                        'reason' => $e->getMessage(),
                    ];
                }
            }

            $chunkStart = $chunkEnd->copy()->addSecond();
        }

        // GTS Synoptic Monitoring Enrichment Loop (Concurrent HTTP Pool)
        try {
            $token = $this->getToken();
            if ($token) {
                $start = Carbon::parse($startDate);
                $end = Carbon::parse($endDate);
                $maxMonDate = $end->gt(now()) ? now() : $end;

                $dates = [];
                $currentDate = $start->copy();
                while ($currentDate->lte($maxMonDate)) {
                    $dates[] = $currentDate->format('Y-m-d');
                    $currentDate->addDay();
                }

                $dateChunks = array_chunk($dates, 7);
                foreach ($dateChunks as $dateChunk) {
                    $responses = Http::pool(function (Pool $pool) use ($dateChunk, $token) {
                        $requests = [];
                        foreach ($dateChunk as $dateStr) {
                            $requests[$dateStr] = $pool->withoutVerifying()
                                ->timeout(10)
                                ->withHeaders([
                                    'accept' => 'application/json',
                                    'Authorization' => "Bearer {$token}",
                                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                ])
                                ->get("{$this->baseUrl}/api/v21/monitoring/gts/synoptic/daily/date/{$dateStr}");
                        }
                        return $requests;
                    });

                    foreach ($responses as $resMon) {
                        if ($resMon instanceof \Illuminate\Http\Client\Response && $resMon->successful()) {
                            $monData = $resMon->json('data') ?? [];
                            $foundStn = null;
                            foreach ($monData as $stn) {
                                $stnStr = strtoupper(json_encode($stn));
                                if (str_contains($stnStr, '97460') || str_contains($stnStr, 'WAEL') || str_contains($stnStr, 'OESMAN') || str_contains($stnStr, 'LABUHA')) {
                                    $foundStn = $stn;
                                    break;
                                }
                            }

                            if ($foundStn) {
                                foreach ($foundStn as $field) {
                                    if (is_array($field) && isset($field['raw']) && is_array($field['raw']) && count($field['raw']) > 0) {
                                        $firstRaw = $field['raw'][0];
                                        $tsData = $firstRaw['timestamp_data'] ?? null;
                                        $tsSent = $firstRaw['timestamp_sent_data'] ?? null;
                                        $deltaMin = isset($firstRaw['delta_min']) ? (float) $firstRaw['delta_min'] : null;

                                        if ($tsData && $tsSent) {
                                            $dtSlot = Carbon::parse($tsData)->setTimezone('UTC')->format('Y-m-d H:i:s');
                                            $dtSent = Carbon::parse($tsSent)->setTimezone('UTC')->format('Y-m-d H:i:s');

                                            $status = 'tepat_waktu';
                                            $delayMinutes = 0;

                                            if ($deltaMin !== null) {
                                                if ($deltaMin >= -10 && $deltaMin <= 15) {
                                                    $status = 'tepat_waktu';
                                                } elseif ($deltaMin < -10) {
                                                    $status = 'lebih_awal';
                                                } else {
                                                    $status = 'terlambat';
                                                    $delayMinutes = max(1, (int) ceil($deltaMin - 15));
                                                }
                                            }

                                            $rec = DataSinoptik::where('data_timestamp', $dtSlot)->first();
                                            if ($rec) {
                                                $rec->update([
                                                    'received_timestamp' => $dtSent,
                                                    'sent_timestamp' => $dtSent,
                                                    'delta_min' => $deltaMin,
                                                    'monitoring_status' => $status,
                                                    'delay_minutes' => $delayMinutes,
                                                ]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("GTS Synoptic monitoring enrichment error: " . $e->getMessage());
        }

        if ($overallError && $totalSynced === 0) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Gagal mengambil data Sinoptik dari BMKGSoft API.',
                'error_reason' => $overallError,
                'details' => [],
            ];
        }

        return [
            'success' => true,
            'synced_count' => $totalSynced,
            'failed_count' => $totalFailed,
            'total_fetched' => $totalFetched,
            'message' => "Berhasil menyinkronkan {$totalSynced} dari {$totalFetched} data Sinoptik.",
            'error_reason' => $overallError,
            'details' => $allDetails,
        ];
    }
}
