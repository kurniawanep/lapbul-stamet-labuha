<?php

namespace App\Services;

use App\Models\DataFlightDocument;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InasiamService
{
    protected string $baseUrl;
    protected string $uptId;
    protected string $apiKey;
    protected string $bearerToken;
    protected ObserverResolverService $observerResolver;

    public function __construct()
    {
        $this->baseUrl = config('services.inasiam.base_url', 'https://inasiam.bmkg.go.id');
        $this->uptId = config('services.inasiam.upt_id', '01KFJ17MQTAFJGACA017T6HV9K');
        $this->apiKey = config('services.inasiam.apikey', '');
        $this->bearerToken = config('services.inasiam.bearer_token', '');
        $this->observerResolver = app(ObserverResolverService::class);
    }

    /**
     * Save an array of Flight Document items (from INA-SIAM API or Browser Fetch payload).
     */
    public function saveInasiamItems(array $items): array
    {
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        foreach ($items as $item) {
            $inasiamId = $item['id'] ?? null;
            $departureAt = $item['departure_at'] ?? ($item['created_at'] ?? null);
            $status = $item['status'] ?? '';

            // Ignore draft records as requested
            if (!$inasiamId || strtolower($status) === 'draft') {
                continue;
            }

            $origin = is_array($item['origin_airports'] ?? null) ? implode(', ', $item['origin_airports']) : ($item['origin_airports'] ?? 'WAEL');
            $dest = is_array($item['destination_airports'] ?? null) ? implode(', ', $item['destination_airports']) : ($item['destination_airports'] ?? 'WAMM');
            $routeStr = "{$origin} -> {$dest}";

            $airlineName = $item['airlines']['name'] ?? ($item['callsign'] ?? 'Flight');
            $callsign = trim($item['callsign'] ?? 'N/A');
            $noFd = !empty($item['id']) ? $item['id'] : (!empty($item['template_id']) ? $item['template_id'] : "FD-{$inasiamId}");

            $forecasterName = $item['authorized_info']['forecaster_name'] ?? null;

            $pegawai = $departureAt ? $this->observerResolver->resolvePegawai($departureAt, $forecasterName) : null;
            $teknisi = $departureAt ? $this->observerResolver->getTeknisiByTimestamp($departureAt, 'UTC') : null;
            $ppnpn = $departureAt ? $this->observerResolver->getPpnpnByTimestamp($departureAt, 'UTC') : null;

            try {
                DataFlightDocument::updateOrCreate(
                    [
                        'inasiam_fd_id' => $inasiamId,
                    ],
                    [
                        'station_code' => 'WAEL',
                        'no_fd' => $noFd,
                        'flight_number' => $callsign,
                        'airline_name' => $airlineName,
                        'route' => $routeStr,
                        'departure_at' => $departureAt ? Carbon::parse($departureAt)->setTimezone('UTC')->format('Y-m-d H:i:s') : null,
                        'issued_at' => isset($item['issued_at']) ? Carbon::parse($item['issued_at'])->setTimezone('UTC')->format('Y-m-d H:i:s') : null,
                        'flight_level' => is_array($item['flight_level'] ?? null) ? implode('/', $item['flight_level']) : ($item['flight_level'] ?? null),
                        'type' => $item['type'] ?? 'Terjadwal',
                        'status' => $status === 'completed' ? 'Selesai' : $status,
                        'fd_url' => $item['fd_url'] ?? null,
                        'pegawai_id' => $pegawai ? $pegawai->id : null,
                        'teknisi_id' => $teknisi ? $teknisi->id : null,
                        'ppnpn_id' => $ppnpn ? $ppnpn->id : null,
                        'observer_name' => $pegawai ? $pegawai->nama : ($forecasterName ?: null),
                    ]
                );

                $syncedCount++;
                $details[] = [
                    'inasiam_id' => $inasiamId,
                    'flight' => $callsign,
                    'departure' => $departureAt,
                    'status' => 'berhasil',
                ];
            } catch (\Exception $e) {
                $failedCount++;
                $details[] = [
                    'inasiam_id' => $inasiamId,
                    'flight' => $callsign,
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
            'message' => "Berhasil menyinkronkan {$syncedCount} dari " . count($items) . " Flight Document.",
            'error_reason' => null,
            'details' => $details,
        ];
    }

    /**
     * Fetch Flight Documents from INA-SIAM PostgREST API.
     */
    public function fetchFlightDocumentsWithResult(int $limit = 100, int $offset = 0, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        try {
            $url = "{$this->baseUrl}/rest/v1/fd_inquiries";

            $queryParams = [
                'select' => 'id,type,callsign,airline_id,departure_at,issued_at,upt_id,template_id,origin_airports,destination_airports,alternate_airports,flight_level,sigwx_high_area,satellites,authorized_info,fd_url,download_count,status,created_by,created_at,updated_at,airlines(id,name,icao,iata,image)',
                'upt_id' => "eq.{$this->uptId}",
                'order' => 'created_at.desc',
                'offset' => $offset,
                'limit' => $limit,
            ];

            if ($dateFrom) {
                $queryParams['created_at'] = 'gte.' . Carbon::parse($dateFrom)->toIso8601String();
            }
            if ($dateTo) {
                $queryParams['created_at'] = 'lte.' . Carbon::parse($dateTo)->toIso8601String();
            }

            $response = Http::withoutVerifying()
                ->timeout(25)
                ->withHeaders([
                    'accept' => 'application/json',
                    'accept-profile' => 'public',
                    'apikey' => $this->apiKey,
                    'Authorization' => "Bearer {$this->bearerToken}",
                    'prefer' => 'count=exact',
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ])
                ->get($url, $queryParams);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json() ?? [],
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
     * Sync Flight Documents from INA-SIAM API into data_flight_document database table.
     */
    public function syncFlightDocuments(int $limit = 100, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $fetchResult = $this->fetchFlightDocumentsWithResult($limit, 0, $dateFrom, $dateTo);

        if (!$fetchResult['success']) {
            return [
                'success' => false,
                'synced_count' => 0,
                'failed_count' => 0,
                'total_fetched' => 0,
                'message' => 'Gagal mengambil data dari INA-SIAM API.',
                'error_reason' => $fetchResult['error'],
                'details' => [],
            ];
        }

        return $this->saveInasiamItems($fetchResult['data']);
    }
}
