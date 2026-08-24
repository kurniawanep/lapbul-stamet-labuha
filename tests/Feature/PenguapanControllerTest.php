<?php

use App\Models\DataPenguapan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can view penguapan index page', function () {
    $user = User::factory()->create();

    DataPenguapan::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-01 00:00:00',
        'op_diff_baca' => 4.6,
        't_air_max' => null,
        't_air_min' => null,
        't_air_avg' => null,
        'rr_0700' => 0.0,
        'op_eva' => 4.6,
        'ws_avg_0c5' => 1.54,
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/penguapan?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Penguapan')
        ->has('penguapanRecords')
        ->has('dashboardStats')
        ->where('totalRecords', 1)
    );
});
