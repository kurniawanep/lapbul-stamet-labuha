<?php

use App\Models\DataTafor;
use App\Models\Pegawai;
use App\Services\BmkgsoftService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view tafor monthly report page with pagination', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'is_superadmin' => true,
        'role' => 'Super Admin',
    ]);

    DataTafor::create([
        'bmkgsoft_entry_id' => 6909459,
        'station_id' => 138,
        'alias_station_id' => 97460,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'cccc' => 'WAEL',
        'ttaaii' => 'FTID40',
        'type_message' => 'taf',
        'data_timestamp' => '2026-08-13 11:00:00',
        'sandi' => "FTID40 WAEL 131100\nTAF WAEL 131100Z 1312/1412 08004KT 9000 FEW019 BECMG 1314/1316 00000KT=",
        'status' => 'sent',
        'sender_username' => 'root',
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/tafor?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Tafor')
        ->has('taforRecords.data', 1)
        ->where('bulan', 8)
        ->where('tahun', 2026)
    );
});

test('tafor sync fetches and stores data into data_tafor table using 10-day chunks', function () {
    $user = Pegawai::create([
        'nama' => 'Rezky Ramadhan',
        'email' => 'rezky@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'is_superadmin' => true,
        'role' => 'Super Admin',
        'role' => 'Observer & Forecaster',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/gts/entry*' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => [
                [
                    'id' => 6909459,
                    'bmkgsoft_id' => 138,
                    'station_name' => 'Stasiun Meteorologi Oesman Sadik',
                    'data_timestamp' => '2026-08-01T11:00:00Z',
                    'received_timestamp' => '2026-08-01T10:43:08Z',
                    'sent_timestamp' => '2026-08-01T10:43:08Z',
                    'type_message' => 'taf',
                    'ttaaii' => 'FTID40',
                    'cccc' => 'WAEL',
                    'bbb' => null,
                    'sandi' => 'FTID40 WAEL 011100\nTAF WAEL 011100Z 0112/0212 00000KT 9999 FEW020 BECMG 0203/0205 25008KT=',
                    'status' => 'sent',
                    'sender_username' => 'Rezky Ramadhan',
                ],
            ],
        ], 200),
    ]);

    $jadwalBulanan = \App\Models\JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);
    $shift = \App\Models\JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '23:59:59',
    ]);
    \App\Models\JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $user->id,
        'tanggal' => '2026-08-01',
        'shift_id' => $shift->id,
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncTaforData('2026-08-01T00:00:00Z', '2026-08-01T23:59:59Z', 138);

    expect($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_tafor', [
        'bmkgsoft_entry_id' => 6909459,
        'cccc' => 'WAEL',
        'ttaaii' => 'FTID40',
        'pegawai_id' => $user->id,
        'status' => 'sent',
    ]);
});

test('tafor sync assigns duty to PF when scheduled and falls back to P when absent', function () {
    $forecaster = Pegawai::create([
        'nama' => 'FORECASTER TAFOR',
        'email' => 'fc_taf@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    $pagiObs = Pegawai::create([
        'nama' => 'PAGI OBS TAFOR',
        'email' => 'obs_taf@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    $jadwal = \App\Models\JadwalBulanan::create(['bulan' => 9, 'tahun' => 2026]);

    $shiftPF = \App\Models\JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'kode_shift' => 'PF',
        'nama_shift' => 'PAGI FORECAST',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '15:30:00',
        'is_tidak_masuk_kerja' => false,
    ]);

    $shiftP = \App\Models\JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI OBS',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '15:30:00',
        'is_tidak_masuk_kerja' => false,
    ]);

    // Day 1 (2026-09-01): HAS both PF and P
    \App\Models\JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $forecaster->id,
        'tanggal' => '2026-09-01',
        'shift_id' => $shiftPF->id,
    ]);
    \App\Models\JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $pagiObs->id,
        'tanggal' => '2026-09-01',
        'shift_id' => $shiftP->id,
    ]);

    // Day 2 (2026-09-02): ONLY has P
    \App\Models\JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwal->id,
        'pegawai_id' => $pagiObs->id,
        'tanggal' => '2026-09-02',
        'shift_id' => $shiftP->id,
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/gts/entry*' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => [
                [
                    'id' => 101,
                    'bmkgsoft_id' => 138,
                    'station_name' => 'Stasiun Meteorologi Oesman Sadik',
                    'data_timestamp' => '2026-09-01T05:00:00Z', // 14:00 WIT -> Day 1 (has PF)
                    'type_message' => 'taf',
                    'ttaaii' => 'FTID40',
                    'cccc' => 'WAEL',
                    'status' => 'sent',
                    'sender_username' => 'Unknown',
                ],
                [
                    'id' => 102,
                    'bmkgsoft_id' => 138,
                    'station_name' => 'Stasiun Meteorologi Oesman Sadik',
                    'data_timestamp' => '2026-09-02T05:00:00Z', // 14:00 WIT -> Day 2 (only P)
                    'type_message' => 'taf',
                    'ttaaii' => 'FTID40',
                    'cccc' => 'WAEL',
                    'status' => 'sent',
                    'sender_username' => 'Unknown',
                ],
            ],
        ], 200),
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncTaforData('2026-09-01T00:00:00Z', '2026-09-02T23:59:59Z', 138);

    expect($result['synced_count'])->toBe(2);

    $tafor1 = DataTafor::where('data_timestamp', '2026-09-01 05:00:00')->first();
    expect($tafor1->pegawai_id)->toBe($forecaster->id);

    $tafor2 = DataTafor::where('data_timestamp', '2026-09-02 05:00:00')->first();
    expect($tafor2->pegawai_id)->toBe($pagiObs->id);
});

