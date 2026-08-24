<?php

use App\Models\DataSinoptik;
use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use App\Services\DutySyncService;

test('duty sync service resynchronizes observation records with updated duty schedules', function () {
    $observer = Pegawai::firstOrCreate(
        ['nama' => 'Test Observer'],
        [
            'nip' => '1234567890',
            'jenis_pegawai' => 'PNS',
            'role' => 'Observer',
        ]
    );

    $jadwal = JadwalBulanan::firstOrCreate(
        ['bulan' => 8, 'tahun' => 2026],
        ['stasiun' => 'Stasiun Meteorologi Oesman Sadik']
    );

    $shiftPagi = JadwalBulananShift::firstOrCreate(
        ['jadwal_bulanan_id' => $jadwal->id, 'kode_shift' => 'P'],
        [
            'category' => 'operasional',
            'nama_shift' => 'PAGI',
            'jam_masuk' => '07:00:00',
            'jam_keluar' => '13:30:00',
            'is_tidak_masuk_kerja' => false,
        ]
    );

    JadwalDetail::updateOrCreate(
        [
            'pegawai_id' => $observer->id,
            'tanggal' => '2026-08-01',
        ],
        [
            'jadwal_bulanan_id' => $jadwal->id,
            'shift_id' => $shiftPagi->id,
        ]
    );

    $sinop = DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-01 00:00:00', // 09:00 WIT -> Shift Pagi (07:00 - 13:30)
        'observer_name' => 'Old Name',
    ]);

    $service = app(DutySyncService::class);
    $result = $service->syncObservationsForPeriod(8, 2026);

    expect($result['success'])->toBeTrue();

    $sinop->refresh();
    expect($sinop->pegawai_id)->toBe($observer->id);
});
