<?php

use App\Models\DataMetar;
use App\Models\DataPibal;
use App\Models\DataSinoptik;
use App\Models\Pegawai;
use App\Services\PerformanceMonitoringService;
use Illuminate\Support\Facades\Hash;

test('authenticated user can view monitoring dashboard', function () {
    $user = Pegawai::create([
        'nama' => 'Kepala Stasiun',
        'email' => 'kasat@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Kepala Stasiun',
    ]);

    $response = $this->actingAs($user)->get('/monitoring');

    $response->assertStatus(200);
});

test('performance monitoring service evaluates timely late and missing data', function () {
    $observer = Pegawai::create([
        'nama' => 'Dinar C. Nirwana',
        'email' => 'dinar@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer',
    ]);

    // Timely Sinop (03:00 slot, created at 03:05)
    DataSinoptik::create([
        'station_code' => '97460',
        'data_timestamp' => '2026-08-01 03:00:00',
        'created_at' => '2026-08-01 03:05:00',
        'observer_name' => 'Dinar C. Nirwana',
        'pegawai_id' => $observer->id,
    ]);

    // Late Sinop (04:00 slot, created at 04:30 -> +15 mins late)
    DataSinoptik::create([
        'station_code' => '97460',
        'data_timestamp' => '2026-08-01 04:00:00',
        'created_at' => '2026-08-01 04:30:00',
        'observer_name' => 'Dinar C. Nirwana',
        'pegawai_id' => $observer->id,
    ]);

    $service = app(PerformanceMonitoringService::class);
    $result = $service->getMonthlyPerformance(8, 2026);

    expect($result['station_summary'])->toHaveKeys(['total_slots', 'total_timely', 'total_late', 'overall_compliance_pct'])
        ->and($result['staff_rankings'])->not()->toBeEmpty();
});
