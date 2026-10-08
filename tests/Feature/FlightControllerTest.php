<?php

use App\Models\DataFlight;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = Pegawai::create([
        'nama' => 'Test Observer',
        'email' => 'test.observer@bmkg.go.id',
        'password' => Hash::make('password'),
        'role' => 'Observer & Forecaster',
        'jenis_pegawai' => 'PNS',
        'is_active' => true,
    ]);
});

test('user can view flight list and grouped airline statistics', function () {
    DataFlight::create([
        'tanggal' => '2026-09-01',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'reg' => 'PK-WHL',
        'dep' => 'TTE',
        'arr' => 'LAH',
        'sta_utc' => '07:10',
        'ata_utc' => '07:02',
    ]);

    DataFlight::create([
        'tanggal' => '2026-09-01',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1173',
        'reg' => 'PK-WHL',
        'dep' => 'LAH',
        'arr' => 'TTE',
        'std_utc' => '22:35',
        'atd_utc' => '22:35',
    ]);

    $response = $this->actingAs($this->user)->get('/laporan/flight?bulan=9&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/Flight')
        ->has('records.data', 2)
        ->has('stats')
        ->where('stats.total_flights', 2)
        ->where('stats.total_departures', 1)
        ->where('stats.total_arrivals', 1)
        ->has('grouped_stats', 1)
        ->where('grouped_stats.0.maskapai', 'Wings Air')
        ->where('grouped_stats.0.total_flights', 2)
        ->where('grouped_stats.0.departures', 1)
        ->where('grouped_stats.0.arrivals', 1)
    );
});

test('user can create flight record manually', function () {
    $payload = [
        'tanggal' => '2026-09-05',
        'maskapai' => 'Lion Air',
        'flight_number' => 'JT-889',
        'reg' => 'PK-LKP',
        'dep' => 'UPG',
        'arr' => 'LAH',
        'sta_utc' => '08:30',
        'ata_utc' => '08:25',
        'remarks' => 'Penerbangan charter',
    ];

    $response = $this->actingAs($this->user)->post('/laporan/flight', $payload);

    $response->assertRedirect();
    $this->assertDatabaseHas('data_flights', [
        'tanggal' => '2026-09-05',
        'maskapai' => 'Lion Air',
        'flight_number' => 'JT-889',
        'reg' => 'PK-LKP',
        'dep' => 'UPG',
        'arr' => 'LAH',
    ]);
});

test('user can update flight record', function () {
    $flight = DataFlight::create([
        'tanggal' => '2026-09-05',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'reg' => 'PK-WHL',
        'dep' => 'TTE',
        'arr' => 'LAH',
    ]);

    $response = $this->actingAs($this->user)->put("/laporan/flight/{$flight->id}", [
        'tanggal' => '2026-09-05',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'reg' => 'PK-WJS',
        'dep' => 'TTE',
        'arr' => 'LAH',
        'sta_utc' => '07:10',
        'ata_utc' => '07:05',
        'remarks' => 'Reg diganti PK-WJS',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('data_flights', [
        'id' => $flight->id,
        'reg' => 'PK-WJS',
        'remarks' => 'Reg diganti PK-WJS',
    ]);
});

test('user can delete flight record', function () {
    $flight = DataFlight::create([
        'tanggal' => '2026-09-05',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'dep' => 'TTE',
        'arr' => 'LAH',
    ]);

    $response = $this->actingAs($this->user)->delete("/laporan/flight/{$flight->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('data_flights', [
        'id' => $flight->id,
    ]);
});

test('user can bulk delete flight records', function () {
    $flight1 = DataFlight::create([
        'tanggal' => '2026-09-01',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'dep' => 'TTE',
        'arr' => 'LAH',
    ]);
    $flight2 = DataFlight::create([
        'tanggal' => '2026-09-02',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1173',
        'dep' => 'LAH',
        'arr' => 'TTE',
    ]);

    $response = $this->actingAs($this->user)->post('/laporan/flight/bulk-delete', [
        'ids' => [$flight1->id, $flight2->id],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseMissing('data_flights', ['id' => $flight1->id]);
    $this->assertDatabaseMissing('data_flights', ['id' => $flight2->id]);
});

test('user can import template excel data-flight-wings.xlsx', function () {
    $templatePath = resource_path('templates/excel/data-flight-wings.xlsx');
    $uploadedFile = new UploadedFile(
        $templatePath,
        'data-flight-wings.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        null,
        true
    );

    $response = $this->actingAs($this->user)->post('/laporan/flight/import', [
        'file' => $uploadedFile,
    ]);

    $response->assertRedirect();
    $count = DataFlight::where('maskapai', 'Wings Air')->count();
    expect($count)->toBeGreaterThan(50);
});

test('user can download template excel', function () {
    $response = $this->actingAs($this->user)->get('/laporan/flight/template');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('user can export flight data to excel', function () {
    DataFlight::create([
        'tanggal' => '2026-09-01',
        'maskapai' => 'Wings Air',
        'flight_number' => 'IW-1174',
        'reg' => 'PK-WHL',
        'dep' => 'TTE',
        'arr' => 'LAH',
    ]);

    $response = $this->actingAs($this->user)->get('/laporan/flight/export?bulan=9&tahun=2026');

    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
