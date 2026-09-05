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

    $metReport = \App\Models\DataMetReport::create([
        'station_code' => 'WAEL',
        'station_name' => 'Oesman Sadik Airport (WAEL)',
        'data_timestamp' => '2026-08-01 00:00:00', // 09:00 WIT -> Shift Pagi
        'observer_name' => 'Old Observer',
        'wind' => 'CALM',
        'visibility' => '9 KM',
    ]);

    $flightDoc = \App\Models\DataFlightDocument::create([
        'station_code' => 'WAEL',
        'no_fd' => 'BMKG-FD-TEST-SYNC',
        'departure_at' => '2026-08-01 00:00:00', // 09:00 WIT -> Shift Pagi
        'flight_number' => 'IW-1173',
        'status' => 'Selesai',
        'observer_name' => 'Old Observer',
    ]);

    $service = app(DutySyncService::class);
    $result = $service->syncObservationsForPeriod(8, 2026);

    expect($result['success'])->toBeTrue();

    $sinop->refresh();
    expect($sinop->pegawai_id)->toBe($observer->id);

    $metReport->refresh();
    expect($metReport->pegawai_id)->toBe($observer->id);
    expect($metReport->observer_name)->toBe($observer->nama);

    $flightDoc->refresh();
    expect($flightDoc->pegawai_id)->toBe($observer->id);
    expect($flightDoc->observer_name)->toBe($observer->nama);
});
