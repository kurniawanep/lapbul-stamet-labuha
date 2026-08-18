<?php

namespace App\Http\Controllers;

use App\Models\DataMetReport;
use App\Services\MetReportParserService;
use App\Services\ObserverResolverService;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MetReportController extends Controller
{
    protected MetReportParserService $parser;
    protected ObserverResolverService $observerResolver;
    protected WhatsAppService $waService;

    public function __construct(
        MetReportParserService $parser,
        ObserverResolverService $observerResolver,
        WhatsAppService $waService
    ) {
        $this->parser = $parser;
        $this->observerResolver = $observerResolver;
        $this->waService = $waService;
    }

    /**
     * Display MET REPORT (QAM) list with filtering and pagination.
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);
        $perPage = (int) $request->input('per_page', 10);
        $sortOrder = strtolower($request->input('sort_order', 'desc'));
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = DataMetReport::with('pegawai')
            ->whereBetween('data_timestamp', [$startDate, $endDate]);

        if ($request->filled('observer')) {
            $query->where('observer_name', $request->input('observer'));
        }

        $metReportRecords = $query->orderBy('data_timestamp', $sortOrder)
            ->paginate($perPage)
            ->withQueryString();

        $availableObservers = DataMetReport::whereBetween('data_timestamp', [$startDate, $endDate])
            ->whereNotNull('observer_name')
            ->distinct()
            ->orderBy('observer_name')
            ->pluck('observer_name');

        return Inertia::render('Laporan/MetReport', [
            'metReportRecords' => $metReportRecords,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'totalRecords' => $metReportRecords->total(),
            'sortOrder' => $sortOrder,
            'availableObservers' => $availableObservers,
            'observerFilter' => $request->input('observer', 'ALL'),
            'waConfigured' => $this->waService->isConfigured(),
        ]);
    }

    /**
     * Parse & save single or bulk MET REPORT (QAM) messages manually pasted from UI modal.
     */
    public function storeManual(Request $request): RedirectResponse
    {
        $request->validate([
            'raw_message' => 'required|string',
        ]);

        $rawText = $request->input('raw_message');
        if (!$this->parser->isMetReport($rawText)) {
            return redirect()->back()->with('error', 'Teks yang dimasukkan bukan format MET REPORT (QAM) yang valid.');
        }

        $items = $this->parser->parseMultiple($rawText);
        if (empty($items)) {
            $single = $this->parser->parse($rawText);
            if ($single['data_timestamp']) {
                $items = [$single];
            }
        }

        if (empty($items)) {
            return redirect()->back()->with('error', 'Gagal mengekstraksi Tanggal & Jam dari teks MET REPORT.');
        }

        $count = 0;
        foreach ($items as $parsed) {
            $pegawai = $this->observerResolver->getObserverByTimestamp($parsed['data_timestamp']);

            DataMetReport::updateOrCreate(
                ['data_timestamp' => Carbon::parse($parsed['data_timestamp'])->format('Y-m-d H:i:s')],
                [
                    'station_code' => $parsed['station_code'],
                    'station_name' => $parsed['station_name'],
                    'wind' => $parsed['wind'],
                    'visibility' => $parsed['visibility'],
                    'weather' => $parsed['weather'],
                    'cloud' => $parsed['cloud'],
                    'temp_drybulb' => $parsed['temp_drybulb'],
                    'temp_dewpoint' => $parsed['temp_dewpoint'],
                    'qnh_hpa' => $parsed['qnh_hpa'],
                    'qnh_inhg' => $parsed['qnh_inhg'],
                    'qfe_hpa' => $parsed['qfe_hpa'],
                    'qfe_inhg' => $parsed['qfe_inhg'],
                    'remarks' => $parsed['remarks'],
                    'trend' => $parsed['trend'],
                    'raw_message' => $parsed['raw_message'],
                    'observer_name' => $pegawai ? $pegawai->nama : null,
                    'pegawai_id' => $pegawai ? $pegawai->id : null,
                ]
            );
            $count++;
        }

        return redirect()->back()->with('success', "Berhasil merekap {$count} data MET REPORT (QAM)!");
    }

    /**
     * Webhook endpoint for receiving incoming WhatsApp messages from WAHA / Baileys Gateway.
     */
    public function webhook(Request $request): JsonResponse
    {
        $body = $request->all();
        $messageText = $body['payload']['body'] ?? ($body['text'] ?? ($body['message'] ?? null));
        $senderName = $body['payload']['_data']['notifyName'] ?? ($body['pushName'] ?? null);

        if (!$messageText || !$this->parser->isMetReport($messageText)) {
            return response()->json(['status' => 'ignored', 'reason' => 'Not a MET REPORT message']);
        }

        $items = $this->parser->parseMultiple($messageText);
        if (empty($items)) {
            $single = $this->parser->parse($messageText);
            if ($single['data_timestamp']) {
                $items = [$single];
            }
        }

        if (empty($items)) {
            return response()->json(['status' => 'error', 'reason' => 'Timestamp parsing failed'], 422);
        }

        $savedIds = [];
        foreach ($items as $parsed) {
            $pegawai = $this->observerResolver->getObserverByTimestamp($parsed['data_timestamp']);

            $record = DataMetReport::updateOrCreate(
                ['data_timestamp' => Carbon::parse($parsed['data_timestamp'])->format('Y-m-d H:i:s')],
                [
                    'station_code' => $parsed['station_code'],
                    'station_name' => $parsed['station_name'],
                    'wind' => $parsed['wind'],
                    'visibility' => $parsed['visibility'],
                    'weather' => $parsed['weather'],
                    'cloud' => $parsed['cloud'],
                    'temp_drybulb' => $parsed['temp_drybulb'],
                    'temp_dewpoint' => $parsed['temp_dewpoint'],
                    'qnh_hpa' => $parsed['qnh_hpa'],
                    'qnh_inhg' => $parsed['qnh_inhg'],
                    'qfe_hpa' => $parsed['qfe_hpa'],
                    'qfe_inhg' => $parsed['qfe_inhg'],
                    'remarks' => $parsed['remarks'],
                    'trend' => $parsed['trend'],
                    'raw_message' => $parsed['raw_message'],
                    'observer_name' => $pegawai ? $pegawai->nama : null,
                    'pegawai_id' => $pegawai ? $pegawai->id : null,
                ]
            );
            $savedIds[] = $record->id;
        }

        return response()->json([
            'status' => 'success',
            'data_id' => $savedIds[0] ?? null,
            'data_ids' => $savedIds,
            'count' => count($savedIds),
        ]);
    }

    /**
     * Send test message via WhatsAppService (outbound messaging).
     */
    public function sendWhatsApp(Request $request): RedirectResponse
    {
        $request->validate([
            'recipient' => 'required|string',
            'message' => 'required|string',
        ]);

        $success = $this->waService->sendMessage(
            $request->input('recipient'),
            $request->input('message')
        );

        if ($success) {
            return redirect()->back()->with('success', 'Pesan WhatsApp berhasil dikirim!');
        }

        return redirect()->back()->with('error', 'Gagal mengirim pesan WhatsApp via Gateway.');
    }
}
