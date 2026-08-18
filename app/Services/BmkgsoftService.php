<?php

namespace App\Services;

use App\Models\DataMetar;
use App\Models\DataPibal;
use App\Models\DataSinoptik;
use App\Models\DataTafor;
use Carbon\Carbon;
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
     * Get bearer authentication token from BMKGSoft API.
     */
    public function getToken(): ?string
    {
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
                return $response->json('data.token');
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
                ->timeout(20)
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

            $pegawai = $this->observerResolver->resolvePegawai($timestamp, $observerName);

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
                ->timeout(15)
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

                $pegawai = $this->observerResolver->resolvePegawai($timestamp, $observerName);

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
                            'observer_name' => $pegawai ? $pegawai->nama : ($observerName ?? null),
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
                ->timeout(15)
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

                $pegawai = $this->observerResolver->resolvePegawai($timestamp, $observerName);

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
                            'observer_name' => $pegawai ? $pegawai->nama : ($observerName ?? null),
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
                ->timeout(20)
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
     * Sync Synoptic observation data into data_sinoptik table using 10-day chunked looping.
     */
    public function syncSinoptikData(string $startDate, string $endDate, int $stationId = 138): array
    {
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

                $pegawai = $this->observerResolver->resolvePegawai($timestamp, $observerName);

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
                            'observer_name' => $pegawai ? $pegawai->nama : ($observerName ?? null),
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
