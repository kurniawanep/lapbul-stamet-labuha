<?php

use App\Models\Pegawai;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can view dashboard with correct pegawai stats', function () {
    $user = User::factory()->create();

    $pnsCountBefore = Pegawai::where('jenis_pegawai', 'PNS')->count();
    $ppnpnCountBefore = Pegawai::where('jenis_pegawai', 'PPNPN')->count();

    Pegawai::create([
        'nama' => 'Observer PNS',
        'jenis_pegawai' => 'PNS',
        'nip' => '199001012015011001',
        'is_active' => true,
    ]);

    Pegawai::create([
        'nama' => 'Staff PPNPN',
        'jenis_pegawai' => 'PPNPN',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('pegawaiStats')
        ->where('pegawaiStats.pns', $pnsCountBefore + 1)
        ->where('pegawaiStats.ppnpn', $ppnpnCountBefore + 1)
        ->has('laporanCounts')
        ->has('stationInfo')
    );
});