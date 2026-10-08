<?php

namespace App\Http\Controllers;

use App\Models\DataFlight;
use App\Services\FlightDataImportService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FlightController extends Controller
{
    protected FlightDataImportService $importService;

    public function __construct(FlightDataImportService $importService)
    {
        $this->importService = $importService;
    }

    /**
     * Display Data Flight listing and statistics grouped by maskapai.
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $bulan = (int) $request->input('bulan', $now->month);
        $tahun = (int) $request->input('tahun', $now->year);
        $maskapaiFilter = $request->input('maskapai', 'all');
        $search = $request->input('search');

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $daysInMonth = $startDate->daysInMonth;

        // Base Query for records in current month
        $baseMonthQuery = DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')]);

        // Grouped summary stats by maskapai for the whole month
        $allMonthRecords = (clone $baseMonthQuery)->get();

        $groupedByMaskapai = $allMonthRecords->groupBy('maskapai')->map(function ($items, $maskapaiName) {
            $departures = $items->filter(fn($f) => strtoupper((string)$f->dep) === 'LAH')->count();
            $arrivals = $items->filter(fn($f) => strtoupper((string)$f->arr) === 'LAH')->count();
            $uniqueAircrafts = $items->pluck('reg')->filter()->unique()->values()->all();

            return [
                'maskapai' => $maskapaiName,
                'total_flights' => $items->count(),
                'departures' => $departures,
                'arrivals' => $arrivals,
                'unique_aircraft_count' => count($uniqueAircrafts),
                'unique_aircrafts' => $uniqueAircrafts,
            ];
        })->values()->all();

        // Overall stats
        $totalFlights = $allMonthRecords->count();
        $totalDepartures = $allMonthRecords->filter(fn($f) => strtoupper((string)$f->dep) === 'LAH')->count();
        $totalArrivals = $allMonthRecords->filter(fn($f) => strtoupper((string)$f->arr) === 'LAH')->count();
        $uniqueAirlines = $allMonthRecords->pluck('maskapai')->filter()->unique()->count();

        // Daily matrix
        $dailyMatrix = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = sprintf('%04d-%02d-%02d', $tahun, $bulan, $d);
            $dayFlights = $allMonthRecords->filter(function ($item) use ($dateStr) {
                $itemDate = is_string($item->tanggal) ? substr($item->tanggal, 0, 10) : $item->tanggal->format('Y-m-d');
                return $itemDate === $dateStr;
            });

            $dailyMatrix[] = [
                'day' => $d,
                'date' => $dateStr,
                'count' => $dayFlights->count(),
                'has_data' => $dayFlights->count() > 0,
            ];
        }

        // Available maskapai in database for filtering dropdown
        $availableMaskapai = DataFlight::select('maskapai')
            ->distinct()
            ->orderBy('maskapai')
            ->pluck('maskapai')
            ->all();

        if (empty($availableMaskapai)) {
            $availableMaskapai = ['Wings Air', 'Lion Air', 'Batik Air', 'Super Air Jet', 'Garuda Indonesia', 'Citilink', 'Trigana Air', 'SAM Air'];
        }

        // Filtered Paginated Records
        $query = clone $baseMonthQuery;

        if ($maskapaiFilter && $maskapaiFilter !== 'all') {
            $query->where('maskapai', $maskapaiFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('flight_number', 'like', "%{$search}%")
                  ->orWhere('reg', 'like', "%{$search}%")
                  ->orWhere('dep', 'like', "%{$search}%")
                  ->orWhere('arr', 'like', "%{$search}%")
                  ->orWhere('maskapai', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%");
            });
        }

        $records = $query->with('pegawai:id,nama')
            ->orderBy('tanggal', 'asc')
            ->orderBy('sta_utc', 'asc')
            ->orderBy('std_utc', 'asc')
            ->orderBy('flight_number', 'asc')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Laporan/Flight', [
            'records' => $records,
            'filters' => [
                'bulan' => $bulan,
                'tahun' => $tahun,
                'maskapai' => $maskapaiFilter,
                'search' => $search,
            ],
            'stats' => [
                'total_flights' => $totalFlights,
                'total_departures' => $totalDepartures,
                'total_arrivals' => $totalArrivals,
                'unique_airlines' => $uniqueAirlines,
            ],
            'grouped_stats' => $groupedByMaskapai,
            'available_maskapai' => $availableMaskapai,
            'daily_matrix' => $dailyMatrix,
        ]);
    }

    /**
     * Store a new flight record manually.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'maskapai' => ['required', 'string', 'max:100'],
            'flight_number' => ['required', 'string', 'max:50'],
            'reg' => ['nullable', 'string', 'max:20'],
            'dep' => ['required', 'string', 'max:10'],
            'arr' => ['required', 'string', 'max:10'],
            'sta_utc' => ['nullable', 'string', 'max:10'],
            'std_utc' => ['nullable', 'string', 'max:10'],
            'ata_utc' => ['nullable', 'string', 'max:10'],
            'atd_utc' => ['nullable', 'string', 'max:10'],
            'remarks' => ['nullable', 'string'],
        ]);

        $validated['dep'] = strtoupper(trim($validated['dep']));
        $validated['arr'] = strtoupper(trim($validated['arr']));
        if (!empty($validated['reg'])) {
            $validated['reg'] = strtoupper(trim($validated['reg']));
        }
        $validated['pegawai_id'] = Auth::id();

        DataFlight::create($validated);

        return redirect()->back()->with('success', 'Data penerbangan berhasil ditambahkan.');
    }

    /**
     * Update an existing flight record.
     */
    public function update(Request $request, DataFlight $flight): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'maskapai' => ['required', 'string', 'max:100'],
            'flight_number' => ['required', 'string', 'max:50'],
            'reg' => ['nullable', 'string', 'max:20'],
            'dep' => ['required', 'string', 'max:10'],
            'arr' => ['required', 'string', 'max:10'],
            'sta_utc' => ['nullable', 'string', 'max:10'],
            'std_utc' => ['nullable', 'string', 'max:10'],
            'ata_utc' => ['nullable', 'string', 'max:10'],
            'atd_utc' => ['nullable', 'string', 'max:10'],
            'remarks' => ['nullable', 'string'],
        ]);

        $validated['dep'] = strtoupper(trim($validated['dep']));
        $validated['arr'] = strtoupper(trim($validated['arr']));
        if (!empty($validated['reg'])) {
            $validated['reg'] = strtoupper(trim($validated['reg']));
        }

        $flight->update($validated);

        return redirect()->back()->with('success', 'Data penerbangan berhasil diperbarui.');
    }

    /**
     * Delete a flight record.
     */
    public function destroy(DataFlight $flight): RedirectResponse
    {
        $flight->delete();

        return redirect()->back()->with('success', 'Data penerbangan berhasil dihapus.');
    }

    /**
     * Delete multiple selected flight records.
     */
    public function bulkDelete(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:data_flights,id'],
        ]);

        DataFlight::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', count($validated['ids']) . ' data penerbangan berhasil dihapus.');
    }

    /**
     * Import flight data from Excel spreadsheet (.xlsx / .xls).
     */
    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:20480',
                function ($attribute, $value, $fail) {
                    $ext = strtolower($value->getClientOriginalExtension());
                    if (!in_array($ext, ['xlsx', 'xls', 'csv'], true)) {
                        $fail('Berkas harus berupa file Excel (.xlsx, .xls) atau CSV.');
                    }
                },
            ],
            'override_maskapai' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $result = $this->importService->import(
                $request->file('file'),
                Auth::id(),
                $request->input('override_maskapai')
            );

            $msg = "Berhasil mengimpor {$result['imported']} data penerbangan.";
            if ($result['skipped'] > 0) {
                $msg .= " ({$result['skipped']} baris diabaikan karena format tidak sesuai)";
            }

            $targetBulan = $result['month'] ?? $request->input('bulan', Carbon::now()->month);
            $targetTahun = $result['year'] ?? $request->input('tahun', Carbon::now()->year);

            return redirect()->route('laporan.flight', [
                'bulan' => $targetBulan,
                'tahun' => $targetTahun,
            ])->with('success', $msg);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengimpor file: ' . $e->getMessage());
        }
    }

    /**
     * Export flight data to Excel.
     */
    public function export(Request $request): StreamedResponse
    {
        $now = Carbon::now();
        $bulan = (int) $request->input('bulan', $now->month);
        $tahun = (int) $request->input('tahun', $now->year);
        $maskapai = $request->input('maskapai', 'all');

        return $this->importService->export($bulan, $tahun, $maskapai);
    }

    /**
     * Download standard Excel template.
     */
    public function downloadTemplate(): BinaryFileResponse
    {
        $templatePath = resource_path('templates/excel/data-flight-wings.xlsx');

        if (!file_exists($templatePath)) {
            abort(404, 'Template file tidak ditemukan.');
        }

        return response()->download($templatePath, 'template_data_flight.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
