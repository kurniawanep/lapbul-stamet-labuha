<?php

use App\Models\DataSinoptik;
use App\Models\Pegawai;
use Illuminate\Support\Facades\Hash;

test('authenticated user can view thunderstorm dashboard page with yearly matrix and statistics', function () {
    $user = Pegawai::create([
        'nama' => 'Test Observer',
        'email' => 'observer_ts@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'is_superadmin' => true,
    ]);

    DataSinoptik::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-05 06:00:00',
        'present_weather_ww' => '95',
        'past_weather_w1' => '9',
        'past_weather_w2' => '2',
        'sandi' => "SMID54 WAEL 050600\nAAXX 05064\n97460...",
        'temp_drybulb' => 28.0,
        'temp_dewpoint' => 25.0,
        'humidity' => 84.0,
        'wind_dir' => 120.0,
        'wind_speed' => 10.0,
        'visibility' => 6.0,
        'observer_name' => 'Test Observer',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/thunderstorm?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Thunderstorm')
        ->has('thunderstormRecords.data', 1)
        ->where('bulan', 8)
        ->where('tahun', 2026)
        ->has('yearlyMatrixInfo.matrix')
        ->where('dashboardStats.monthly_ts_days', 1)
        ->where('dashboardStats.monthly_ts_slots', 1)
        ->where('dashboardStats.active_ts_count', 1)
    );
});

test('authenticated user can download thunderstorm docx export', function () {
    $user = Pegawai::create([
        'nama' => 'Test Observer 2',
        'email' => 'observer_ts2@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'is_superadmin' => true,
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/thunderstorm/export-docx?tahun=2026&bulan=8');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
