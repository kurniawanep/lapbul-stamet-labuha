<?php

namespace App\Http\Controllers;

use App\Models\JadwalBulanan;
use App\Models\JadwalDetail;
use App\Models\MasterShift;
use App\Models\Pegawai;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class JadwalController extends Controller
{
    /**
     * Fetch and cache Indonesian national holidays & cuti bersama from Kemendesa API.
     */
    private function getHolidays(int $tahun): array
    {
        return Cache::remember("indonesia_holidays_{$tahun}", 86400, function () use ($tahun) {
            try {
                $response = Http::timeout(4)->get("https://api.kemendesa.link/libur-nasional/api/holidays/{$tahun}.json");
                if ($response->successful()) {
                    $json = $response->json();
                    $holidays = [];
                    foreach ($json['data'] ?? [] as $h) {
                        if (empty($h['date'])) continue;
                        $name = $h['name'] ?? '';
                        if (!empty($h['is_cuti_bersama'])) {
                            $name = 'Cuti Bersama - ' . $name;
                        }
                        $holidays[$h['date']] = [
                            'name' => $name,
                            'is_cuti_bersama' => (bool) ($h['is_cuti_bersama'] ?? false),
                        ];
                    }
                    return $holidays;
                }
            } catch (\Throwable $e) {
                // Silently fallback if offline or request fails
            }
            return [];
        });
    }

    /**
     * Display the operational schedule matrix page (Observer & TU).
     */
    public function index(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $jadwalBulanan = $this->getJadwalBulanan($bulan, $tahun);

        $pegawais = Pegawai::where('jenis_pegawai', 'PNS')
            ->where(function ($q) {
                $q->where('role', '!=', 'Teknisi')
                  ->orWhereNull('role');
            })
            ->orderBy('id')
            ->get();

        $shifts = MasterShift::where('category', 'operasional')->orderBy('id')->get();
        $matrix = $this->getMatrixData($jadwalBulanan->id);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $holidays = $this->getHolidays($tahun);

        return Inertia::render('Jadwal/Index', [
            'jadwalBulanan' => $jadwalBulanan,
            'pegawais' => $pegawais,
            'shifts' => $shifts,
            'matrix' => $matrix,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'holidays' => $holidays,
            'category' => 'operasional',
            'pageTitle' => 'Jadwal Dinas Operasional & TU',
        ]);
    }

    /**
     * Display the Teknisi schedule matrix page.
     */
    public function teknisiIndex(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $jadwalBulanan = $this->getJadwalBulanan($bulan, $tahun);

        $pegawais = Pegawai::where('jenis_pegawai', 'PNS')
            ->where('role', 'Teknisi')
            ->orderBy('id')
            ->get();

        $shifts = MasterShift::where('category', 'teknisi')->orderBy('id')->get();
        $matrix = $this->getMatrixData($jadwalBulanan->id);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $holidays = $this->getHolidays($tahun);

        return Inertia::render('Jadwal/Teknisi', [
            'jadwalBulanan' => $jadwalBulanan,
            'pegawais' => $pegawais,
            'shifts' => $shifts,
            'matrix' => $matrix,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'holidays' => $holidays,
            'category' => 'teknisi',
            'pageTitle' => 'Jadwal Dinas Teknisi',
        ]);
    }

    /**
     * Display the PPNPN schedule matrix page.
     */
    public function ppnpnIndex(Request $request): Response
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $jadwalBulanan = $this->getJadwalBulanan($bulan, $tahun);

        $pegawais = Pegawai::where('jenis_pegawai', 'PPNPN')
            ->orderBy('id')
            ->get();

        $shifts = MasterShift::where('category', 'ppnpn')->orderBy('id')->get();
        $matrix = $this->getMatrixData($jadwalBulanan->id);
        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $holidays = $this->getHolidays($tahun);

        return Inertia::render('Jadwal/PPNPN', [
            'jadwalBulanan' => $jadwalBulanan,
            'pegawais' => $pegawais,
            'shifts' => $shifts,
            'matrix' => $matrix,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'holidays' => $holidays,
            'category' => 'ppnpn',
            'pageTitle' => 'Jadwal Dinas PPNPN',
        ]);
    }

    /**
     * Get or create monthly schedule record.
     */
    private function getJadwalBulanan(int $bulan, int $tahun): JadwalBulanan
    {
        return JadwalBulanan::firstOrCreate(
            ['bulan' => $bulan, 'tahun' => $tahun],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );
    }

    /**
     * Helper to fetch matrix data for a monthly schedule.
     */
    private function getMatrixData(int $jadwalBulananId): array
    {
        $details = JadwalDetail::with('shift')
            ->where('jadwal_bulanan_id', $jadwalBulananId)
            ->get();

        $matrix = [];
        foreach ($details as $detail) {
            $day = (int) Carbon::parse($detail->tanggal)->format('j');
            $matrix[$detail->pegawai_id][$day] = [
                'id' => $detail->id,
                'shift_id' => $detail->shift_id,
                'kode_shift' => $detail->shift->kode_shift ?? '',
            ];
        }

        return $matrix;
    }

    /**
     * Update a single detail cell shift.
     */
    public function updateCell(Request $request): RedirectResponse
    {
        $request->validate([
            'jadwal_bulanan_id' => ['required', 'exists:jadwal_bulanans,id'],
            'pegawai_id' => ['required', 'exists:pegawai,id'],
            'tanggal' => ['required', 'date'],
            'shift_id' => ['required', 'exists:master_shifts,id'],
        ]);

        JadwalDetail::updateOrCreate(
            [
                'pegawai_id' => $request->input('pegawai_id'),
                'tanggal' => $request->input('tanggal'),
            ],
            [
                'jadwal_bulanan_id' => $request->input('jadwal_bulanan_id'),
                'shift_id' => $request->input('shift_id'),
            ]
        );

        return redirect()->back()->with('success', 'Shift berhasil diperbarui.');
    }

    /**
     * Batch save multiple matrix cell changes at once.
     */
    public function batchUpdateCells(Request $request): RedirectResponse
    {
        $request->validate([
            'jadwal_bulanan_id' => ['required', 'exists:jadwal_bulanans,id'],
            'changes' => ['required', 'array'],
            'changes.*.pegawai_id' => ['required', 'exists:pegawai,id'],
            'changes.*.tanggal' => ['required', 'date'],
            'changes.*.shift_id' => ['required', 'exists:master_shifts,id'],
        ]);

        $jadwalBulananId = $request->input('jadwal_bulanan_id');
        $changes = $request->input('changes');

        DB::transaction(function () use ($jadwalBulananId, $changes) {
            foreach ($changes as $change) {
                JadwalDetail::updateOrCreate(
                    [
                        'pegawai_id' => $change['pegawai_id'],
                        'tanggal' => $change['tanggal'],
                    ],
                    [
                        'jadwal_bulanan_id' => $jadwalBulananId,
                        'shift_id' => $change['shift_id'],
                    ]
                );
            }
        });

        return redirect()->back()->with('success', count($changes) . ' perubahan shift berhasil disimpan.');
    }

    /**
     * Bulk update shifts for range of dates and employees.
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $request->validate([
            'jadwal_bulanan_id' => ['required', 'exists:jadwal_bulanans,id'],
            'pegawai_ids' => ['required', 'array'],
            'pegawai_ids.*' => ['exists:pegawai,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'shift_id' => ['required', 'exists:master_shifts,id'],
        ]);

        $startDate = Carbon::parse($request->input('start_date'));
        $endDate = Carbon::parse($request->input('end_date'));
        $pegawaiIds = $request->input('pegawai_ids');
        $shiftId = $request->input('shift_id');
        $jadwalBulananId = $request->input('jadwal_bulanan_id');

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateString = $date->toDateString();
            foreach ($pegawaiIds as $pegawaiId) {
                JadwalDetail::updateOrCreate(
                    [
                        'pegawai_id' => $pegawaiId,
                        'tanggal' => $dateString,
                    ],
                    [
                        'jadwal_bulanan_id' => $jadwalBulananId,
                        'shift_id' => $shiftId,
                    ]
                );
            }
        }

        return redirect()->back()->with('success', 'Pembaruan massal shift berhasil.');
    }

    /**
     * Store new master shift for specific category.
     */
    public function storeShift(Request $request): RedirectResponse
    {
        $category = $request->input('category', 'operasional');

        $request->validate([
            'category' => ['required', 'string', Rule::in(['operasional', 'teknisi', 'ppnpn'])],
            'kode_shift' => [
                'required',
                'string',
                'max:20',
                Rule::unique('master_shifts', 'kode_shift')->where(function ($query) use ($category) {
                    return $query->where('category', $category);
                }),
            ],
            'nama_shift' => ['required', 'string', 'max:255'],
            'jam_masuk' => ['nullable', 'string'],
            'jam_keluar' => ['nullable', 'string'],
            'is_tidak_masuk_kerja' => ['nullable', 'boolean'],
        ]);

        MasterShift::create([
            'category' => $category,
            'kode_shift' => strtoupper(trim($request->input('kode_shift'))),
            'nama_shift' => $request->input('nama_shift'),
            'jam_masuk' => $request->input('jam_masuk') ?: null,
            'jam_keluar' => $request->input('jam_keluar') ?: null,
            'is_tidak_masuk_kerja' => (bool) $request->input('is_tidak_masuk_kerja', false),
        ]);

        return redirect()->back()->with('success', 'Master Shift baru berhasil ditambahkan.');
    }

    /**
     * Update shift item.
     */
    public function updateShift(Request $request, MasterShift $shift): RedirectResponse
    {
        $category = $request->input('category', $shift->category);

        $request->validate([
            'category' => ['required', 'string', Rule::in(['operasional', 'teknisi', 'ppnpn'])],
            'kode_shift' => [
                'required',
                'string',
                'max:20',
                Rule::unique('master_shifts', 'kode_shift')
                    ->where(function ($query) use ($category) {
                        return $query->where('category', $category);
                    })
                    ->ignore($shift->id),
            ],
            'nama_shift' => ['required', 'string', 'max:255'],
            'jam_masuk' => ['nullable', 'string'],
            'jam_keluar' => ['nullable', 'string'],
            'is_tidak_masuk_kerja' => ['nullable', 'boolean'],
        ]);

        $shift->update([
            'category' => $category,
            'kode_shift' => strtoupper(trim($request->input('kode_shift'))),
            'nama_shift' => $request->input('nama_shift'),
            'jam_masuk' => $request->input('jam_masuk') ?: null,
            'jam_keluar' => $request->input('jam_keluar') ?: null,
            'is_tidak_masuk_kerja' => (bool) $request->input('is_tidak_masuk_kerja', false),
        ]);

        return redirect()->back()->with('success', 'Master Shift berhasil diperbarui.');
    }

    /**
     * Export schedule to PDF by category (operasional, teknisi, ppnpn).
     */
    public function exportPdf(Request $request)
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);
        $category = $request->input('category', 'operasional');

        $jadwalBulanan = JadwalBulanan::where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->firstOrFail();

        $query = Pegawai::query();
        $title = 'JADWAL DINAS OPERASIONAL OBSERVER METEOROLOGI & TU';

        if ($category === 'teknisi') {
            $query->where('jenis_pegawai', 'PNS')->where('role', 'Teknisi');
            $title = 'JADWAL DINAS TEKNISI METEOROLOGI';
        } elseif ($category === 'ppnpn') {
            $query->where('jenis_pegawai', 'PPNPN');
            $title = 'JADWAL DINAS PPNPN STASIUN METEOROLOGI';
        } else {
            $query->where('jenis_pegawai', 'PNS')->where(function ($q) {
                $q->where('role', '!=', 'Teknisi')->orWhereNull('role');
            });
        }

        $pegawais = $query->orderBy('id')->get();
        $shifts = MasterShift::where('category', $category)->orderBy('id')->get();

        $details = JadwalDetail::with('shift')
            ->where('jadwal_bulanan_id', $jadwalBulanan->id)
            ->get();

        $matrix = [];
        foreach ($details as $detail) {
            $day = (int) Carbon::parse($detail->tanggal)->format('j');
            $matrix[$detail->pegawai_id][$day] = $detail->shift->kode_shift ?? '';
        }

        $daysInMonth = Carbon::createFromDate($tahun, $bulan, 1)->daysInMonth;
        $holidays = $this->getHolidays($tahun);

        $pdf = Pdf::loadView('pdf.jadwal', [
            'jadwalBulanan' => $jadwalBulanan,
            'pegawais' => $pegawais,
            'shifts' => $shifts,
            'matrix' => $matrix,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'daysInMonth' => $daysInMonth,
            'holidays' => $holidays,
            'pdfTitle' => $title,
        ])->setPaper('a4', 'landscape');

        return $pdf->stream("Jadwal_Dinas_{$category}_{$bulan}_{$tahun}.pdf");
    }
}
