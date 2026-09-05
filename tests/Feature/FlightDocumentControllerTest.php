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

    $sampleWaChat = "[14/08/26 22.30] Dinar: <attached: BMKG-FD-2608-T5AG80.pdf>\n15/08/2026, 06:10 - Stamet Oesman Sadik: <Media omitted>\nFD IW 1173.pdf";

    $response = $this->actingAs($user)->post('/laporan/flight-document/manual', [
        'raw_message' => $sampleWaChat,
    ]);

    $response->assertStatus(302);

    $this->assertDatabaseHas('data_flight_document', [
        'no_fd' => 'BMKG-FD-2608-T5AG80',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);

    $this->assertDatabaseHas('data_flight_document', [
        'no_fd' => 'FD IW 1173.pdf',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);
});

test('whatsapp webhook automatically sets status to Selesai for incoming flight document dispatch', function () {
    DataFlightDocument::create([
        'station_code' => 'WAEL',
        'no_fd' => 'BMKG-FD-2608-TEST01',
        'flight_number' => 'IW-1173',
        'departure_at' => '2026-08-14 22:30:00',
        'status' => 'Pending',
        'is_wa_dispatched' => false,
    ]);

    // Test updating existing document via WA webhook
    $response = $this->postJson('/api/whatsapp/webhook', [
        'payload' => [
            'body' => "[14/08/26 22.30] Dinar: <attached: BMKG-FD-2608-TEST01.pdf>",
            '_data' => [
                'notifyName' => 'Dinar C. Nirwana',
            ],
        ],
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'status' => 'success',
            'category' => 'FLIGHT_DOCUMENT',
        ]);

    $this->assertDatabaseHas('data_flight_document', [
        'no_fd' => 'BMKG-FD-2608-TEST01',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);

    // Test creating new document via WA webhook
    $response2 = $this->postJson('/api/whatsapp/webhook', [
        'payload' => [
            'body' => "[15/08/26 04.30] Dinar: <attached: BMKG-FD-2608-NEW002.pdf>",
            '_data' => [
                'notifyName' => 'Dinar C. Nirwana',
            ],
        ],
    ]);

    $response2->assertStatus(200);

    $this->assertDatabaseHas('data_flight_document', [
        'no_fd' => 'BMKG-FD-2608-NEW002',
        'status' => 'Selesai',
        'is_wa_dispatched' => true,
    ]);
});

test('inasiam service deduplicates by departure_at, enforces WAEL origin, and ignores TEST records', function () {
    $items = [
        // 1. Earlier draft -> should be ignored because of draft status
        [
            'id' => 'BMKG-FD-DEDUP-DRAFT-01',
            'type' => 'scheduled',
            'callsign' => 'IW 2275',
            'departure_at' => '2026-11-15T04:00:00+00:00',
            'created_at' => '2026-11-15T01:00:00+00:00',
            'status' => 'draft',
            'origin_airports' => ['01KCKEEGZ6B9NHA5HW0J1XETHN'], // WAEL
            'destination_airports' => ['01KCKEEGZ69FS8FA79JCPGR0HD'], // WAMP
        ],
        // 2. Completed earlier document for 04:00 departure
        [
            'id' => 'BMKG-FD-DEDUP-EARLY',
            'type' => 'scheduled',
            'callsign' => 'IW 2275',
            'departure_at' => '2026-11-15T04:00:00+00:00',
            'created_at' => '2026-11-15T02:00:00+00:00',
            'status' => 'completed',
            'origin_airports' => ['01KCKEEGZ6B9NHA5HW0J1XETHN'], // WAEL
            'destination_airports' => ['01KCKEEGZ69FS8FA79JCPGR0HD'], // WAMP
        ],
        // 3. Completed LATER document for the exact same 04:00 departure -> should overwrite earlier one
        [
            'id' => 'BMKG-FD-DEDUP-LATEST',
            'type' => 'scheduled',
            'callsign' => 'IW 2275',
            'departure_at' => '2026-11-15T04:00:00+00:00',
            'created_at' => '2026-11-15T03:00:00+00:00',
            'status' => 'completed',
            'origin_airports' => ['01KCKEEGZ6B9NHA5HW0J1XETHN'], // WAEL
            'destination_airports' => ['01KCKEEGZ69FS8FA79JCPGR0HD'], // WAMP
        ],
        // 4. Record with origin NOT WAEL -> should be ignored
        [
            'id' => 'BMKG-FD-DEDUP-NONWAEL',
            'type' => 'scheduled',
            'callsign' => 'IW 1170',
            'departure_at' => '2026-11-15T06:00:00+00:00',
            'created_at' => '2026-11-15T04:00:00+00:00',
            'status' => 'completed',
            'origin_airports' => ['01KCKEEGZ67DN82G49TN36R2GY'], // WAMM
            'destination_airports' => ['01KCKEEGZ6B9NHA5HW0J1XETHN'], // WAEL
        ],
        // 5. Record containing TEST in callsign/route -> should be ignored
        [
            'id' => 'BMKG-FD-DEDUP-TEST',
            'type' => 'scheduled',
            'callsign' => 'TEST 999',
            'departure_at' => '2026-11-15T08:00:00+00:00',
            'created_at' => '2026-11-15T05:00:00+00:00',
            'status' => 'completed',
            'origin_airports' => ['WAEL'],
            'destination_airports' => ['WAMM'],
        ],
    ];

    DataFlightDocument::where('departure_at', '2026-11-15 04:00:00')->delete();
    DataFlightDocument::where('inasiam_fd_id', 'like', '%DEDUP%')->delete();

    $service = new InasiamService();
    $result = $service->saveInasiamItems($items);

    expect($result['success'])->toBeTrue()
        ->and($result['synced_count'])->toBe(1);

    // Only 1 record in database for 04:00 departure, and it must be the latest one (BMKG-FD-DEDUP-LATEST)
    $records = DataFlightDocument::where('departure_at', '2026-11-15 04:00:00')->get();
    expect($records->count())->toBe(1);
    expect($records->first()->inasiam_fd_id)->toBe('BMKG-FD-DEDUP-LATEST');
    expect($records->first()->no_fd)->toBe('BMKG-FD-DEDUP-LATEST');

    // Non-WAEL and TEST records should not exist in database
    expect(DataFlightDocument::where('inasiam_fd_id', 'BMKG-FD-DEDUP-NONWAEL')->exists())->toBeFalse();
    expect(DataFlightDocument::where('inasiam_fd_id', 'BMKG-FD-DEDUP-TEST')->exists())->toBeFalse();
    expect(DataFlightDocument::where('inasiam_fd_id', 'BMKG-FD-DEDUP-DRAFT-01')->exists())->toBeFalse();
});

