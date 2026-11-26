<?php

use App\Models\JadwalBulanan;
use App\Models\JadwalBulananShift;
use App\Models\JadwalDetail;
use App\Models\Pegawai;
use App\Services\ObserverResolverService;

test('resolves daytime observer correctly', function () {
    $pegawai = Pegawai::create(['nama' => 'ANGGI FERINA LARASATI', 'role' => 'Observer & Forecaster']);
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
    $pegawai = Pegawai::create(['nama' => 'REZKY RAMADHAN', 'role' => 'Observer & Forecaster']);
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
    $pegawai = Pegawai::create(['nama' => 'IRSYAD HUMAIDI', 'role' => 'Observer & Forecaster']);
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

test('resolves observer with UTC to WIT timezone conversion', function () {
    $pegawai = Pegawai::create(['nama' => 'SYAMSUL MARASAOLY', 'role' => 'Observer & Forecaster']);
    $jadwalBulanan = JadwalBulanan::create(['bulan' => 8, 'tahun' => 2026, 'zona_waktu' => 'WIT']);
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
    // 00:00:00 UTC on Aug 10 is 09:00:00 WIT on Aug 10 (PAGI OBS shift)
    $observer = $service->getObserverByTimestamp('2026-08-10 00:00:00', 'UTC');

    expect($observer)->not->toBeNull();
    expect($observer->id)->toBe($pegawai->id);
});

test('prioritizes the later starting shift when schedules intersect such as S and M1 at 11:00 UTC', function () {
    $rezky = Pegawai::create(['nama' => 'REZKY RAMADHAN, S.Tr. Met.', 'role' => 'Observer & Forecaster']);
    $mirza = Pegawai::create(['nama' => 'MIRZA CHRISANDY PESULIMA, S.Tr', 'role' => 'Observer & Forecaster']);

    $jadwalBulanan = JadwalBulanan::create(['bulan' => 11, 'tahun' => 2026]);
    $shiftS = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'S',
        'nama_shift' => 'SIANG OBS',
        'jam_masuk' => '15:30:00',
        'jam_keluar' => '23:30:00',
    ]);
    $shiftM1 = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'M1',
        'nama_shift' => 'MALAM 1',
        'jam_masuk' => '19:30:00',
        'jam_keluar' => '01:45:00',
    ]);

    // Insert S before M1 to ensure ordering does not favor the earlier shift
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $rezky->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftS->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $mirza->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftM1->id,
    ]);

    $service = new ObserverResolverService();

    // 09:00 UTC = 18:00 WIT -> only S
    expect($service->getObserverByTimestamp('2026-11-01 09:00:00', 'UTC')?->id)->toBe($rezky->id);
    // 11:00 UTC = 20:00 WIT -> intersects S (15:30) and M1 (19:30), must prioritize M1
    expect($service->getObserverByTimestamp('2026-11-01 11:00:00', 'UTC')?->id)->toBe($mirza->id);
});

test('falls back to S at 11:00 UTC when M1 is not scheduled', function () {
    $rezky = Pegawai::create(['nama' => 'REZKY RAMADHAN, S.Tr. Met.', 'role' => 'Observer & Forecaster']);
    $mirza = Pegawai::create(['nama' => 'MIRZA CHRISANDY PESULIMA, S.Tr', 'role' => 'Observer & Forecaster']);

    $jadwalBulanan = JadwalBulanan::create(['bulan' => 5, 'tahun' => 2026]);
    $shiftS = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'S',
        'nama_shift' => 'SIANG OBS',
        'jam_masuk' => '15:30:00',
        'jam_keluar' => '23:30:00',
    ]);
    $shiftM = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'M',
        'nama_shift' => 'MALAM OBS',
        'jam_masuk' => '23:30:00',
        'jam_keluar' => '07:30:00',
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $rezky->id,
        'tanggal' => '2026-05-01',
        'shift_id' => $shiftS->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $mirza->id,
        'tanggal' => '2026-05-01',
        'shift_id' => $shiftM->id,
    ]);

    $service = new ObserverResolverService();
    expect($service->getObserverByTimestamp('2026-05-01 11:00:00', 'UTC')?->id)->toBe($rezky->id);
});

