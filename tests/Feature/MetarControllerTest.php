<?php

use App\Models\DataMetar;
use App\Models\Pegawai;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view metar monthly report page with dashboard stats', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin_metar@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    DataMetar::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-08-10 00:00:00',
        'observer_name' => 'Rezky Ramadhan',
        'pegawai_id' => $user->id,
        'sandi' => 'METAR WAEL 100000Z 18005KT 9999 FEW018 28/24 Q1010=',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/metar?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Metar')
        ->has('metarRecords.data', 1)
        ->has('dashboardStats')
        ->where('bulan', 8)
        ->where('tahun', 2026)
    );
});

test('metar sync fetches and stores data into data_metar table', function () {
    $user = Pegawai::create([
        'nama' => 'Rezky Ramadhan',
        'email' => 'rezky_metar@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/gts/entry*' => Http::response([
            'data' => [
                [
                    'id' => 999,
                    'station_id' => 138,
                    'cccc' => 'WAEL',
                    'station_name' => 'Oesman Sadik',
                    'data_timestamp' => '2026-08-10T00:00:00.000Z',
                    'received_timestamp' => '2026-08-10T00:01:00.000Z',
                    'sent_timestamp' => '2026-08-10T00:01:00.000Z',
                    'sandi' => 'METAR WAEL 100000Z 18005KT 9999 FEW018 28/24 Q1010=',
                    'sender_username' => 'rezky',
                ]
            ]
        ], 200),
    ]);

    $response = $this->actingAs($user)
        ->post('/laporan/metar/sync', [
            'bulan' => 8,
            'tahun' => 2026,
        ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('data_metar', [
        'station_id' => 138,
        'cccc' => 'WAEL',
    ]);
});
