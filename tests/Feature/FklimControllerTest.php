<?php

use App\Models\DataFklim;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can view fklim index page', function () {
    $user = User::factory()->create();

    DataFklim::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-01 00:00:00',
        'tbk_0700' => 22.0,
        'tbk_1300' => 31.0,
        'tbk_1800' => 29.5,
        'tbk_avg' => 26.1,
        't_max' => 31.4,
        't_min' => 21.5,
        'rr_0700' => 0.0,
        'ss_8' => 8.0,
        'pp_qfe' => 1008.9,
        'rh_avg' => 81,
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/fklim?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Fklim')
        ->has('fklimRecords')
        ->has('dashboardStats')
        ->where('totalRecords', 1)
    );
});

test('authenticated user can export fklim monthly report excel', function () {
    $user = User::factory()->create();

    DataFklim::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-01 00:00:00',
        'tbk_0700' => 22.0,
        'tbk_1300' => 31.0,
        'tbk_1800' => 29.5,
        'tbk_avg' => 26.1,
        't_max' => 31.4,
        't_min' => 21.5,
        'rr_0700' => 0.0,
        'ss_8' => 8.0,
        'pp_qfe' => 1008.9,
        'rh_avg' => 81,
        'observer_name' => 'Rezky Ramadhan',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/fklim/export-excel?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('fklim export resolves V42 tie using direction with maximum wind speed', function () {
    // S occurs 2 times (max speed 18 kt)
    DataFklim::create([
        'data_timestamp' => '2026-07-01 00:00:00',
        'wd_cardinal' => 'S',
        'ff_max' => 15.0,
        'wd_ff_max' => 'S',
    ]);
    DataFklim::create([
        'data_timestamp' => '2026-07-02 00:00:00',
        'wd_cardinal' => 'S',
        'ff_max' => 18.0,
        'wd_ff_max' => 'S',
    ]);

    // SE occurs 2 times (max speed 26 kt)
    DataFklim::create([
        'data_timestamp' => '2026-07-03 00:00:00',
        'wd_cardinal' => 'SE',
        'ff_max' => 20.0,
        'wd_ff_max' => 'SE',
    ]);
    DataFklim::create([
        'data_timestamp' => '2026-07-04 00:00:00',
        'wd_cardinal' => 'SE',
        'ff_max' => 26.0,
        'wd_ff_max' => 'SE',
    ]);

    $service = app(\App\Services\FklimExportService::class);
    $spreadsheet = $service->generateFklimSpreadsheet(7, 2026);
    $sheet = $spreadsheet->getActiveSheet();

    // V42 must be SE because 26 kt > 18 kt
    expect($sheet->getCell('V42')->getValue())->toBe('SE');
});
