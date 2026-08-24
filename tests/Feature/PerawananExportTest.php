<?php

use App\Models\DataPerawanan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can export perawanan monthly report excel', function () {
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
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/perawanan/export-excel?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
