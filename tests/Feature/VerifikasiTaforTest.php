<?php

use App\Models\DataMetar;
use App\Models\DataTafor;
use App\Models\Pegawai;
use App\Services\VerifikasiTaforExportService;
use Illuminate\Support\Facades\Hash;

test('authenticated user can export verifikasi tafor excel spreadsheet', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    DataTafor::create([
        'bmkgsoft_entry_id' => 6909459,
        'station_id' => 138,
        'alias_station_id' => 97460,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'cccc' => 'WAEL',
        'ttaaii' => 'FTID40',
        'type_message' => 'taf',
        'data_timestamp' => '2026-08-13 11:00:00',
        'sandi' => "FTID40 WAEL 131100\nTAF WAEL 131100Z 1312/1412 08004KT 9000 FEW019 BECMG 1314/1316 00000KT=",
        'status' => 'sent',
    ]);

    DataMetar::create([
        'bmkgsoft_entry_id' => 6910675,
        'station_id' => 138,
        'alias_station_id' => 97460,
        'station_name' => 'Stasiun Meteorologi Oesman Sadik',
        'cccc' => 'WAEL',
        'ttaaii' => 'SAID40',
        'type_message' => 'metar',
        'data_timestamp' => '2026-08-13 14:00:00',
        'sandi' => "SAID40 WAEL 131400\nMETAR WAEL 131400Z AUTO VRB01KT //// ////// 26/24 Q1013=",
        'status' => 'sent',
    ]);

    $response = $this->actingAs($user)
        ->get('/laporan/tafor/export-verifikasi?bulan=8&tahun=2026');

    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('verifikasi tafor export service parses segments and effective weather correctly', function () {
    $service = new VerifikasiTaforExportService();

    $clean = $service->cleanTaf("FTID40 WAEL 131100\nTAF WAEL 131100Z 1312/1412 08004KT 9000 FEW019 BECMG 1314/1316 00000KT=");
    expect($clean)->toBe("TAF WAEL 131100Z 1312/1412 08004KT 9000 FEW019 BECMG 1314/1316 00000KT");

    $segments = $service->parseTafSegments($clean);
    expect(count($segments))->toBe(2);

    $eff13 = $service->getEffectiveWeather($segments, 13, 13);
    expect($eff13['status'])->toBe('GENERAL');
    expect($eff13['elements']['wind_dir'])->toBe('080');

    $eff15 = $service->getEffectiveWeather($segments, 13, 15);
    expect($eff15['status'])->toBe('BECMG');
    expect($eff15['elements']['wind_dir'])->toBe('000');
});
