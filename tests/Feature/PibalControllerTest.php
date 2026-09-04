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
