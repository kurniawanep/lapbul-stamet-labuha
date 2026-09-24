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

    protected array $airportMap = [
        '01KCKEEGZ6B9NHA5HW0J1XETHN' => 'WAEL',
        '01KCKEEGZ6CSPESGM2REX7BK04' => 'WAEL',
        '01KCKEEGZ67DN82G49TN36R2GY' => 'WAMM',
        '01KCKEEGZ69FS8FA79JCPGR0HD' => 'WAMP',
        '01KCKEEGZ6424YNZ4Q03NTBPAG' => 'WAMH',
        '01KCKEEGZ6ED3915R5TR7PAKRF' => 'WAHH',
        '01KCKEEGZ643JZ7R7PYCFM91JZ' => 'WAEE',
    ];

    /**
     * Resolve airport ID or string to standard 4-letter ICAO code.
     */
    public function resolveAirportCode(?string $airport): string
    {
        if (empty($airport)) {
            return 'WAEL';
        }
        $trimmed = trim($airport);
        if (isset($this->airportMap[$trimmed])) {
            return $this->airportMap[$trimmed];
        }
        if (preg_match('/^[A-Z]{4}$/i', $trimmed)) {
            return strtoupper($trimmed);
        }
        return $trimmed;
    }

    /**
     * Extract integer unix timestamp from item date fields.
     */
    protected function extractTimestamp(?array $item): int
    {
        if (!$item) {
            return 0;
        }
        foreach (['created_at', 'issued_at', 'updated_at', 'departure_at'] as $field) {
            if (!empty($item[$field])) {
                try {
                    return Carbon::parse($item[$field])->timestamp;
                } catch (\Exception $e) {
                    // Ignore parse error and try next field
                }
            }
        }
        return 0;
    }

    /**
     * Save an array of Flight Document items (from INA-SIAM API or Browser Fetch payload).
     */
    public function saveInasiamItems(array $items): array
    {
        $syncedCount = 0;
        $failedCount = 0;
        $details = [];

        // 1. Filter and deduplicate items by departure_at
        $dedupedItems = [];
        foreach ($items as $item) {
            $inasiamId = $item['id'] ?? null;
            $departureAt = $item['departure_at'] ?? ($item['created_at'] ?? null);
            $status = $item['status'] ?? '';
            $callsign = trim($item['callsign'] ?? 'N/A');
            $noFd = !empty($item['id']) ? $item['id'] : (!empty($item['template_id']) ? $item['template_id'] : "FD-{$inasiamId}");

            // Filter: Only completed / selesai status
            if (!$inasiamId || !in_array(strtolower($status), ['completed', 'selesai'])) {
                continue;
            }

            // Filter: Reject if callsign or no_fd contains 'TEST' (e.g. TEST flight or test doc)
            if (preg_match('/\bTEST/i', $callsign) || preg_match('/\bTEST/i', $noFd)) {
                continue;
            }

            if (!$departureAt) {
                continue;
            }

            $departureKey = Carbon::parse($departureAt)->setTimezone('UTC')->format('Y-m-d H:i:s');

            // Resolve Origin and Destination
            $rawOrigins = is_array($item['origin_airports'] ?? null) ? $item['origin_airports'] : [$item['origin_airports'] ?? 'WAEL'];
            $rawDests = is_array($item['destination_airports'] ?? null) ? $item['destination_airports'] : [$item['destination_airports'] ?? 'WAMM'];

            $resolvedOrigins = array_map([$this, 'resolveAirportCode'], array_filter($rawOrigins));
            $resolvedDests = array_map([$this, 'resolveAirportCode'], array_filter($rawDests));

            $originStr = !empty($resolvedOrigins) ? implode(', ', $resolvedOrigins) : 'WAEL';
            $destStr = !empty($resolvedDests) ? implode(', ', $resolvedDests) : 'WAMM';

            // Filter: Reject if origin or destination contains 'TEST'
            if (preg_match('/\bTEST/i', $originStr) || preg_match('/\bTEST/i', $destStr)) {
                continue;
            }

            // Filter: Ensure origin route is WAEL (or contains WAEL)
            if (!str_contains($originStr, 'WAEL')) {
                continue;
            }

            $originStr = 'WAEL';
            $routeStr = "{$originStr} -> {$destStr}";

            if (preg_match('/\bTEST/i', $routeStr)) {
                continue;
            }

            // Store normalized payload
            $item['_normalized'] = [
                'departure_key' => $departureKey,
                'no_fd' => $noFd,
                'callsign' => $callsign,
                'route_str' => $routeStr,
            ];

            // If an item for this departure slot already exists, keep the latest one
            if (isset($dedupedItems[$departureKey])) {
                $existing = $dedupedItems[$departureKey];
                $tExisting = $this->extractTimestamp($existing);
                $tCurrent = $this->extractTimestamp($item);

                if ($tCurrent < $tExisting) {
                    continue;
                }
                if ($tCurrent === $tExisting && strcmp((string)($item['id'] ?? ''), (string)($existing['id'] ?? '')) < 0) {
                    continue;
                }
            }

            $dedupedItems[$departureKey] = $item;
        }

        // 2. Save deduplicated records to database
        foreach ($dedupedItems as $departureKey => $item) {
            $inasiamId = $item['id'];
            $norm = $item['_normalized'];
            $airlineName = $item['airlines']['name'] ?? ($norm['callsign'] ?: 'Wings Air');
            $forecasterName = $item['authorized_info']['forecaster_name'] ?? null;

            $pegawai = $this->observerResolver->resolveForecastPegawai($departureKey, $forecasterName, 'UTC');
            $teknisi = $this->observerResolver->getTeknisiByTimestamp($departureKey, 'UTC');
            $ppnpn = $this->observerResolver->getPpnpnByTimestamp($departureKey, 'UTC');

            try {
                // Ensure only ONE record exists for this departure_at
                $doc = DataFlightDocument::where('departure_at', $departureKey)->first();
                if (!$doc) {
                    $doc = DataFlightDocument::where('inasiam_fd_id', $inasiamId)->first();
                }

                $dataToSave = [
                    'station_code' => 'WAEL',
                    'inasiam_fd_id' => $inasiamId,
                    'no_fd' => $norm['no_fd'],
                    'flight_number' => $norm['callsign'],
                    'airline_name' => $airlineName,
                    'route' => $norm['route_str'],
                    'departure_at' => $departureKey,
                    'issued_at' => isset($item['issued_at']) ? Carbon::parse($item['issued_at'])->setTimezone('UTC')->format('Y-m-d H:i:s') : null,
                    'flight_level' => is_array($item['flight_level'] ?? null) ? implode('/', $item['flight_level']) : ($item['flight_level'] ?? null),
                    'type' => $item['type'] ?? 'Terjadwal',
                    'status' => 'Selesai',
                    'fd_url' => !empty($item['fd_url']) ? $item['fd_url'] : null,
                    'pegawai_id' => $pegawai ? $pegawai->id : null,
                    'teknisi_id' => $teknisi ? $teknisi->id : null,
                    'ppnpn_id' => $ppnpn ? $ppnpn->id : null,
                    'observer_name' => $pegawai ? $pegawai->nama : ($forecasterName ?: null),
                ];

                if ($doc) {
                    $doc->update($dataToSave);
                } else {
                    DataFlightDocument::create($dataToSave);
                }

                $syncedCount++;
                $details[] = [
                    'inasiam_id' => $inasiamId,
                    'flight' => $norm['callsign'],
                    'departure' => $departureKey,
                    'status' => 'berhasil',
                ];
            } catch (\Exception $e) {
                $failedCount++;
                $details[] = [
                    'inasiam_id' => $inasiamId,
                    'flight' => $norm['callsign'],
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
            'message' => "Berhasil menyinkronkan {$syncedCount} Flight Document.",
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
