<?php

use App\Models\DataPenguapan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated user can export penguapan excel report', function () {
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
        ->get('/laporan/penguapan/export-excel?bulan=7&tahun=2026');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('penguapan excel export converts 8888 and 9999 rainfall to TTU', function () {
    DataPenguapan::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-01 00:00:00',
        'op_diff_baca' => 4.6,
        'rr_0700' => 8888,
        'op_eva' => 4.6,
        'ws_avg_0c5' => 1.54,
    ]);

    DataPenguapan::create([
        'station_id' => 138,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'data_timestamp' => '2026-07-16 00:00:00',
        'op_diff_baca' => 5.0,
        'rr_0700' => 9999,
        'op_eva' => 5.0,
        'ws_avg_0c5' => 1.2,
    ]);

    $service = app(\App\Services\PenguapanExportService::class);
    $spreadsheet = $service->generatePenguapanSpreadsheet(7, 2026);
    $sheet = $spreadsheet->getActiveSheet();

    expect($sheet->getCell('C12')->getValue())->toBe('TTU');
    expect($sheet->getCell('H12')->getValue())->toBe('TTU');
});
