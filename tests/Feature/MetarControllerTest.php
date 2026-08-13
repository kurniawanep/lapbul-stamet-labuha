<?php

use App\Models\DataMetar;
use App\Models\Pegawai;
use App\Services\BmkgsoftService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view metar monthly report page with pagination', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    DataMetar::create([
        'bmkgsoft_entry_id' => 6910675,
        'station_id' => 138,
        'alias_station_id' => 97460,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'cccc' => 'WAEL',
        'ttaaii' => 'SAID40',
        'type_message' => 'metar',
        'data_timestamp' => '2026-08-13 14:00:00',
        'sandi' => "SAID40 WAEL 131400\nMETAR WAEL 131400Z AUTO VRB01KT //// ////// 26/24 Q1013=",
        'status' => 'sent',
        'sender_username' => 'root',
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/metar?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Metar')
        ->has('metarRecords.data', 1)
        ->where('bulan', 8)
        ->where('tahun', 2026)
    );
});

test('metar sync fetches and stores data into data_metar table using 2-day chunks', function () {
    $user = Pegawai::create([
        'nama' => 'Rezky Ramadhan',
        'email' => 'rezky@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    Http::fake([
        '*/api/v21/user/session/login' => Http::response(['data' => ['token' => 'fake_jwt_token']], 200),
        '*/api/v21/gts/entry*' => Http::response([
            'status' => 'success',
            'code' => 200,
            'data' => [
                [
                    'id' => 6910675,
                    'bmkgsoft_id' => 138,
                    'station_name' => 'Stasiun Meteorologi Oesman Sadik',
                    'data_timestamp' => '2026-08-01T14:00:00Z',
                    'received_timestamp' => '2026-08-01T13:58:03Z',
                    'sent_timestamp' => '2026-08-01T13:58:03Z',
                    'type_message' => 'metar',
                    'ttaaii' => 'SAID40',
                    'cccc' => 'WAEL',
                    'bbb' => null,
                    'sandi' => 'SAID40 WAEL 011400\nMETAR WAEL 011400Z AUTO VRB01KT //// ////// 26/24 Q1013=',
                    'status' => 'sent',
                    'sender_username' => 'Rezky Ramadhan',
                ],
            ],
        ], 200),
    ]);

    $service = new BmkgsoftService();
    $result = $service->syncMetarData('2026-08-01T00:00:00Z', '2026-08-01T23:59:59Z', 138);

    expect($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_metar', [
        'bmkgsoft_entry_id' => 6910675,
        'cccc' => 'WAEL',
        'ttaaii' => 'SAID40',
        'pegawai_id' => $user->id,
        'status' => 'sent',
    ]);
});
