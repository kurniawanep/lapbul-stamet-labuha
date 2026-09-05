<?php

namespace App\Http\Controllers;

use App\Models\DataFlightDocument;
use App\Services\FlightDocumentParserService;
use App\Services\InasiamService;
use App\Services\ObserverResolverService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FlightDocumentController extends Controller
{
    protected InasiamService $inasiamService;
    protected FlightDocumentParserService $parserService;
    protected ObserverResolverService $observerResolver;

    public function __construct(
        InasiamService $inasiamService,
        FlightDocumentParserService $parserService,
        ObserverResolverService $observerResolver
    ) {
        $this->inasiamService = $inasiamService;
        $this->parserService = $parserService;
        $this->observerResolver = $observerResolver;
    }

    /**
     * Display Flight Document dispatch audit page.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', Carbon::now()->month);
        $tahun = (int) $request->input('tahun', Carbon::now()->year);
        $search = $request->input('search');

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        $query = DataFlightDocument::with(['pegawai', 'teknisi', 'ppnpn'])
            ->whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()]);

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('no_fd', 'like', "%{$search}%")
                  ->orWhere('flight_number', 'like', "%{$search}%")
                  ->orWhere('airline_name', 'like', "%{$search}%")
                  ->orWhere('route', 'like', "%{$search}%")
                  ->orWhere('observer_name', 'like', "%{$search}%");
            });
        }

        $records = $query->orderBy('departure_at', 'desc')->paginate(15)->withQueryString();

        // Calculate Statistics (Hanya hitung data dengan status Selesai)
        $totalFd = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->where('status', 'Selesai')
            ->count();
        $uniqueFlights = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->where('status', 'Selesai')
            ->distinct('flight_number')
            ->count('flight_number');

        // Daily Matrix (Hanya hitung data dengan status Selesai)
        $allMonthRecords = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->where('status', 'Selesai')
            ->get();
        $dailyMatrix = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dayRecords = $allMonthRecords->filter(function ($item) use ($d) {
                return Carbon::parse($item->departure_at)->day === $d;
            });

            $countFd = $dayRecords->count();

            $dailyMatrix[] = [
                'day' => $d,
                'total_fd' => $countFd,
                'is_complete' => $countFd > 0,
            ];
        }

        return Inertia::render('Laporan/FlightDocument', [
            'records' => $records,
            'filters' => [
                'bulan' => $bulan,
                'tahun' => $tahun,
                'search' => $search,
            ],
            'stats' => [
                'total_fd' => $totalFd,
                'unique_flights' => $uniqueFlights,
            ],
            'daily_matrix' => $dailyMatrix,
            'inasiam_config' => [
                'base_url' => config('services.inasiam.base_url', 'https://inasiam.bmkg.go.id'),
                'upt_id' => config('services.inasiam.upt_id', '01KFJ17MQTAFJGACA017T6HV9K'),
            ],
        ]);
    }

    /**
     * Action to trigger synchronization from INA-SIAM API or Browser payload.
     */
    public function syncInasiam(Request $request)
    {
        if ($request->has('raw_json') && !empty($request->input('raw_json'))) {
            $items = json_decode($request->input('raw_json'), true);
            if (is_array($items)) {
                $result = $this->inasiamService->saveInasiamItems($items);
                
                // Detect target month from items to automatically redirect filter
                $targetBulan = null;
                $targetTahun = null;
                foreach ($items as $it) {
                    $dep = $it['departure_at'] ?? ($it['created_at'] ?? null);
                    if ($dep) {
                        $dt = Carbon::parse($dep);
                        $targetBulan = $dt->month;
                        $targetTahun = $dt->year;
                        break;
                    }
                }

                if ($targetBulan && $targetTahun) {
                    return redirect()->route('laporan.flight-document', [
                        'bulan' => $targetBulan,
                        'tahun' => $targetTahun,
                    ])->with('success', $result['message']);
                }

                return redirect()->back()->with('success', $result['message']);
            }
        }

        if ($request->has('items') && is_array($request->input('items'))) {
            $items = $request->input('items');
            $result = $this->inasiamService->saveInasiamItems($items);
            if ($result['success']) {
                return redirect()->back()->with('success', $result['message']);
            }
        }

        $limit = (int) $request->input('limit', 500);
        $bulan = $request->input('bulan');
        $tahun = $request->input('tahun');

        $dateFrom = null;
        $dateTo = null;
        if ($bulan && $tahun) {
            $startDate = Carbon::createFromDate((int) $tahun, (int) $bulan, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
            $dateFrom = $startDate->toDateTimeString();
            $dateTo = $endDate->toDateTimeString();
        }

        $result = $this->inasiamService->syncFlightDocuments($limit, $dateFrom, $dateTo);

        if ($result['success']) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message'] . ' Error: ' . ($result['error_reason'] ?? ''));
    }

    /**
     * Quick Paste / Bulk Input text for WA dispatch matching.
     */
    public function storeManual(Request $request)
    {
        $request->validate([
            'raw_message' => 'required|string',
        ]);

        $bulkText = $request->input('raw_message');
        $parsedItems = $this->parserService->parseMultiple($bulkText);

        $matchedCount = 0;
        foreach ($parsedItems as $item) {
            $fn = $item['filename'];
            $timestamp = $item['timestamp'];
            $sender = $item['sender_name'];

            $doc = null;
            if ($fn !== 'FD_DOCUMENT.pdf') {
                $doc = DataFlightDocument::where('no_fd', 'like', "%{$fn}%")->first();
            }

            if (!$doc && $timestamp) {
                $dt = Carbon::parse($timestamp);
                $doc = DataFlightDocument::whereBetween('departure_at', [
                    $dt->copy()->subHours(2)->toDateTimeString(),
                    $dt->copy()->addHours(2)->toDateTimeString(),
                ])->where('is_wa_dispatched', false)->first();
            }

            $pegawai = $timestamp ? $this->observerResolver->getObserverByTimestamp($timestamp, 'Asia/Jayapura') : null;
            if (!$pegawai && $timestamp) {
                $pegawai = $this->observerResolver->resolvePegawai($timestamp, $sender, 'Asia/Jayapura');
            }
            $teknisi = $timestamp ? $this->observerResolver->getTeknisiByTimestamp($timestamp, 'Asia/Jayapura') : null;
            $ppnpn = $timestamp ? $this->observerResolver->getPpnpnByTimestamp($timestamp, 'Asia/Jayapura') : null;

            if ($doc) {
                $doc->update([
                    'status' => 'Selesai',
                    'is_wa_dispatched' => true,
                    'wa_dispatched_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'wa_sender_name' => $sender,
                    'pegawai_id' => $pegawai ? $pegawai->id : $doc->pegawai_id,
                    'teknisi_id' => $teknisi ? $teknisi->id : $doc->teknisi_id,
                    'ppnpn_id' => $ppnpn ? $ppnpn->id : $doc->ppnpn_id,
                    'observer_name' => $pegawai ? $pegawai->nama : ($sender ?: $doc->observer_name),
                ]);
                $matchedCount++;
            } else {
                $flNumber = $item['flight_number'] ?? 'WA Dispatch';
                $route = $item['route'] ?? 'WAEL -> WAMM';
                if (!isset($item['route'])) {
                    if (str_contains($flNumber, '1173')) {
                        $route = 'WAEL -> WAEE';
                    } elseif (str_contains($flNumber, '2273') || str_contains($flNumber, '2275') || str_contains($flNumber, '2277')) {
                        $route = 'WAEL -> WAMM';
                    }
                }

                $flightType = $item['type'] ?? ((str_contains($flNumber, '227')) ? 'Charter' : 'Terjadwal');

                DataFlightDocument::create([
                    'station_code' => 'WAEL',
                    'no_fd' => $fn,
                    'flight_number' => $flNumber,
                    'airline_name' => str_starts_with($flNumber, 'IW') ? 'Wings Air' : 'Aviation',
                    'route' => $route,
                    'departure_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'type' => $flightType,
                    'status' => 'Selesai',
                    'is_wa_dispatched' => true,
                    'wa_dispatched_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'wa_sender_name' => $sender,
                    'observer_name' => $pegawai ? $pegawai->nama : $sender,
                    'pegawai_id' => $pegawai ? $pegawai->id : null,
                    'teknisi_id' => $teknisi ? $teknisi->id : null,
                    'ppnpn_id' => $ppnpn ? $ppnpn->id : null,
                ]);
                $matchedCount++;
            }
        }

        $targetBulan = null;
        $targetTahun = null;
        if (!empty($parsedItems)) {
            foreach ($parsedItems as $item) {
                if (!empty($item['timestamp'])) {
                    $dt = Carbon::parse($item['timestamp']);
                    $targetBulan = $dt->month;
                    $targetTahun = $dt->year;
                    break;
                }
            }
        }

        if ($targetBulan && $targetTahun) {
            return redirect()->route('laporan.flight-document', [
                'bulan' => $targetBulan,
                'tahun' => $targetTahun,
            ])->with('success', "Berhasil mencocokkan & mencatat {$matchedCount} riwayat pengiriman WA untuk bulan {$targetBulan}/{$targetTahun}.");
        }

        return redirect()->back()->with('success', "Berhasil mencocokkan & mencatat {$matchedCount} riwayat pengiriman WA.");
    }

    /**
     * Toggle WA Dispatch status on a specific document.
     */
    public function toggleWaStatus(Request $request, int $id)
    {
        $doc = DataFlightDocument::findOrFail($id);
        $newStatus = !$doc->is_wa_dispatched;

        $doc->update([
            'is_wa_dispatched' => $newStatus,
            'wa_dispatched_at' => $newStatus ? Carbon::now() : null,
            'status' => $newStatus ? 'Selesai' : $doc->status,
        ]);

        return redirect()->back()->with('success', 'Status pengiriman WA berhasil diperbarui.');
    }

    /**
     * Delete Flight Document record.
     */
    public function destroy(int $id)
    {
        $doc = DataFlightDocument::findOrFail($id);
        $doc->delete();

        return redirect()->back()->with('success', 'Data Flight Document berhasil dihapus.');
    }
}
