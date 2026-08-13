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
