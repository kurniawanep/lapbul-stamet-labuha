<?php

use App\Models\DataPibal;
use App\Models\Pegawai;
use App\Services\BmkgsoftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

test('authenticated user can view pibal monthly report page with pagination', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    DataPibal::create([
        'station_id' => 138,
        'alias_station_id' => 97460,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-09 00:00:00',
        'observer_name' => 'Rezky Ramadhan',
        'wind_dir_surface' => 10.0,
        'wind_speed_surface' => 2.0,
        'penghentian_pengamatan' => 'LIC',
        'sandi_pibal' => "PPAA 59001 97460\nNIL=",
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
                'pembacaan_azimuth_elevasi' => [
                    '1' => ['azimuth' => '180.0', 'elevasi' => '45.0'],
                ],
                'hasil_lapisan_wd_ws_dddff' => [
                    '1' => ['lapisan' => 1000, 'wd' => 180, 'ws' => 5, 'dddff' => '18005'],
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
        'penghentian_pengamatan' => 'BURST',
    ]);
});
