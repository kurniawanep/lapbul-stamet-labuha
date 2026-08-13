<?php

use App\Models\DataSinoptik;
use App\Models\Pegawai;
use App\Services\BmkgsoftService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view sinoptik monthly report page with pagination', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-01 00:00:00',
        'sandi' => "SMID54 WAEL 010000\nAAXX 01004\n97460 32460...",
        'temp_drybulb' => 26.4,
        'temp_max' => 31.0,
        'temp_min' => 20.3,
        'temp_wetbulb' => 23.4,
        'temp_dewpoint' => 22.2,
        'humidity' => 78.0,
        'pressure_qff' => 1011.4,
        'pressure_qfe' => 1009.8,
        'wind_dir' => 49.0,
        'wind_speed' => 4.0,
        'visibility' => 10.0,
        'observer_name' => 'Dinar C. Nirwana',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/sinoptik?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Sinoptik')
        ->has('sinoptikRecords.data', 1)
        ->where('bulan', 8)
        ->where('tahun', 2026)
    );
});

test('sinoptik sync fetches and stores observation data into data_sinoptik table', function () {
    $user = Pegawai::create([
        'nama' => 'Dinar C. Nirwana',
        'email' => 'dinar@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/export/observation/by-station/preview' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => [
                'headers' => [
                    'station_name', 'data_timestamp', 'wind_dir_deg_dd', 'wind_speed_ff',
                    'temp_drybulb_c_tttttt', 'temp_max_c_txtxtx', 'temp_min_c_tntntn',
                    'relative_humidity_pc', 'pressure_qff_mb_derived', 'pressure_qfe_mb_derived',
                    'edited_encoded_synop', 'observer_name'
                ],
                'rows' => [
                    [
                        'Stasiun Meteorologi Oesman Sadik',
                        '2026-08-01T00:00:00Z',
                        49,
                        4,
                        26.4,
                        31.0,
                        20.3,
                        78,
                        1011.4,
                        1009.8,
                        "SMID54 WAEL 010000\nAAXX 01004\n97460 32460...",
                        'Dinar C. Nirwana'
                    ]
                ],
            ],
        ], 200),
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncSinoptikData('2026-08-01T00:00:00Z', '2026-08-10T23:59:59Z', 138);

    expect($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_sinoptik', [
        'data_timestamp' => '2026-08-01 00:00:00',
        'temp_drybulb' => 26.4,
        'humidity' => 78.0,
        'pegawai_id' => $user->id,
        'observer_name' => 'Dinar C. Nirwana',
    ]);
});
