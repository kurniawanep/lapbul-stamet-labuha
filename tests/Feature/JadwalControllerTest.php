<?php

use App\Models\JadwalBulanan;
use App\Models\MasterShift;
use App\Models\Pegawai;
use App\Models\User;

test('authenticated user can view operational schedule matrix page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/jadwal/operasional?bulan=8&tahun=2026');

    $response->assertStatus(200);
});

test('authenticated user can view teknisi schedule matrix page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/jadwal/teknisi?bulan=8&tahun=2026');

    $response->assertStatus(200);
});

test('authenticated user can view ppnpn schedule matrix page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/jadwal/ppnpn?bulan=8&tahun=2026');

    $response->assertStatus(200);
});

test('authenticated user can update single cell shift', function () {
    $user = User::factory()->create();
    $pegawai = Pegawai::create(['nama' => 'BEN ARTHER MOLLE']);
    $shift = MasterShift::create(['category' => 'operasional', 'kode_shift' => 'S', 'nama_shift' => 'SIANG OBS']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);

    $response = $this->actingAs($user)->post('/jadwal/update-cell', [
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $pegawai->id,
        'tanggal' => '2026-08-15',
        'shift_id' => $shift->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('jadwal_details', [
        'pegawai_id' => $pegawai->id,
        'tanggal' => '2026-08-15',
        'shift_id' => $shift->id,
    ]);
});

test('authenticated user can batch update multiple matrix cells', function () {
    $user = User::factory()->create();
    $p1 = Pegawai::create(['nama' => 'BEN ARTHER MOLLE']);
    $p2 = Pegawai::create(['nama' => 'ANGGI FERINA']);
    $shift1 = MasterShift::create(['category' => 'operasional', 'kode_shift' => 'M1', 'nama_shift' => 'MALAM 1']);
    $shift2 = MasterShift::create(['category' => 'operasional', 'kode_shift' => 'M2', 'nama_shift' => 'MALAM 2']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);

    $response = $this->actingAs($user)->post('/jadwal/batch-update-cells', [
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'changes' => [
            ['pegawai_id' => $p1->id, 'tanggal' => '2026-08-01', 'shift_id' => $shift1->id],
            ['pegawai_id' => $p2->id, 'tanggal' => '2026-08-02', 'shift_id' => $shift2->id],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('jadwal_details', [
        'pegawai_id' => $p1->id,
        'tanggal' => '2026-08-01',
        'shift_id' => $shift1->id,
    ]);
    $this->assertDatabaseHas('jadwal_details', [
        'pegawai_id' => $p2->id,
        'tanggal' => '2026-08-02',
        'shift_id' => $shift2->id,
    ]);
});

test('authenticated user can bulk update shifts', function () {
    $user = User::factory()->create();
    $p1 = Pegawai::create(['nama' => 'PEG 1']);
    $p2 = Pegawai::create(['nama' => 'PEG 2']);
    $shift = MasterShift::create(['category' => 'operasional', 'kode_shift' => 'M2', 'nama_shift' => 'MALAM 2']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);

    $response = $this->actingAs($user)->post('/jadwal/bulk-update', [
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_ids' => [$p1->id, $p2->id],
        'start_date' => '2026-08-01',
        'end_date' => '2026-08-03',
        'shift_id' => $shift->id,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('jadwal_details', [
        'pegawai_id' => $p1->id,
        'tanggal' => '2026-08-01',
        'shift_id' => $shift->id,
    ]);
    $this->assertDatabaseHas('jadwal_details', [
        'pegawai_id' => $p2->id,
        'tanggal' => '2026-08-03',
        'shift_id' => $shift->id,
    ]);
});

test('authenticated user can store new master shift per category', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/jadwal/shifts', [
        'category' => 'teknisi',
        'kode_shift' => 'P2',
        'nama_shift' => 'PAGI TEKNISI 2',
        'jam_masuk' => '08:30:00',
        'jam_keluar' => '14:30:00',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('master_shifts', [
        'category' => 'teknisi',
        'kode_shift' => 'P2',
        'nama_shift' => 'PAGI TEKNISI 2',
        'jam_masuk' => '08:30:00',
        'jam_keluar' => '14:30:00',
    ]);
});

test('authenticated user can update existing master shift including category and kode_shift', function () {
    $user = User::factory()->create();
    $shift = MasterShift::create([
        'category' => 'ppnpn',
        'kode_shift' => 'PAGI_OLD',
        'nama_shift' => 'PAGI LAMA',
        'jam_masuk' => '07:00:00',
        'jam_keluar' => '13:00:00',
    ]);

    $response = $this->actingAs($user)->patch("/jadwal/shifts/{$shift->id}", [
        'category' => 'ppnpn',
        'kode_shift' => 'PAGI_NEW',
        'nama_shift' => 'PAGI BARU',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('master_shifts', [
        'id' => $shift->id,
        'category' => 'ppnpn',
        'kode_shift' => 'PAGI_NEW',
        'nama_shift' => 'PAGI BARU',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);
});

test('authenticated user can export pdf schedule per category', function () {
    $user = User::factory()->create();
    JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);

    $response = $this->actingAs($user)->get('/jadwal/pdf?bulan=8&tahun=2026&category=operasional');
    $response->assertStatus(200);
    $response->assertHeader('content-type', 'application/pdf');

    $responseTeknisi = $this->actingAs($user)->get('/jadwal/pdf?bulan=8&tahun=2026&category=teknisi');
    $responseTeknisi->assertStatus(200);

    $responsePpnpn = $this->actingAs($user)->get('/jadwal/pdf?bulan=8&tahun=2026&category=ppnpn');
    $responsePpnpn->assertStatus(200);
});
