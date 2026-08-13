<?php

namespace App\Services;

use App\Models\DataMetar;
use App\Models\DataPibal;
use App\Models\DataTafor;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BmkgsoftService
{
    protected string $baseUrl = 'https://bmkgsatu.bmkg.go.id';

    /**
     * Get JWT token for BMKGSoft API.
     */
    protected function getToken(): ?string
    {
        $cachedToken = Cache::get('bmkgsoft_bearer_token');
        if ($cachedToken) {
            return $cachedToken;
        }

        $username = config('services.bmkgsoft.username', env('BMKGSOFT_USERNAME', '97460'));
        $password = config('services.bmkgsoft.password', env('BMKGSOFT_PASSWORD', 'opr97460'));

        if (empty($password)) {
            return env('BMKGSOFT_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODY1ODk5MTAsImlhdCI6MTc4NjQxNzEwNSwiaWQiOiI5NzQ6MCIsImlzcyI6ImdvLWJta2dzb2Z0IiwicGVybXMiOlsic3RhX21vZCIsInN0YV92dyIsInN0YV9lbGVtIiwiZGF0YV9leHBvcnQiLCJkYXRhX3JlcG9ydCIsImRhdGFfdml6IiwiZGF0YV9tb24iLCJxY19jb25mIiwicWNfbW9uaXRvciIsImVudHJ5X2FkZCIsImVudHJ5X3Z3IiwiZW50cnlfZWRpdCJdLCJyb2xlX25hbWUiOiJzdGFzaXVuIiwic3ViIjoiOTc06MCIsInVpZCI6MjI5fQ.y6a3p2Ik5XVjq2HOZBnDCtYoy0Hx7HZonBOJne2Zok8');
        }

        try {
            $response = Http::withoutVerifying()
                ->timeout(10)
                ->withHeaders([
                    'accept' => 'application/json',
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ])
                ->post("{$this->baseUrl}/api/v21/user/session/login", [
                    'username' => $username,
                    'password' => $password,
                ]);

            if ($response->successful()) {
                $token = $response->json('data.token') ?? $response->json('token');
                if ($token) {
                    Cache::put('bmkgsoft_bearer_token', $token, 86000);
                    return $token;
                }
            }
        } catch (\Throwable $e) {
            Log::error("BMKGSoft login failed: " . $e->getMessage());
        }

        return env('BMKGSOFT_TOKEN');
    }

    /**
     * Fetch PIBAL raw data from BMKGSoft API and return detailed result array.
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
                ->timeout(15)
                ->withHeaders([
                    'accept' => 'application/json',
                    'Authorization' => "Bearer {$token}",
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url, [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'station_id' => $stationId,
                    'type_data' => 'pibal',
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'data' => is_array($data) ? $data : [],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "API BMKGSoft merespon dengan status HTTP {$response->status()}",
            ];
        } catch (\Throwable $e) {
            Log::error("Fetch PIBAL data failed: " . $e->getMessage());
            return [
                'success' => false,
                'data' => [],
                'error' => "Koneksi ke API BMKGSoft gagal: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch PIBAL raw data from BMKGSoft API.
     */
    public function fetchPibalData(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $res = $this->fetchPibalDataWithResult($dateFrom, $dateTo, $stationId);
        return $res['data'];
    }

    /**
     * Fetch and synchronize PIBAL data into data_pibal table with sync status details.
     */
    public function syncPibalData(string $dateFrom, string $dateTo, int $stationId = 138): array
    {
        $fetchResult = $this->fetchPibalDataWithResult($dateFrom, $dateTo, $stationId);
        if (!$fetchResult['success']) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => $fetchResult['error'],
                'error_reason' => $fetchResult['error'],
                'details' => [],
            ];
        }

        $records = $fetchResult['data'];
        if (empty($records)) {
            return [
                'success' => true,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Tidak ada data PIBAL ditemukan dari BMKGSoft API untuk periode ini.',
                'error_reason' => null,
                'details' => [],
            ];
        }

        $pegawais = Pegawai::all();
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($records as $item) {
            if (empty($item['data_timestamp'])) {
                $failedCount++;
                $details[] = [
                    'timestamp' => 'Tanpa Timestamp',
                    'observer' => $item['observer_name'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Attribute data_timestamp tidak ditemukan pada data BMKGSoft API.',
                ];
                continue;
            }

            try {
                $utcTimestamp = Carbon::parse($item['data_timestamp'], 'UTC')->toDateTimeString();
            } catch (\Throwable $e) {
                $failedCount++;
                $details[] = [
                    'timestamp' => $item['data_timestamp'],
                    'observer' => $item['observer_name'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Format timestamp dari API tidak valid.',
                ];
                continue;
            }

            $observerName = trim($item['observer_name'] ?? '');
            $matchedPegawaiId = null;
            $reasons = [];

            if ($observerName) {
                $matched = $pegawais->first(function ($p) use ($observerName) {
                    return strcasecmp($p->nama, $observerName) === 0 ||
                           stripos($p->nama, $observerName) !== false ||
                           stripos($observerName, $p->nama) !== false;
                });
                if ($matched) {
                    $matchedPegawaiId = $matched->id;
                } else {
                    $reasons[] = "Observer '{$observerName}' tidak ditemukan pada Master Pegawai Stasiun";
                }
            } else {
                $reasons[] = "Nama Observer kosong/tidak diisi dari BMKGSoft";
            }

            $sandiText = trim($item['sandi_pibal'] ?? '');
            $penghentian = trim($item['penghentian_pengamatan'] ?? '');

            if (empty($sandiText) && empty($penghentian)) {
                $reasons[] = "Sandi PIBAL dan alasan penghentian keduanya tidak tersedia";
            }

            $isSuccess = empty($reasons);

            DataPibal::updateOrCreate(
                ['data_timestamp' => $utcTimestamp],
                [
                    'station_id' => $item['station_id'] ?? 138,
                    'alias_station_id' => $item['alias_station_id'] ?? 97460,
                    'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                    'observer_name' => $observerName ?: null,
                    'pegawai_id' => $matchedPegawaiId,
                    'wind_dir_surface' => isset($item['wind_dir_surface']) ? (float) $item['wind_dir_surface'] : null,
                    'wind_speed_surface' => isset($item['wind_speed_surface']) ? (float) $item['wind_speed_surface'] : null,
                    'station_elevation' => $item['station_elevation'] ?? null,
                    'sandi_pibal' => $sandiText ?: null,
                    'penghentian_pengamatan' => $penghentian ?: null,
                    'pembacaan_azimuth_elevasi' => $item['pembacaan_azimuth_elevasi'] ?? null,
                    'hasil_lapisan_wd_ws_dddff' => $item['hasil_lapisan_wd_ws_dddff'] ?? null,
                ]
            );

            if ($isSuccess) {
                $syncedCount++;
            } else {
                $failedCount++;
            }

            $details[] = [
                'timestamp' => $utcTimestamp,
                'observer' => $observerName ?: 'Unassigned',
                'status' => $isSuccess ? 'berhasil' : 'gagal',
                'reason' => empty($reasons) ? 'Data PIBAL tersimpan dengan sukses' : implode('; ', $reasons),
            ];
        }

        $totalFetched = count($records);
        $message = "Hasil Sinkronisasi BMKGSoft: Total {$totalFetched} data diterima ({$syncedCount} Berhasil" . ($failedCount > 0 ? ", {$failedCount} Gagal/Peringatan" : "") . ").";

        return [
            'success' => true,
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'total_fetched' => $totalFetched,
            'message' => $message,
            'error_reason' => $failedCount > 0 ? "Ada {$failedCount} data yang memerlukan perhatian" : null,
            'details' => $details,
        ];
    }

    /**
     * Fetch TAFOR raw data from BMKGSoft API for a specific date range.
     */
    public function fetchTaforDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138, string $cccc = 'WAEL'): array
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
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                ])
                ->get($url, [
                    'start' => 0,
                    'size' => 100,
                    'type_message' => 'taf',
                    'cccc' => $cccc,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'order_by' => 'data_timestamp',
                    'is_order_by_asc' => 'false',
                ]);

            if ($response->successful()) {
                $json = $response->json();
                $data = $json['data'] ?? [];
                return [
                    'success' => true,
                    'data' => is_array($data) ? $data : [],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "API BMKGSoft merespon dengan status HTTP {$response->status()}",
            ];
        } catch (\Throwable $e) {
            Log::error("Fetch TAFOR data failed: " . $e->getMessage());
            return [
                'success' => false,
                'data' => [],
                'error' => "Koneksi ke API BMKGSoft gagal: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch and synchronize TAFOR data in 10-day chunks into data_tafor table.
     */
    public function syncTaforData(string $dateFrom, string $dateTo, int $stationId = 138, string $cccc = 'WAEL'): array
    {
        $startCarbon = Carbon::parse($dateFrom);
        $endCarbon = Carbon::parse($dateTo);

        $records = [];
        $fetchedIds = [];
        $lastError = null;

        $currentStart = $startCarbon->copy();

        while ($currentStart->lt($endCarbon)) {
            $currentEnd = $currentStart->copy()->addDays(9)->endOfDay();
            if ($currentEnd->gt($endCarbon)) {
                $currentEnd = $endCarbon->copy();
            }

            $chunkFrom = $currentStart->format('Y-m-d\TH:i:s\Z');
            $chunkTo = $currentEnd->format('Y-m-d\TH:i:s\Z');

            $fetchResult = $this->fetchTaforDataWithResult($chunkFrom, $chunkTo, $stationId, $cccc);
            if ($fetchResult['success']) {
                foreach ($fetchResult['data'] as $rec) {
                    $recId = $rec['id'] ?? null;
                    if ($recId && in_array($recId, $fetchedIds)) {
                        continue;
                    }
                    if ($recId) {
                        $fetchedIds[] = $recId;
                    }
                    $records[] = $rec;
                }
            } else {
                $lastError = $fetchResult['error'];
            }

            $currentStart = $currentEnd->copy()->addSecond();
        }

        if (empty($records)) {
            return [
                'success' => $lastError === null,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => $lastError ?: 'Tidak ada data TAFOR ditemukan dari BMKGSoft API untuk periode ini.',
                'error_reason' => $lastError,
                'details' => [],
            ];
        }

        $pegawais = Pegawai::all();
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($records as $item) {
            if (empty($item['data_timestamp'])) {
                $failedCount++;
                $details[] = [
                    'timestamp' => 'Tanpa Timestamp',
                    'observer' => $item['sender_username'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Attribute data_timestamp tidak ditemukan pada data TAFOR BMKGSoft API.',
                ];
                continue;
            }

            try {
                $utcTimestamp = Carbon::parse($item['data_timestamp'], 'UTC')->toDateTimeString();
            } catch (\Throwable $e) {
                $failedCount++;
                $details[] = [
                    'timestamp' => $item['data_timestamp'],
                    'observer' => $item['sender_username'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Format timestamp dari API tidak valid.',
                ];
                continue;
            }

            $senderUsername = trim($item['sender_username'] ?? '');
            $observerName = trim($item['observer_name'] ?? '');
            $searchName = $observerName ?: $senderUsername;

            $matchedPegawaiId = null;
            $reasons = [];

            if ($searchName) {
                $matched = $pegawais->first(function ($p) use ($searchName) {
                    return strcasecmp($p->nama, $searchName) === 0 ||
                           stripos($p->nama, $searchName) !== false ||
                           stripos($searchName, $p->nama) !== false;
                });
                if ($matched) {
                    $matchedPegawaiId = $matched->id;
                }
            }

            $sandiText = trim($item['sandi'] ?? '');
            if (empty($sandiText)) {
                $reasons[] = "Sandi TAFOR tidak tersedia / kosong";
            }

            $isSuccess = empty($reasons);

            $receivedTimestamp = !empty($item['received_timestamp']) ? Carbon::parse($item['received_timestamp'])->toDateTimeString() : null;
            $sentTimestamp = !empty($item['sent_timestamp']) ? Carbon::parse($item['sent_timestamp'])->toDateTimeString() : null;

            DataTafor::updateOrCreate(
                [
                    'bmkgsoft_entry_id' => $item['id'] ?? null,
                ],
                [
                    'station_id' => $item['bmkgsoft_id'] ?? $stationId,
                    'alias_station_id' => 97460,
                    'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                    'cccc' => $item['cccc'] ?? $cccc,
                    'ttaaii' => $item['ttaaii'] ?? null,
                    'type_message' => $item['type_message'] ?? 'taf',
                    'bbb' => $item['bbb'] ?? null,
                    'data_timestamp' => $utcTimestamp,
                    'received_timestamp' => $receivedTimestamp,
                    'sent_timestamp' => $sentTimestamp,
                    'sandi' => $sandiText ?: null,
                    'status' => $item['status'] ?? null,
                    'sender_username' => $senderUsername ?: null,
                    'observer_name' => $observerName ?: null,
                    'pegawai_id' => $matchedPegawaiId,
                ]
            );

            if ($isSuccess) {
                $syncedCount++;
            } else {
                $failedCount++;
            }

            $details[] = [
                'timestamp' => $utcTimestamp,
                'observer' => $searchName ?: 'Unassigned',
                'status' => $isSuccess ? 'berhasil' : 'gagal',
                'reason' => empty($reasons) ? 'Sandi TAFOR tersimpan dengan sukses' : implode('; ', $reasons),
            ];
        }

        $totalFetched = count($records);
        $message = "Hasil Sinkronisasi TAFOR BMKGSoft: Total {$totalFetched} data diterima ({$syncedCount} Berhasil" . ($failedCount > 0 ? ", {$failedCount} Gagal/Peringatan" : "") . ").";

        return [
            'success' => true,
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'total_fetched' => $totalFetched,
            'message' => $message,
            'error_reason' => $failedCount > 0 ? "Ada {$failedCount} data yang memerlukan perhatian" : null,
            'details' => $details,
        ];
    }

    /**
     * Fetch METAR raw data from BMKGSoft API for a specific date range.
     */
    public function fetchMetarDataWithResult(string $dateFrom, string $dateTo, int $stationId = 138, string $cccc = 'WAEL'): array
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
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                ])
                ->get($url, [
                    'start' => 0,
                    'size' => 100,
                    'type_message' => 'metar',
                    'cccc' => $cccc,
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'order_by' => 'data_timestamp',
                    'is_order_by_asc' => 'false',
                ]);

            if ($response->successful()) {
                $json = $response->json();
                $data = $json['data'] ?? [];
                return [
                    'success' => true,
                    'data' => is_array($data) ? $data : [],
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'data' => [],
                'error' => "API BMKGSoft merespon dengan status HTTP {$response->status()}",
            ];
        } catch (\Throwable $e) {
            Log::error("Fetch METAR data failed: " . $e->getMessage());
            return [
                'success' => false,
                'data' => [],
                'error' => "Koneksi ke API BMKGSoft gagal: " . $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch and synchronize METAR data in 2-day chunks into data_metar table.
     */
    public function syncMetarData(string $dateFrom, string $dateTo, int $stationId = 138, string $cccc = 'WAEL'): array
    {
        $startCarbon = Carbon::parse($dateFrom);
        $endCarbon = Carbon::parse($dateTo);

        $records = [];
        $fetchedIds = [];
        $lastError = null;

        $currentStart = $startCarbon->copy();

        while ($currentStart->lt($endCarbon)) {
            $currentEnd = $currentStart->copy()->addDays(1)->endOfDay();
            if ($currentEnd->gt($endCarbon)) {
                $currentEnd = $endCarbon->copy();
            }

            $chunkFrom = $currentStart->format('Y-m-d\TH:i:s\Z');
            $chunkTo = $currentEnd->format('Y-m-d\TH:i:s\Z');

            $fetchResult = $this->fetchMetarDataWithResult($chunkFrom, $chunkTo, $stationId, $cccc);
            if ($fetchResult['success']) {
                foreach ($fetchResult['data'] as $rec) {
                    $recId = $rec['id'] ?? null;
                    if ($recId && in_array($recId, $fetchedIds)) {
                        continue;
                    }
                    if ($recId) {
                        $fetchedIds[] = $recId;
                    }
                    $records[] = $rec;
                }
            } else {
                $lastError = $fetchResult['error'];
            }

            $currentStart = $currentEnd->copy()->addSecond();
        }

        if (empty($records)) {
            return [
                'success' => $lastError === null,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => $lastError ?: 'Tidak ada data METAR ditemukan dari BMKGSoft API untuk periode ini.',
                'error_reason' => $lastError,
                'details' => [],
            ];
        }

        $pegawais = Pegawai::all();
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($records as $item) {
            if (empty($item['data_timestamp'])) {
                $failedCount++;
                $details[] = [
                    'timestamp' => 'Tanpa Timestamp',
                    'observer' => $item['sender_username'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Attribute data_timestamp tidak ditemukan pada data METAR BMKGSoft API.',
                ];
                continue;
            }

            try {
                $utcTimestamp = Carbon::parse($item['data_timestamp'], 'UTC')->toDateTimeString();
            } catch (\Throwable $e) {
                $failedCount++;
                $details[] = [
                    'timestamp' => $item['data_timestamp'],
                    'observer' => $item['sender_username'] ?? '-',
                    'status' => 'gagal',
                    'reason' => 'Format timestamp dari API tidak valid.',
                ];
                continue;
            }

            $senderUsername = trim($item['sender_username'] ?? '');
            $observerName = trim($item['observer_name'] ?? '');
            $searchName = $observerName ?: $senderUsername;

            $matchedPegawaiId = null;
            $reasons = [];

            if ($searchName && $searchName !== 'root') {
                $matched = $pegawais->first(function ($p) use ($searchName) {
                    return strcasecmp($p->nama, $searchName) === 0 ||
                           stripos($p->nama, $searchName) !== false ||
                           stripos($searchName, $p->nama) !== false;
                });
                if ($matched) {
                    $matchedPegawaiId = $matched->id;
                }
            }

            $sandiText = trim($item['sandi'] ?? '');
            if (empty($sandiText)) {
                $reasons[] = "Sandi METAR tidak tersedia / kosong";
            }

            $isSuccess = empty($reasons);

            $receivedTimestamp = !empty($item['received_timestamp']) ? Carbon::parse($item['received_timestamp'])->toDateTimeString() : null;
            $sentTimestamp = !empty($item['sent_timestamp']) ? Carbon::parse($item['sent_timestamp'])->toDateTimeString() : null;

            DataMetar::updateOrCreate(
                [
                    'bmkgsoft_entry_id' => $item['id'] ?? null,
                ],
                [
                    'station_id' => $item['bmkgsoft_id'] ?? $stationId,
                    'alias_station_id' => 97460,
                    'station_wmo_id' => $item['station_wmo_id'] ?? null,
                    'station_name' => $item['station_name'] ?? 'Stasiun Meteorologi Oesman Sadik',
                    'cccc' => $item['cccc'] ?? $cccc,
                    'ttaaii' => $item['ttaaii'] ?? null,
                    'type_message' => $item['type_message'] ?? 'metar',
                    'bbb' => $item['bbb'] ?? null,
                    'data_timestamp' => $utcTimestamp,
                    'received_timestamp' => $receivedTimestamp,
                    'sent_timestamp' => $sentTimestamp,
                    'sandi' => $sandiText ?: null,
                    'status' => $item['status'] ?? null,
                    'sender_username' => $senderUsername ?: null,
                    'observer_name' => $observerName ?: null,
                    'pegawai_id' => $matchedPegawaiId,
                ]
            );

            if ($isSuccess) {
                $syncedCount++;
            } else {
                $failedCount++;
            }

            $details[] = [
                'timestamp' => $utcTimestamp,
                'observer' => $searchName ?: 'Unassigned',
                'status' => $isSuccess ? 'berhasil' : 'gagal',
                'reason' => empty($reasons) ? 'Sandi METAR tersimpan dengan sukses' : implode('; ', $reasons),
            ];
        }

        $totalFetched = count($records);
        $message = "Hasil Sinkronisasi METAR BMKGSoft: Total {$totalFetched} data diterima ({$syncedCount} Berhasil" . ($failedCount > 0 ? ", {$failedCount} Gagal/Peringatan" : "") . ").";

        return [
            'success' => true,
            'synced_count' => $syncedCount,
            'failed_count' => $failedCount,
            'total_fetched' => $totalFetched,
            'message' => $message,
            'error_reason' => $failedCount > 0 ? "Ada {$failedCount} data yang memerlukan perhatian" : null,
            'details' => $details,
        ];
    }
}
