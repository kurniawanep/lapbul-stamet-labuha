<?php

use App\Models\DataFlightDocument;
use App\Models\Pegawai;
use App\Services\InasiamService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('authenticated user can view flight document audit page and stats only count selesai status', function () {
    $user = Pegawai::create([
        'nama' => 'Test Staff',
        'email' => 'staff@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);

    // Selesai document -> counted
    DataFlightDocument::create([
        'station_code' => 'WAEL',
        'inasiam_fd_id' => '01KFJ17MQTAFJGACA017T6HV9K',
        'no_fd' => 'BMKG-FD-2608-T5AG80',
        'flight_number' => 'IW-1173',
        'airline_name' => 'Wings Air',
        'route' => 'WAEL -> WAMM',
        'departure_at' => '2026-08-14 22:30:00',
        'type' => 'Terjadwal',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);

    // Draft / non-selesai document -> not counted in stats
    DataFlightDocument::create([
        'station_code' => 'WAEL',
        'inasiam_fd_id' => '01KFJ17MQTAFJGACA017T6HV9L',
        'no_fd' => 'BMKG-FD-2608-T5AG81',
        'flight_number' => 'IW-1174',
        'airline_name' => 'Wings Air',
        'route' => 'WAEL -> WAMM',
        'departure_at' => '2026-08-14 23:30:00',
        'type' => 'Terjadwal',
        'status' => 'Draft',
        'is_wa_dispatched' => false,
    ]);

    $response = $this->actingAs($user)->get('/laporan/flight-document?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('Laporan/FlightDocument')
        ->where('stats.total_fd', 1)
        ->where('stats.unique_flights', 1)
    );
});

test('inasiam service can sync flight documents', function () {
    Http::fake([
        'inasiam.bmkg.go.id/*' => Http::response([
            [
                'id' => '01KCKEEGZ6B9NHA5HW0J1XETHN',
                'type' => 'Terjadwal',
                'callsign' => 'IW-1173',
                'departure_at' => '2026-08-14T22:30:00Z',
                'template_id' => 'BMKG-FD-2608-T5AG80',
                'origin_airports' => ['WAEL'],
                'destination_airports' => ['WAMM'],
                'status' => 'Selesai',
                'airlines' => ['name' => 'Wings Air'],
            ]
        ], 200),
    ]);

    $service = new InasiamService();
    $result = $service->syncFlightDocuments();

    expect($result['success'])->toBeTrue()
        ->and($result['synced_count'])->toBe(1);

    $this->assertDatabaseHas('data_flight_document', [
        'inasiam_fd_id' => '01KCKEEGZ6B9NHA5HW0J1XETHN',
        'no_fd' => '01KCKEEGZ6B9NHA5HW0J1XETHN',
        'flight_number' => 'IW-1173',
    ]);
});

test('quick paste matches wa chat text with flight documents and automatically sets status to Selesai', function () {
    $user = Pegawai::create([
        'nama' => 'Test Staff',
        'email' => 'staff2@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
        'role' => 'Observer & Forecaster',
    ]);

    DataFlightDocument::create([
        'station_code' => 'WAEL',
        'no_fd' => 'BMKG-FD-2608-T5AG80',
        'flight_number' => 'IW-1173',
        'departure_at' => '2026-08-14 22:30:00',
        'status' => 'Pending',
        'is_wa_dispatched' => false,
    ]);

    $sampleWaChat = "[14/08/26 22.30] Dinar: <attached: BMKG-FD-2608-T5AG80.pdf>";

    $response = $this->actingAs($user)->post('/laporan/flight-document/manual', [
        'raw_message' => $sampleWaChat,
    ]);

    $response->assertStatus(302);

    $this->assertDatabaseHas('data_flight_document', [
        'no_fd' => 'BMKG-FD-2608-T5AG80',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);
});
