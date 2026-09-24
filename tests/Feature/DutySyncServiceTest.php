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

test('duty sync service assigns pibal and tafor to PF when scheduled and falls back to P when PF is absent', function () {
    $pegawaiPF = Pegawai::create([
        'nama' => 'FORECASTER LABUHA',
        'nip' => '199001012015011001',
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);

    $pegawaiP = Pegawai::create([
        'nama' => 'OBSERVER PAGI',
        'nip' => '199202022016021002',
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer',
    ]);

    $jadwal = JadwalBulanan::firstOrCreate(
        ['bulan' => 9, 'tahun' => 2026],
        ['stasiun' => 'Stasiun Meteorologi Oesman Sadik']
    );

    $shiftPF = JadwalBulananShift::firstOrCreate(
        ['jadwal_bulanan_id' => $jadwal->id, 'kode_shift' => 'PF'],
        [
            'category' => 'operasional',
            'nama_shift' => 'PAGI FORECAST',
            'jam_masuk' => '07:30:00',
            'jam_keluar' => '15:30:00',
            'is_tidak_masuk_kerja' => false,
        ]
    );

    $shiftP = JadwalBulananShift::firstOrCreate(
        ['jadwal_bulanan_id' => $jadwal->id, 'kode_shift' => 'P'],
        [
            'category' => 'operasional',
            'nama_shift' => 'PAGI OBS',
            'jam_masuk' => '07:30:00',
            'jam_keluar' => '15:30:00',
            'is_tidak_masuk_kerja' => false,
        ]
    );

    // Day 1 (2026-09-01): HAS both PF and P
    JadwalDetail::updateOrCreate(
        ['pegawai_id' => $pegawaiPF->id, 'tanggal' => '2026-09-01'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftPF->id]
    );
    JadwalDetail::updateOrCreate(
        ['pegawai_id' => $pegawaiP->id, 'tanggal' => '2026-09-01'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftP->id]
    );

    // Day 2 (2026-09-02): ONLY has P (no PF scheduled)
    JadwalDetail::updateOrCreate(
        ['pegawai_id' => $pegawaiP->id, 'tanggal' => '2026-09-02'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftP->id]
    );

    // Create PIBAL & TAFOR records for Day 1 and Day 2
    $pibalDay1 = \App\Models\DataPibal::create([
        'data_timestamp' => '2026-09-01 00:00:00', // 09:00 WIT -> Day 1 (has PF)
        'observer_name' => 'Old Name',
    ]);
    $taforDay1 = \App\Models\DataTafor::create([
        'data_timestamp' => '2026-09-01 05:00:00', // 14:00 WIT -> Day 1 (has PF)
        'observer_name' => 'Old Name',
    ]);

    $pibalDay2 = \App\Models\DataPibal::create([
        'data_timestamp' => '2026-09-02 00:00:00', // 09:00 WIT -> Day 2 (no PF, only P)
        'observer_name' => 'Old Name',
    ]);
    $taforDay2 = \App\Models\DataTafor::create([
        'data_timestamp' => '2026-09-02 05:00:00', // 14:00 WIT -> Day 2 (no PF, only P)
        'observer_name' => 'Old Name',
    ]);

    $service = app(DutySyncService::class);
    $result = $service->syncObservationsForPeriod(9, 2026);

    expect($result['success'])->toBeTrue();

    // Day 1 must be assigned to PF
    $pibalDay1->refresh();
    expect($pibalDay1->pegawai_id)->toBe($pegawaiPF->id);
    expect($pibalDay1->observer_name)->toBe($pegawaiPF->nama);

    $taforDay1->refresh();
    expect($taforDay1->pegawai_id)->toBe($pegawaiPF->id);
    expect($taforDay1->observer_name)->toBe($pegawaiPF->nama);

    // Day 2 must fallback to P
    $pibalDay2->refresh();
    expect($pibalDay2->pegawai_id)->toBe($pegawaiP->id);
    expect($pibalDay2->observer_name)->toBe($pegawaiP->nama);

    $taforDay2->refresh();
    expect($taforDay2->pegawai_id)->toBe($pegawaiP->id);
    expect($taforDay2->observer_name)->toBe($pegawaiP->nama);
});

