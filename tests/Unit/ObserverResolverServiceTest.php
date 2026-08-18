<?php

use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use App\Services\ObserverResolverService;

test('resolves daytime observer correctly', function () {
    $pegawai = Pegawai::create(['nama' => 'ANGGI FERINA LARASATI']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);
    $shift = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI OBS',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $pegawai->id,
        'tanggal' => '2026-08-10',
        'shift_id' => $shift->id,
    ]);

    $service = new ObserverResolverService();
    $observer = $service->getObserverByTimestamp('2026-08-10 09:00:00');

    expect($observer)->not->toBeNull();
    expect($observer->id)->toBe($pegawai->id);
    expect($observer->nama)->toBe('ANGGI FERINA LARASATI');
});

test('resolves overnight shift observer starting on current date', function () {
    $pegawai = Pegawai::create(['nama' => 'REZKY RAMADHAN']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);
    $shift = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'kode_shift' => 'M1',
        'nama_shift' => 'MALAM 1',
        'jam_masuk' => '19:30:00',
        'jam_keluar' => '01:45:00',
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $pegawai->id,
        'tanggal' => '2026-08-10',
        'shift_id' => $shift->id,
    ]);

    $service = new ObserverResolverService();
    $observer = $service->getObserverByTimestamp('2026-08-10 21:00:00');

    expect($observer)->not->toBeNull();
    expect($observer->nama)->toBe('REZKY RAMADHAN');
});

test('resolves overnight shift observer extending into next date early morning', function () {
    $pegawai = Pegawai::create(['nama' => 'IRSYAD HUMAIDI']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026]);
    $shift = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'kode_shift' => 'M1',
        'nama_shift' => 'MALAM 1',
        'jam_masuk' => '19:30:00',
        'jam_keluar' => '01:45:00',
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $pegawai->id,
        'tanggal' => '2026-08-09',
        'shift_id' => $shift->id,
    ]);

    $service = new ObserverResolverService();
    // 01:15 on Aug 10 belongs to Aug 9 M1 shift
    $observer = $service->getObserverByTimestamp('2026-08-10 01:15:00');

    expect($observer)->not->toBeNull();
    expect($observer->nama)->toBe('IRSYAD HUMAIDI');
});

test('resolves observer name with initials, title differences, and middle name omission', function () {
    $peg1 = Pegawai::create(['nama' => 'DINAR CAHYA NIRWANA, S.Tr. Met.']);
    $peg2 = Pegawai::create(['nama' => 'MUHD. YUSRAN TITDOY BADER, S.Tr']);
    $peg3 = Pegawai::create(['nama' => 'MIRZA CHRISANDY PESULIMA, S.Tr']);
    $peg4 = Pegawai::create(['nama' => 'A RAFI PERDANA, S.Tr.Met.']);

    $service = new ObserverResolverService();

    expect($service->resolvePegawai(null, 'Dinar C. Nirwana')?->id)->toBe($peg1->id);
    expect($service->resolvePegawai(null, 'M. Yusran Bader')?->id)->toBe($peg2->id);
    expect($service->resolvePegawai(null, 'Mirza Pesulima')?->id)->toBe($peg3->id);
    expect($service->resolvePegawai(null, 'A Rafi Perdana')?->id)->toBe($peg4->id);
});

