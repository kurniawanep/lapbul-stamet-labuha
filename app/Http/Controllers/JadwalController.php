<?php

namespace App\Http\Controllers;

use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\MasterShift;
use App\Models\Pegawai;
use App\Services\DutySyncService;
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
    protected DutySyncService $dutySyncService;

    public function __construct(DutySyncService $dutySyncService)
    {
        $this->dutySyncService = $dutySyncService;
    }
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

        $shifts = $this->getShiftsForJadwal($jadwalBulanan, 'operasional');
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

        $shifts = $this->getShiftsForJadwal($jadwalBulanan, 'teknisi');
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

        $shifts = $this->getShiftsForJadwal($jadwalBulanan, 'ppnpn');
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

    private function getShiftsForJadwal(JadwalBulanan $jadwalBulanan, string $category)
    {
        $shifts = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
            ->where('category', $category)
            ->orderBy('id')
            ->get();

        if ($shifts->isEmpty()) {
            $jadwalBulanan->copyMasterShifts();
            $shifts = JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
                ->where('category', $category)
                ->orderBy('id')
                ->get();
        }

        return $shifts;
    }

    /**
     * Get or create monthly schedule record.
     */
    private function getJadwalBulanan(int $bulan, int $tahun): JadwalBulanan
    {
        $jadwalBulanan = JadwalBulanan::firstOrCreate(
            ['bulan' => $bulan, 'tahun' => $tahun],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );

        $jadwalBulanan->copyMasterShifts();

        return $jadwalBulanan;
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
     * Helper to verify if user has permission to edit schedule in a given category.
     */
    private function authorizeScheduleEdit(Request $request, ?int $shiftId = null, ?string $category = null): void
    {
        $user = $request->user();
        if (!$user || $user->isSuperAdmin()) {
            return;
        }

        if ($shiftId) {
            $shift = JadwalBulananShift::find($shiftId);
            if ($shift) {
                $category = $shift->category;
            }
        }

        $category = $category ?: 'operasional';

        $permissionNeeded = match ($category) {
            'teknisi' => 'jadwal.teknisi.manage',
            'ppnpn' => 'jadwal.ppnpn.manage',
            default => 'jadwal.operasional.manage',
        };

        if (! $user->hasPermission($permissionNeeded)) {
            abort(403, "Anda tidak memiliki hak akses untuk mengubah jadwal dinas kategori {$category}.");
        }
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
            'shift_id' => ['required', 'exists:jadwal_bulanan_shifts,id'],
        ]);

        $this->authorizeScheduleEdit($request, (int) $request->input('shift_id'));

        $jadwalBulananId = $request->input('jadwal_bulanan_id');

        JadwalDetail::updateOrCreate(
            [
                'pegawai_id' => $request->input('pegawai_id'),
                'tanggal' => $request->input('tanggal'),
            ],
            [
                'jadwal_bulanan_id' => $jadwalBulananId,
                'shift_id' => $request->input('shift_id'),
            ]
        );

        $jb = JadwalBulanan::find($jadwalBulananId);
        if ($jb) {
            $this->dutySyncService->syncObservationsForPeriod($jb->bulan, $jb->tahun);
        }

        return redirect()->back()->with('success', 'Shift berhasil diperbarui dan data pengamatan diselaraskan.');
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
            'changes.*.shift_id' => ['required', 'exists:jadwal_bulanan_shifts,id'],
        ]);

        $changes = $request->input('changes');
        if (!empty($changes)) {
            $firstShiftId = (int) ($changes[0]['shift_id'] ?? 0);
            $this->authorizeScheduleEdit($request, $firstShiftId);
        }

        $jadwalBulananId = $request->input('jadwal_bulanan_id');

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

        $jb = JadwalBulanan::find($jadwalBulananId);
        if ($jb) {
            $this->dutySyncService->syncObservationsForPeriod($jb->bulan, $jb->tahun);
        }

        return redirect()->back()->with('success', count($changes) . ' perubahan shift berhasil disimpan & diselaraskan.');
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
            'shift_id' => ['required', 'exists:jadwal_bulanan_shifts,id'],
        ]);

        $this->authorizeScheduleEdit($request, (int) $request->input('shift_id'));

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

        $jb = JadwalBulanan::find($jadwalBulananId);
        if ($jb) {
            $this->dutySyncService->syncObservationsForPeriod($jb->bulan, $jb->tahun);
        }

        return redirect()->back()->with('success', 'Pembaruan massal shift berhasil & data pengamatan diselaraskan.');
    }

    /**
     * Display Master Shift catalog management page.
     */
    public function shiftsIndex(Request $request): Response
    {
        $category = $request->input('category', 'operasional');
        $bulan = (int) $request->input('bulan', Carbon::now('Asia/Jayapura')->month);
        $tahun = (int) $request->input('tahun', Carbon::now('Asia/Jayapura')->year);

        $jadwalBulanan = $this->getJadwalBulanan($bulan, $tahun);
        $shifts = $this->getShiftsForJadwal($jadwalBulanan, $category);
        $allMasterShifts = MasterShift::all();

        return Inertia::render('Jadwal/MasterShift', [
            'shifts' => $shifts,
            'allMasterShifts' => $allMasterShifts,
            'category' => $category,
            'bulan' => $bulan,
            'tahun' => $tahun,
            'jadwalBulanan' => $jadwalBulanan,
        ]);
    }

    /**
     * Store new shift for specific category.
     */
    public function storeShift(Request $request): RedirectResponse
    {
        $category = $request->input('category', 'operasional');
        $jadwalBulananId = $request->input('jadwal_bulanan_id');
        $bulan = $request->input('bulan');
        $tahun = $request->input('tahun');

        $this->authorizeScheduleEdit($request, null, $category);

        $request->validate([
            'category' => ['required', 'string', Rule::in(['operasional', 'teknisi', 'ppnpn'])],
            'kode_shift' => ['required', 'string', 'max:20'],
            'nama_shift' => ['required', 'string', 'max:255'],
            'jam_masuk' => ['nullable', 'string'],
            'jam_keluar' => ['nullable', 'string'],
            'is_tidak_masuk_kerja' => ['nullable', 'boolean'],
        ]);

        $kodeShift = strtoupper(trim($request->input('kode_shift')));
        $namaShift = $request->input('nama_shift');
        $jamMasuk = $request->input('jam_masuk') ?: null;
        $jamKeluar = $request->input('jam_keluar') ?: null;
        $isTidakMasuk = (bool) $request->input('is_tidak_masuk_kerja', false);

        DB::transaction(function () use ($category, $kodeShift, $namaShift, $jamMasuk, $jamKeluar, $isTidakMasuk, $jadwalBulananId) {
            $masterShift = MasterShift::create([
                'category' => $category,
                'kode_shift' => $kodeShift,
                'nama_shift' => $namaShift,
                'jam_masuk' => $jamMasuk,
                'jam_keluar' => $jamKeluar,
                'is_tidak_masuk_kerja' => $isTidakMasuk,
            ]);

            if ($jadwalBulananId) {
                JadwalBulananShift::create([
                    'jadwal_bulanan_id' => $jadwalBulananId,
                    'master_shift_id' => $masterShift->id,
                    'category' => $category,
                    'kode_shift' => $kodeShift,
                    'nama_shift' => $namaShift,
                    'jam_masuk' => $jamMasuk,
                    'jam_keluar' => $jamKeluar,
                    'is_tidak_masuk_kerja' => $isTidakMasuk,
                ]);
            }
        });

        // Trigger synchronization of operational observation data for the month
        if ($jadwalBulananId) {
            $jb = JadwalBulanan::find($jadwalBulananId);
            if ($jb) {
                $this->dutySyncService->syncObservationsForPeriod($jb->bulan, $jb->tahun);
            }
        } elseif ($bulan && $tahun) {
            $this->dutySyncService->syncObservationsForPeriod((int) $bulan, (int) $tahun);
        }

        return redirect()->back()->with('success', 'Master Shift baru berhasil ditambahkan dan data operasional telah diselaraskan.');
    }

    /**
     * Update shift item (monthly or master shift).
     */
    public function updateShift(Request $request, int $shiftId): RedirectResponse
    {
        $category = $request->input('category', 'operasional');
        $jadwalBulananId = $request->input('jadwal_bulanan_id');
        $bulan = $request->input('bulan');
        $tahun = $request->input('tahun');

        $this->authorizeScheduleEdit($request, $shiftId, $category);

        $request->validate([
            'category' => ['required', 'string', Rule::in(['operasional', 'teknisi', 'ppnpn'])],
            'kode_shift' => ['required', 'string', 'max:20'],
            'nama_shift' => ['required', 'string', 'max:255'],
            'jam_masuk' => ['nullable', 'string'],
            'jam_keluar' => ['nullable', 'string'],
            'is_tidak_masuk_kerja' => ['nullable', 'boolean'],
        ]);

        $kodeShift = strtoupper(trim($request->input('kode_shift')));
        $namaShift = $request->input('nama_shift');
        $jamMasuk = $request->input('jam_masuk') ?: null;
        $jamKeluar = $request->input('jam_keluar') ?: null;
        $isTidakMasuk = (bool) $request->input('is_tidak_masuk_kerja', false);

        $targetBulan = $bulan;
        $targetTahun = $tahun;

        DB::transaction(function () use ($shiftId, $category, $kodeShift, $namaShift, $jamMasuk, $jamKeluar, $isTidakMasuk, &$targetBulan, &$targetTahun) {
            $monthlyShift = JadwalBulananShift::find($shiftId);

            if ($monthlyShift) {
                if (!$targetBulan && $monthlyShift->jadwalBulanan) {
                    $targetBulan = $monthlyShift->jadwalBulanan->bulan;
                    $targetTahun = $monthlyShift->jadwalBulanan->tahun;
                }

                $monthlyShift->update([
                    'category' => $category,
                    'kode_shift' => $kodeShift,
                    'nama_shift' => $namaShift,
                    'jam_masuk' => $jamMasuk,
                    'jam_keluar' => $jamKeluar,
                    'is_tidak_masuk_kerja' => $isTidakMasuk,
                ]);

                if ($monthlyShift->master_shift_id) {
                    MasterShift::where('id', $monthlyShift->master_shift_id)->update([
                        'category' => $category,
                        'kode_shift' => $kodeShift,
                        'nama_shift' => $namaShift,
                        'jam_masuk' => $jamMasuk,
                        'jam_keluar' => $jamKeluar,
                        'is_tidak_masuk_kerja' => $isTidakMasuk,
                    ]);
                }
            } else {
                $masterShift = MasterShift::find($shiftId);
                if ($masterShift) {
                    $oldKode = $masterShift->kode_shift;
                    $masterShift->update([
                        'category' => $category,
                        'kode_shift' => $kodeShift,
                        'nama_shift' => $namaShift,
                        'jam_masuk' => $jamMasuk,
                        'jam_keluar' => $jamKeluar,
                        'is_tidak_masuk_kerja' => $isTidakMasuk,
                    ]);

                    JadwalBulananShift::where('master_shift_id', $masterShift->id)
                        ->orWhere(function ($q) use ($masterShift, $oldKode) {
                            $q->where('category', $masterShift->category)
                              ->where('kode_shift', $oldKode);
                        })
                        ->update([
                            'category' => $category,
                            'kode_shift' => $kodeShift,
                            'nama_shift' => $namaShift,
                            'jam_masuk' => $jamMasuk,
                            'jam_keluar' => $jamKeluar,
                            'is_tidak_masuk_kerja' => $isTidakMasuk,
                        ]);
                }
            }
        });

        if ($jadwalBulananId && (!$targetBulan || !$targetTahun)) {
            $jb = JadwalBulanan::find($jadwalBulananId);
            if ($jb) {
                $targetBulan = $jb->bulan;
                $targetTahun = $jb->tahun;
            }
        }

        if ($targetBulan && $targetTahun) {
            $this->dutySyncService->syncObservationsForPeriod((int) $targetBulan, (int) $targetTahun);
        }

        return redirect()->back()->with('success', 'Master Shift berhasil diperbarui dan seluruh data operasional bulan ' . ($targetBulan ?? '') . '/' . ($targetTahun ?? '') . ' telah diselaraskan.');
    }

    /**
     * Save all Master Shift changes in batch and resynchronize operational observation data for the month.
     */
    public function batchUpdateShifts(Request $request): RedirectResponse
    {
        $category = $request->input('category', 'operasional');
        $jadwalBulananId = $request->input('jadwal_bulanan_id');
        $bulan = (int) $request->input('bulan', Carbon::now('Asia/Jayapura')->month);
        $tahun = (int) $request->input('tahun', Carbon::now('Asia/Jayapura')->year);

        $this->authorizeScheduleEdit($request, null, $category);

        $request->validate([
            'category' => ['required', 'string', Rule::in(['operasional', 'teknisi', 'ppnpn'])],
            'shifts' => ['required', 'array'],
            'shifts.*.id' => ['required'],
            'shifts.*.kode_shift' => ['required', 'string', 'max:20'],
            'shifts.*.nama_shift' => ['required', 'string', 'max:255'],
            'shifts.*.jam_masuk' => ['nullable', 'string'],
            'shifts.*.jam_keluar' => ['nullable', 'string'],
            'shifts.*.is_tidak_masuk_kerja' => ['nullable', 'boolean'],
        ]);

        $shiftsInput = $request->input('shifts');

        DB::transaction(function () use ($shiftsInput, $category) {
            foreach ($shiftsInput as $item) {
                $shiftId = $item['id'];
                $kodeShift = strtoupper(trim($item['kode_shift']));
                $namaShift = $item['nama_shift'];
                $jamMasuk = $item['jam_masuk'] ?: null;
                $jamKeluar = $item['jam_keluar'] ?: null;
                $isTidakMasuk = (bool) ($item['is_tidak_masuk_kerja'] ?? false);

                $monthlyShift = JadwalBulananShift::find($shiftId);

                if ($monthlyShift) {
                    $monthlyShift->update([
                        'category' => $category,
                        'kode_shift' => $kodeShift,
                        'nama_shift' => $namaShift,
                        'jam_masuk' => $jamMasuk,
                        'jam_keluar' => $jamKeluar,
                        'is_tidak_masuk_kerja' => $isTidakMasuk,
                    ]);

                    if ($monthlyShift->master_shift_id) {
                        MasterShift::where('id', $monthlyShift->master_shift_id)->update([
                            'category' => $category,
                            'kode_shift' => $kodeShift,
                            'nama_shift' => $namaShift,
                            'jam_masuk' => $jamMasuk,
                            'jam_keluar' => $jamKeluar,
                            'is_tidak_masuk_kerja' => $isTidakMasuk,
                        ]);
                    }
                } else {
                    $masterShift = MasterShift::find($shiftId);
                    if ($masterShift) {
                        $oldKode = $masterShift->kode_shift;
                        $masterShift->update([
                            'category' => $category,
                            'kode_shift' => $kodeShift,
                            'nama_shift' => $namaShift,
                            'jam_masuk' => $jamMasuk,
                            'jam_keluar' => $jamKeluar,
                            'is_tidak_masuk_kerja' => $isTidakMasuk,
                        ]);

                        JadwalBulananShift::where('master_shift_id', $masterShift->id)
                            ->orWhere(function ($q) use ($masterShift, $oldKode) {
                                $q->where('category', $masterShift->category)
                              ->where('kode_shift', $oldKode);
                            })
                            ->update([
                                'category' => $category,
                                'kode_shift' => $kodeShift,
                                'nama_shift' => $namaShift,
                                'jam_masuk' => $jamMasuk,
                                'jam_keluar' => $jamKeluar,
                                'is_tidak_masuk_kerja' => $isTidakMasuk,
                            ]);
                    }
                }
            }
        });

        // Sync observations for this month
        $this->dutySyncService->syncObservationsForPeriod($bulan, $tahun);

        return redirect()->back()->with('success', 'Perubahan Master Shift berhasil disimpan dan seluruh data operasional bulan ' . $bulan . '/' . $tahun . ' telah diselaraskan.');
    }

    /**
     * Delete shift item (both monthly clone and master catalog if linked).
     */
    public function destroyShift(Request $request, int $shiftId): RedirectResponse
    {
        $bulan = $request->input('bulan');
        $tahun = $request->input('tahun');

        DB::transaction(function () use ($shiftId, &$bulan, &$tahun) {
            $monthlyShift = JadwalBulananShift::find($shiftId);

            if ($monthlyShift) {
                $category = $monthlyShift->category;
                $kodeShift = $monthlyShift->kode_shift;
                $masterShiftId = $monthlyShift->master_shift_id;

                if (!$bulan && $monthlyShift->jadwalBulanan) {
                    $bulan = $monthlyShift->jadwalBulanan->bulan;
                    $tahun = $monthlyShift->jadwalBulanan->tahun;
                }

                JadwalDetail::where('shift_id', $monthlyShift->id)->delete();
                $monthlyShift->delete();

                if ($masterShiftId) {
                    MasterShift::where('id', $masterShiftId)->delete();
                } else {
                    MasterShift::where('category', $category)->where('kode_shift', $kodeShift)->delete();
                }
            } else {
                $masterShift = MasterShift::find($shiftId);
                if ($masterShift) {
                    $monthlyShifts = JadwalBulananShift::where('master_shift_id', $masterShift->id)
                        ->orWhere(function ($q) use ($masterShift) {
                            $q->where('category', $masterShift->category)
                              ->where('kode_shift', $masterShift->kode_shift);
                        })->get();

                    foreach ($monthlyShifts as $ms) {
                        JadwalDetail::where('shift_id', $ms->id)->delete();
                        $ms->delete();
                    }

                    $masterShift->delete();
                }
            }
        });

        if ($bulan && $tahun) {
            $this->dutySyncService->syncObservationsForPeriod((int) $bulan, (int) $tahun);
        }

        return redirect()->back()->with('success', 'Master Shift berhasil dihapus.');
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
        $shifts = $this->getShiftsForJadwal($jadwalBulanan, $category);

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

    /**
     * Manual JSON endpoint to resync duty personnel for a month's observation records.
     */
    public function syncObservations(Request $request)
    {
        $bulan = (int) $request->input('bulan', 8);
        $tahun = (int) $request->input('tahun', 2026);

        $result = $this->dutySyncService->syncObservationsForPeriod($bulan, $tahun);

        return response()->json($result);
    }
}
