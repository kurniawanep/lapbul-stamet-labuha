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

test('duty sync service associates 11:00 UTC synop with M1 instead of S even when overlapping teknisi or ppnpn shifts exist', function () {
    $mirza = Pegawai::create([
        'nama' => 'MIRZA CHRISANDY PESULIMA, S.Tr',
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);
    $rezky = Pegawai::create([
        'nama' => 'REZKY RAMADHAN, S.Tr. Met.',
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);
    $teknisi = Pegawai::create([
        'nama' => 'TEKNISI SIANG',
        'jenis_pegawai' => 'PNS',
        'role' => 'Teknisi',
    ]);
    $ppnpn = Pegawai::create([
        'nama' => 'PPNPN SIANG',
        'jenis_pegawai' => 'PPNPN',
        'role' => 'PPNPN',
    ]);

    $jadwal = JadwalBulanan::firstOrCreate(
        ['bulan' => 11, 'tahun' => 2026],
        ['stasiun' => 'Stasiun Meteorologi Oesman Sadik']
    );

    $shiftS = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'category' => 'operasional',
        'kode_shift' => 'S',
        'nama_shift' => 'SIANG OBS',
        'jam_masuk' => '13:30:00',
        'jam_keluar' => '19:45:00',
        'is_tidak_masuk_kerja' => false,
    ]);
    $shiftM1 = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'category' => 'operasional',
        'kode_shift' => 'M1',
        'nama_shift' => 'MALAM 1',
        'jam_masuk' => '19:30:00',
        'jam_keluar' => '01:30:00',
        'is_tidak_masuk_kerja' => false,
    ]);
    $shiftST = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'category' => 'teknisi',
        'kode_shift' => 'ST',
        'nama_shift' => 'SIANG TEKNISI',
        'jam_masuk' => '14:30:00',
        'jam_keluar' => '22:00:00',
        'is_tidak_masuk_kerja' => false,
    ]);
    $shiftSPpnpn = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'category' => 'ppnpn',
        'kode_shift' => 'S',
        'nama_shift' => 'SIANG PPNPN',
        'jam_masuk' => '13:30:00',
        'jam_keluar' => '20:30:00',
        'is_tidak_masuk_kerja' => false,
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $rezky->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftS->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $mirza->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftM1->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $teknisi->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftST->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $ppnpn->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftSPpnpn->id,
    ]);

    $sinop09 = DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-11-01 09:00:00', // 18:00 WIT -> S (Rezky)
        'observer_name' => 'Wrong Observer',
    ]);
    $sinop11 = DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-11-01 11:00:00', // 20:00 WIT -> M1 (Mirza)
        'observer_name' => $rezky->nama,
        'pegawai_id' => $rezky->id,
    ]);
    $sinop12 = DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-11-01 12:00:00', // 21:00 WIT -> M1 (Mirza)
        'observer_name' => $rezky->nama,
        'pegawai_id' => $rezky->id,
    ]);

    $service = app(DutySyncService::class);
    $result = $service->syncObservationsForPeriod(11, 2026);

    expect($result['success'])->toBeTrue();

    $sinop09->refresh();
    expect($sinop09->pegawai_id)->toBe($rezky->id);
    expect($sinop09->observer_name)->toBe($rezky->nama);

    $sinop11->refresh();
    expect($sinop11->pegawai_id)->toBe($mirza->id);
    expect($sinop11->observer_name)->toBe($mirza->nama);
    expect($sinop11->teknisi_id)->toBe($teknisi->id);
    expect($sinop11->ppnpn_id)->toBe($ppnpn->id);

    $sinop12->refresh();
    expect($sinop12->pegawai_id)->toBe($mirza->id);
    expect($sinop12->observer_name)->toBe($mirza->nama);
});

