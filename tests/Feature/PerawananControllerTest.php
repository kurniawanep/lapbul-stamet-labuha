<?php

use App\Models\DataPerawanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can view perawanan index page', function () {
    $user = User::factory()->create();

    DataPerawanan::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-01 00:00:00',
        'clear' => 0,
        'partly_cloudy' => 18,
        'cloudy' => 6,
        'totally_cloudy' => 0,
        'total_observation' => 24,
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/perawanan?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Perawanan')
        ->has('perawananRecords')
        ->has('dashboardStats')
        ->where('totalRecords', 1)
    );
});
