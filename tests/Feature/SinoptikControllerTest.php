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
        'role' => 'Observer & Forecaster',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/export/observation/by-station/preview*' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => [
                'total' => 1,
                'headers' => ['station_name', 'data_timestamp', 'wind_dir_deg_dd', 'wind_speed_ff', 'visibility_vv', 'cloud_cover_oktas_m', 'temp_drybulb_c', 'temp_wetbulb_c', 'temp_dewpoint_c_tdtdtd', 'humidity_pc', 'pressure_qff_mb_derived', 'pressure_qfe_mb_derived', 'temp_max_c', 'temp_min_c', 'rainfall_last_mm', 'sandi_sinoptik', 'received_timestamp', 'sent_timestamp', 'observer_name'],
                'rows' => [
                    [
                        'Stasiun Meteorologi Oesman Sadik',
                        '2026-08-01T00:00:00Z',
                        359, 4, 1, 9, 2, 2, "0", "0", null, null, 3, 0, 27, null, 21.5, 24.6, "3", "8", "3", "2", "2", "1", "1", "8", "6", "", "3", "", "0", "", 540, 570, null, 2400, null, 6300, null, 2100, null, "1", "1", "", "1", "", "1", "", 0, 0, null, 0, null, 0, null, 3, null, 0, null, null, 1938.6, 10, 4.6, 0, 0, "", "SMID54 WAEL 010000\nAAXX 01004...", false, false, false, false, false, false, false, false, false, false, false, false, 1010.5, 1008.9, 23.7, 82, 8, 540, 1, null, null, null, null, null, null, null, null, null, 1.2, 0.5, 0, 0, "SMID54 WAEL 010000\nAAXX 01004...", "2026-08-01T00:00:15Z", "2026-08-01T00:00:15Z", 1, "{}", "Dinar C. Nirwana"
                    ]
                ]
            ],
        ], 200),
        '*/api/v21/monitoring/gts/synoptic/daily/date/*' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => []
        ], 200),
    ]);

    $jadwalBulanan = \App\Models\JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);
    $shift = \App\Models\JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI',
        'jam_masuk' => '00:00:00',
        'jam_keluar' => '23:59:59',
    ]);
    \App\Models\JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $user->id,
        'tanggal' => '2026-08-01',
        'shift_id' => $shift->id,
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncSinoptikData('2026-08-01T00:00:00Z', '2026-08-03T23:59:59Z', 138);

    expect($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_sinoptik', [
        'data_timestamp' => '2026-08-01 00:00:00',
        'pegawai_id' => $user->id,
        'observer_name' => 'Dinar C. Nirwana',
    ]);
});
