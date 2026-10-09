<?php

namespace App\Http\Controllers;

use App\Models\DataFklim;
use App\Models\DataFlight;
use App\Models\DataFlightDocument;
use App\Models\DataMetReport;
use App\Models\DataMetar;
use App\Models\DataPenguapan;
use App\Models\DataPerawanan;
use App\Models\DataPibal;
use App\Models\DataSinoptik;
use App\Models\DataTafor;
use App\Models\DataWxrev;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Render the main system dashboard with summary stats across all modules.
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now();
        $bulan = (int) $request->input('bulan', $now->month);
        $tahun = (int) $request->input('tahun', $now->year);

        $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        // 1. Pegawai Stats
        $totalPegawai = Pegawai::count();
        $totalPns = Pegawai::where('jenis_pegawai', 'PNS')->count();
        $totalPpnpn = Pegawai::where('jenis_pegawai', 'PPNPN')->count();

        // 2. Laporan Stats (Counts for current selected month)
        $laporanCounts = [
            'pibal' => DataPibal::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'tafor' => DataTafor::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'metar' => DataMetar::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'sinoptik' => DataSinoptik::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'fklim' => DataFklim::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'perawanan' => DataPerawanan::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'penguapan' => DataPenguapan::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'met_report' => DataMetReport::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
            'flight_document' => DataFlightDocument::where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('departure_at', [$startDate, $endDate])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->whereNull('departure_at')->whereBetween('created_at', [$startDate, $endDate]);
                  });
            })->where('status', 'Selesai')->count(),
            'flight' => DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])->count(),
            'wxrev' => DataWxrev::whereBetween('data_timestamp', [$startDate, $endDate])->count(),
        ];

        // 3. Flight Stats Grouped by Maskapai
        $monthFlights = DataFlight::whereBetween('tanggal', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])->get();
        $flightAirlineStats = $monthFlights->groupBy('maskapai')->map(function ($items, $maskapaiName) {
            return [
                'maskapai' => $maskapaiName,
                'total' => $items->count(),
                'departures' => $items->filter(fn($f) => strtoupper((string)$f->dep) === 'LAH')->count(),
                'arrivals' => $items->filter(fn($f) => strtoupper((string)$f->arr) === 'LAH')->count(),
                'aircraft_count' => $items->pluck('reg')->filter()->unique()->count(),
            ];
        })->values()->all();

        return Inertia::render('dashboard', [
            'bulan' => $bulan,
            'tahun' => $tahun,
            'pegawaiStats' => [
                'total' => $totalPegawai,
                'pns' => $totalPns,
                'ppnpn' => $totalPpnpn,
            ],
            'laporanCounts' => $laporanCounts,
            'flightAirlineStats' => [
                'total' => $monthFlights->count(),
                'departures' => $monthFlights->filter(fn($f) => strtoupper((string)$f->dep) === 'LAH')->count(),
                'arrivals' => $monthFlights->filter(fn($f) => strtoupper((string)$f->arr) === 'LAH')->count(),
                'airlines' => $flightAirlineStats,
            ],
            'stationInfo' => [
                'nama' => 'Stasiun Meteorologi Oesman Sadik',
                'lokasi' => 'Halmahera Selatan, Maluku Utara',
                'wmo_id' => '97460',
                'station_id' => 138,
                'timezone' => 'WIT (UTC+9)',
            ],
        ]);
    }
}