test('prioritizes M2 over overnight M1 and P over M2 during shift intersections', function () {
    $mirza = Pegawai::create(['nama' => 'MIRZA', 'role' => 'Observer & Forecaster']);
    $dinar = Pegawai::create(['nama' => 'DINAR', 'role' => 'Observer & Forecaster']);
    $irsyad = Pegawai::create(['nama' => 'IRSYAD', 'role' => 'Observer & Forecaster']);

    $jadwalBulanan = JadwalBulanan::create(['bulan' => 11, 'tahun' => 2026]);
    $shiftM1 = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'M1',
        'nama_shift' => 'MALAM 1',
        'jam_masuk' => '19:30:00',
        'jam_keluar' => '01:45:00',
    ]);
    $shiftM2 = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'M2',
        'nama_shift' => 'MALAM 2',
        'jam_masuk' => '01:30:00',
        'jam_keluar' => '07:45:00',
    ]);
    $shiftP = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI OBS',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);

    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $mirza->id,
        'tanggal' => '2026-11-01',
        'shift_id' => $shiftM1->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $dinar->id,
        'tanggal' => '2026-11-02',
        'shift_id' => $shiftM2->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $irsyad->id,
        'tanggal' => '2026-11-02',
        'shift_id' => $shiftP->id,
    ]);

    $service = new ObserverResolverService();
    // 01:35 WIT on Nov 2 intersects Nov 1 M1 (19:30) and Nov 2 M2 (01:30) -> M2 wins
    expect($service->getObserverByTimestamp('2026-11-02 01:35:00')?->id)->toBe($dinar->id);
    // 07:35 WIT on Nov 2 intersects Nov 2 M2 (01:30) and Nov 2 P (07:30) -> P wins
    expect($service->getObserverByTimestamp('2026-11-02 07:35:00')?->id)->toBe($irsyad->id);
});

test('prefers P over PF for general observation when start times match', function () {
    $yusran = Pegawai::create(['nama' => 'YUSRAN', 'role' => 'Observer & Forecaster']);
    $irsyad = Pegawai::create(['nama' => 'IRSYAD', 'role' => 'Observer & Forecaster']);

    $jadwalBulanan = JadwalBulanan::create(['bulan' => 11, 'tahun' => 2026]);
    $shiftPF = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'PF',
        'nama_shift' => 'PAGI FOD',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);
    $shiftP = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'operasional',
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI OBS',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '13:45:00',
    ]);

    // PF inserted before P
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $yusran->id,
        'tanggal' => '2026-11-02',
        'shift_id' => $shiftPF->id,
    ]);
    JadwalDetail::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'pegawai_id' => $irsyad->id,
        'tanggal' => '2026-11-02',
        'shift_id' => $shiftP->id,
    ]);

    $service = new ObserverResolverService();
    expect($service->getObserverByTimestamp('2026-11-02 00:00:00', 'UTC')?->id)->toBe($irsyad->id);
    expect($service->getForecastOrObserverDutyOfficer('2026-11-02 00:00:00', 'UTC')?->id)->toBe($yusran->id);
});

