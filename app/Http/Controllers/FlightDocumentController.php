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

        // Calculate KPI Statistics
        $totalInasiam = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])->count();
        $totalDispatched = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])
            ->where('is_wa_dispatched', true)
            ->count();
        $pendingDispatch = max(0, $totalInasiam - $totalDispatched);
        $dispatchPct = $totalInasiam > 0 ? round(($totalDispatched / $totalInasiam) * 100, 1) : 0;

        // Daily Matrix
        $allMonthRecords = DataFlightDocument::whereBetween('departure_at', [$startDate->toDateTimeString(), $endDate->toDateTimeString()])->get();
        $dailyMatrix = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dayRecords = $allMonthRecords->filter(function ($item) use ($d) {
                return Carbon::parse($item->departure_at)->day === $d;
            });

            $countInasiam = $dayRecords->count();
            $countWa = $dayRecords->where('is_wa_dispatched', true)->count();

            $dailyMatrix[] = [
                'day' => $d,
                'total_fd' => $countInasiam,
                'wa_sent' => $countWa,
                'is_complete' => $countInasiam > 0 && $countWa >= $countInasiam,
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
                'total_inasiam' => $totalInasiam,
                'total_dispatched' => $totalDispatched,
                'pending_dispatch' => $pendingDispatch,
                'dispatch_rate_pct' => $dispatchPct,
            ],
            'daily_matrix' => $dailyMatrix,
            'inasiam_config' => [
                'base_url' => config('services.inasiam.base_url', 'https://inasiam.bmkg.go.id'),
                'upt_id' => config('services.inasiam.upt_id', '01KFJ17MQTAFJGACA017T6HV9K'),
                'apikey' => config('services.inasiam.apikey', ''),
                'bearer_token' => config('services.inasiam.bearer_token', ''),
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

        $limit = (int) $request->input('limit', 100);
        $result = $this->inasiamService->syncFlightDocuments($limit);

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

            $pegawai = $timestamp ? $this->observerResolver->resolvePegawai($timestamp, $sender) : null;

            if ($doc) {
                $doc->update([
                    'is_wa_dispatched' => true,
                    'wa_dispatched_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'wa_sender_name' => $sender,
                    'pegawai_id' => $pegawai ? $pegawai->id : $doc->pegawai_id,
                    'observer_name' => $pegawai ? $pegawai->nama : ($sender ?: $doc->observer_name),
                ]);
                $matchedCount++;
            } else {
                DataFlightDocument::create([
                    'station_code' => 'WAEL',
                    'no_fd' => $fn,
                    'flight_number' => 'WA Dispatch',
                    'route' => 'WAEL -> WAMM',
                    'departure_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'type' => 'Terjadwal',
                    'status' => 'Selesai',
                    'is_wa_dispatched' => true,
                    'wa_dispatched_at' => $timestamp ? Carbon::parse($timestamp)->format('Y-m-d H:i:s') : Carbon::now(),
                    'wa_sender_name' => $sender,
                    'observer_name' => $pegawai ? $pegawai->nama : $sender,
                    'pegawai_id' => $pegawai ? $pegawai->id : null,
                ]);
                $matchedCount++;
            }
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
