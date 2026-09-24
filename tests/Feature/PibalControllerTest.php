<?php

use App\Models\DataPibal;
use App\Models\Pegawai;
use App\Services\BmkgsoftService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view pibal monthly report page with pagination', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);

    DataPibal::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-10 00:00:00',
        'observer_name' => 'Rezky Ramadhan',
        'pegawai_id' => $user->id,
        'raw_pibal' => 'PPAA 60001 97460',
        'penghentian_pengamatan' => 'BURST',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/pibal?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Pibal')
        ->has('pibalRecords.data', 1)
        ->where('bulan', 8)
        ->where('tahun', 2026)
    );
});

test('pibal sync fetches and stores data into data_pibal table', function () {
    $user = Pegawai::create([
        'nama' => 'Rezky Ramadhan',
        'email' => 'rezky@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/db/bmkgsatu/@export_data*' => Http::response([
            'data' => [
                [
                    'station_id' => 138,
                    'alias_station_id' => 97460,
                    'station_name' => 'Stasiun Meteorologi Oesman Sadik',
                    'data_timestamp' => '2026-08-10T00:00:00',
                    'observer_name' => 'Rezky Ramadhan',
                    'wind_dir_surface' => 180.0,
                    'wind_speed_surface' => 5.0,
                    'sandi_pibal' => 'PPAA 60001 97460',
                    'penghentian_pengamatan' => 'BURST',
                ],
            ],
        ], 200),
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncPibalData('2026-08-01T00:00', '2026-08-10T23:59', 138);

    expect($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_pibal', [
        'station_id' => 138,
        'observer_name' => 'Rezky Ramadhan',
        'pegawai_id' => $user->id,
    ]);
});

test('pibal timeliness logic evaluates -15 to +45 minutes window correctly', function () {
    $user = Pegawai::create([
        'nama' => 'Test Observer',
        'email' => 'observer@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);

    // 1. Sent at 23:45 UTC (Window Start: 15 mins before 00:00) -> Tepat Waktu
    DataPibal::create([
        'station_id' => 138,
        'data_timestamp' => '2026-08-10 00:00:00',
        'sent_timestamp' => '2026-08-09 23:45:00',
        'raw_pibal' => 'PPAA 60001 97460',
    ]);

    // 2. Sent at 00:45 UTC (Window End: 45 mins after 00:00) -> Tepat Waktu
    DataPibal::create([
        'station_id' => 138,
        'data_timestamp' => '2026-08-11 00:00:00',
        'sent_timestamp' => '2026-08-11 00:45:00',
        'raw_pibal' => 'PPAA 61001 97460',
    ]);

    // 3. Sent at 23:44 UTC (16 mins before 00:00) -> Lebih Awal
    DataPibal::create([
        'station_id' => 138,
        'data_timestamp' => '2026-08-12 00:00:00',
        'sent_timestamp' => '2026-08-11 23:44:00',
        'raw_pibal' => 'PPAA 62001 97460',
    ]);

    // 4. Sent at 00:46 UTC (46 mins after 00:00) -> Terlambat
    DataPibal::create([
        'station_id' => 138,
        'data_timestamp' => '2026-08-13 00:00:00',
        'sent_timestamp' => '2026-08-13 00:46:00',
        'raw_pibal' => 'PPAA 63001 97460',
    ]);

    $response = $this->actingAs($user)->get('/laporan/pibal?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(function ($page) {
        $page->component('Laporan/Pibal');
        $records = $page->toArray()['props']['pibalRecords']['data'];

        $item2345 = collect($records)->firstWhere('data_timestamp', '2026-08-10 00:00:00');
        $item0045 = collect($records)->firstWhere('data_timestamp', '2026-08-11 00:00:00');
        $item2344 = collect($records)->firstWhere('data_timestamp', '2026-08-12 00:00:00');
        $item0046 = collect($records)->firstWhere('data_timestamp', '2026-08-13 00:00:00');

        expect($item2345['monitoring_status'])->toBe('tepat_waktu')
            ->and($item0045['monitoring_status'])->toBe('tepat_waktu')
            ->and($item2344['monitoring_status'])->toBe('lebih_awal')
            ->and($item0046['monitoring_status'])->toBe('terlambat');
    });
});

test('pibal sync assigns duty to PF when scheduled and falls back to P when absent', function () {
    $forecaster = Pegawai::create([
        'nama' => 'FORECASTER LABUHA',
        'email' => 'fc@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    $pagiObs = Pegawai::create([
        'nama' => 'PAGI OBSERVER',
        'email' => 'obs@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    $jadwal = \App\Models\JadwalBulanan::firstOrCreate(
        ['bulan' => 8, 'tahun' => 2026],
        ['stasiun' => 'Stasiun Meteorologi Oesman Sadik']
    );

    $shiftPF = \App\Models\JadwalBulananShift::firstOrCreate(
        ['jadwal_bulanan_id' => $jadwal->id, 'kode_shift' => 'PF'],
        [
            'category' => 'operasional',
            'nama_shift' => 'PAGI FORECAST',
            'jam_masuk' => '07:30:00',
            'jam_keluar' => '15:30:00',
            'is_tidak_masuk_kerja' => false,
        ]
    );

    $shiftP = \App\Models\JadwalBulananShift::firstOrCreate(
        ['jadwal_bulanan_id' => $jadwal->id, 'kode_shift' => 'P'],
        [
            'category' => 'operasional',
            'nama_shift' => 'PAGI OBS',
            'jam_masuk' => '07:30:00',
            'jam_keluar' => '15:30:00',
            'is_tidak_masuk_kerja' => false,
        ]
    );

    // 2026-08-20: HAS both PF and P
    \App\Models\JadwalDetail::updateOrCreate(
        ['pegawai_id' => $forecaster->id, 'tanggal' => '2026-08-20'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftPF->id]
    );
    \App\Models\JadwalDetail::updateOrCreate(
        ['pegawai_id' => $pagiObs->id, 'tanggal' => '2026-08-20'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftP->id]
    );

    // 2026-08-21: ONLY has P (no PF scheduled)
    \App\Models\JadwalDetail::updateOrCreate(
        ['pegawai_id' => $pagiObs->id, 'tanggal' => '2026-08-21'],
        ['jadwal_bulanan_id' => $jadwal->id, 'shift_id' => $shiftP->id]
    );

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_token']], 200),
        '*/db/bmkgsatu/@export_data*' => Http::response([
            'data' => [
                [
                    'station_id' => 138,
                    'data_timestamp' => '2026-08-20T00:00:00', // 09:00 WIT -> has PF
                    'observer_name' => 'Unknown',
                    'sandi_pibal' => 'PPAA 60001 97460',
                ],
                [
                    'station_id' => 138,
                    'data_timestamp' => '2026-08-21T00:00:00', // 09:00 WIT -> only P
                    'observer_name' => 'Unknown',
                    'sandi_pibal' => 'PPAA 61001 97460',
                ],
            ],
        ], 200),
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncPibalData('2026-08-20T00:00', '2026-08-21T23:59', 138);

    expect($result['synced_count'])->toBe(2);

    $pibal1 = DataPibal::where('data_timestamp', '2026-08-20 00:00:00')->first();
    expect($pibal1->pegawai_id)->toBe($forecaster->id);

    $pibal2 = DataPibal::where('data_timestamp', '2026-08-21 00:00:00')->first();
    expect($pibal2->pegawai_id)->toBe($pagiObs->id);
});

