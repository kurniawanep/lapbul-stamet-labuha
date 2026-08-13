<?php

use App\Models\Pegawai;
use App\Models\User;

test('authenticated user can view pegawai list page', function () {
    $user = User::factory()->create();
    Pegawai::create([
        'jenis_pegawai' => 'PNS',
        'nama' => 'BEN ARTHER MOLLE',
        'nip' => '198001012005011001',
        'role' => 'Kepala Stasiun',
        'jabatan' => 'Kepala Stasiun',
    ]);

    $response = $this->actingAs($user)->get('/pegawai');

    $response->assertStatus(200);
});

test('authenticated user can store new PNS pegawai with role, pangkat, and TMT date', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/pegawai', [
        'jenis_pegawai' => 'PNS',
        'nama' => 'BUDI SANTOSO',
        'nip' => '199001012015011001',
        'pangkat' => 'Penata Muda',
        'golongan' => 'III/a',
        'role' => 'Observer & Forecaster',
        'jabatan' => 'PMG Ahli Pertama',
        'tanggal_masuk_kerja' => '2015-01-01',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('pegawai', [
        'jenis_pegawai' => 'PNS',
        'nama' => 'BUDI SANTOSO',
        'nip' => '199001012015011001',
        'pangkat' => 'Penata Muda',
        'golongan' => 'III/a',
        'role' => 'Observer & Forecaster',
        'jabatan' => 'PMG Ahli Pertama',
        'tanggal_masuk_kerja' => '2015-01-01',
    ]);
});

test('authenticated user can store new PPNPN pegawai without NIP or PNS role', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/pegawai', [
        'jenis_pegawai' => 'PPNPN',
        'nama' => 'SITI AMINAH',
        'jabatan' => 'Pramubakti',
        'tanggal_masuk_kerja' => '2021-06-15',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('pegawai', [
        'jenis_pegawai' => 'PPNPN',
        'nama' => 'SITI AMINAH',
        'nip' => null,
        'role' => null,
        'pangkat' => null,
        'golongan' => null,
        'jabatan' => 'Pramubakti',
        'tanggal_masuk_kerja' => '2021-06-15',
    ]);
});

test('authenticated user can update pegawai', function () {
    $user = User::factory()->create();
    $pegawai = Pegawai::create([
        'jenis_pegawai' => 'PNS',
        'nama' => 'PEMUDA LAMA',
        'nip' => '199101012016011001',
    ]);

    $response = $this->actingAs($user)->patch("/pegawai/{$pegawai->id}", [
        'jenis_pegawai' => 'PNS',
        'nama' => 'PEMUDA BARU',
        'nip' => '199101012016011001',
        'role' => 'Teknisi',
        'jabatan' => 'Kepala Pokjung',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('pegawai', [
        'id' => $pegawai->id,
        'nama' => 'PEMUDA BARU',
        'role' => 'Teknisi',
        'jabatan' => 'Kepala Pokjung',
    ]);
});

test('authenticated user can delete pegawai', function () {
    $user = User::factory()->create();
    $pegawai = Pegawai::create(['nama' => 'PEGAWAI HAPUS']);

    $response = $this->actingAs($user)->delete("/pegawai/{$pegawai->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('pegawai', [
        'id' => $pegawai->id,
    ]);
});