test('prioritizes the later starting shift for teknisi and ppnpn when schedules intersect', function () {
    $tekPagi = Pegawai::create(['nama' => 'ZULFIKAR', 'jenis_pegawai' => 'PNS', 'role' => 'Teknisi']);
    $tekSiang = Pegawai::create(['nama' => 'ARWIN', 'jenis_pegawai' => 'PNS', 'role' => 'Teknisi']);
    $ppnPagi = Pegawai::create(['nama' => 'MUKLAS', 'jenis_pegawai' => 'PPNPN', 'role' => 'PPNPN']);
    $ppnSiang = Pegawai::create(['nama' => 'ABDU', 'jenis_pegawai' => 'PPNPN', 'role' => 'PPNPN']);
    $ppnMalam = Pegawai::create(['nama' => 'MUHLIS', 'jenis_pegawai' => 'PPNPN', 'role' => 'PPNPN']);

    $jadwalBulanan = JadwalBulanan::create(['bulan' => 11, 'tahun' => 2026]);
    $shiftPT = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'teknisi',
        'kode_shift' => 'PT',
        'nama_shift' => 'PAGI TEKNISI',
        'jam_masuk' => '07:30:00',
        'jam_keluar' => '15:00:00',
    ]);
    $shiftST = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'teknisi',
        'kode_shift' => 'ST',
        'nama_shift' => 'SIANG TEKNISI',
        'jam_masuk' => '14:30:00',
        'jam_keluar' => '22:00:00',
    ]);
    $shiftPP = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'ppnpn',
        'kode_shift' => 'P',
        'nama_shift' => 'PAGI PPNPN',
        'jam_masuk' => '08:00:00',
        'jam_keluar' => '18:00:00',
    ]);
    $shiftPS = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'ppnpn',
        'kode_shift' => 'S',
        'nama_shift' => 'SIANG PPNPN',
        'jam_masuk' => '13:30:00',
        'jam_keluar' => '20:30:00',
    ]);
    $shiftPM = JadwalBulananShift::create([
        'jadwal_bulanan_id' => $jadwalBulanan->id,
        'category' => 'ppnpn',
        'kode_shift' => 'M',
        'nama_shift' => 'MALAM PPNPN',
        'jam_masuk' => '20:00:00',
        'jam_keluar' => '08:00:00',
    ]);

    // Insert earlier shifts first
    JadwalDetail::create(['jadwal_bulanan_id' => $jadwalBulanan->id, 'pegawai_id' => $tekPagi->id, 'tanggal' => '2026-11-01', 'shift_id' => $shiftPT->id]);
    JadwalDetail::create(['jadwal_bulanan_id' => $jadwalBulanan->id, 'pegawai_id' => $tekSiang->id, 'tanggal' => '2026-11-01', 'shift_id' => $shiftST->id]);
    JadwalDetail::create(['jadwal_bulanan_id' => $jadwalBulanan->id, 'pegawai_id' => $ppnPagi->id, 'tanggal' => '2026-11-01', 'shift_id' => $shiftPP->id]);
    JadwalDetail::create(['jadwal_bulanan_id' => $jadwalBulanan->id, 'pegawai_id' => $ppnSiang->id, 'tanggal' => '2026-11-01', 'shift_id' => $shiftPS->id]);
    JadwalDetail::create(['jadwal_bulanan_id' => $jadwalBulanan->id, 'pegawai_id' => $ppnMalam->id, 'tanggal' => '2026-11-01', 'shift_id' => $shiftPM->id]);

    $service = new ObserverResolverService();

    // Teknisi: 09:00 WIT -> PT, 14:45 WIT (overlap PT & ST) -> ST, 18:00 WIT -> ST
    expect($service->getTeknisiByTimestamp('2026-11-01 09:00:00')?->id)->toBe($tekPagi->id);
    expect($service->getTeknisiByTimestamp('2026-11-01 14:45:00')?->id)->toBe($tekSiang->id);
    expect($service->getTeknisiByTimestamp('2026-11-01 18:00:00')?->id)->toBe($tekSiang->id);

    // PPNPN: 10:00 WIT -> P, 14:00 WIT (overlap P & S) -> S, 20:15 WIT (overlap S & M) -> M
    expect($service->getPpnpnByTimestamp('2026-11-01 10:00:00')?->id)->toBe($ppnPagi->id);
    expect($service->getPpnpnByTimestamp('2026-11-01 14:00:00')?->id)->toBe($ppnSiang->id);
    expect($service->getPpnpnByTimestamp('2026-11-01 20:15:00')?->id)->toBe($ppnMalam->id);
});


