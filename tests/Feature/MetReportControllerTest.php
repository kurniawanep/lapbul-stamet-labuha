<?php

use App\Models\DataMetReport;
use App\Models\Pegawai;
use App\Services\MetReportParserService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

test('parser correctly extracts all parameters and captures carrd.co link footer', function () {
    $sampleText = "MET REPORT (QAM)\nOESMAN SADIK AIRPORT (WAEL)\nLABUHA\nDATE : 13 / 08 / 2026\nTIME : 23.00 UTC\n==================\nWIND : VRB 02 KT\nVISIBILITY : 9 KM\nWEATHER : NIL\nCLOUD : FEW 1800 FT\nTT/TD : 27°C / 23°C\nQNH : 1013 / 29.93\nQFE : 1011 / 29.87\nREMARKS : -\nTREND : NOSIG=\n==================\nCheck informasi cuaca bandar Udara di wilayah Indonesia :\nhttps://bmkghalsel.carrd.co/#bandara";

    $parser = new MetReportParserService();
    $parsed = $parser->parse($sampleText);

    expect($parsed['station_code'])->toBe('WAEL')
        ->and($parsed['data_timestamp'])->toBe('2026-08-13 23:00:00')
        ->and($parsed['wind'])->toBe('VRB 02 KT')
        ->and($parsed['visibility'])->toBe('9 KM')
        ->and($parsed['temp_drybulb'])->toBe(27.0)
        ->and($parsed['temp_dewpoint'])->toBe(23.0)
        ->and($parsed['qnh_hpa'])->toBe(1013.0)
        ->and($parsed['qnh_inhg'])->toBe(29.93)
        ->and($parsed['qfe_hpa'])->toBe(1011.0)
        ->and($parsed['qfe_inhg'])->toBe(29.87)
        ->and($parsed['trend'])->toBe('NOSIG=')
        ->and($parsed['raw_message'])->toContain('https://bmkghalsel.carrd.co/#bandara');
});

test('parser is tolerant to typos, spacing variations, and missing degree symbols', function () {
    $sampleTypo = "METREPORT (QAM)\nOESMAN SADIK AIRPORT (WAEL)\nDATE: 15/08/2026\nTIME: 03.00 UTC\nWIND: 180 04 KT\nVISIBILITY: 8 KM\nWEATHER: NIL\nCLOUD: FEW 1500 FT\nTT/TD: 29C/25C\nQNH: 1010/29.84\nQFE: 1008/29.78\nREMARKS: -\nTREND: NOSIG=\nhttps://bmkghalsel.carrd.co/#bandara";

    $parser = new MetReportParserService();
    $parsedList = $parser->parseMultiple($sampleTypo);

    expect($parsedList)->toHaveCount(1);
    $parsed = $parsedList[0];

    expect($parsed['station_code'])->toBe('WAEL')
        ->and($parsed['data_timestamp'])->toBe('2026-08-15 03:00:00')
        ->and($parsed['wind'])->toBe('180 04 KT')
        ->and($parsed['temp_drybulb'])->toBe(29.0)
        ->and($parsed['temp_dewpoint'])->toBe(25.0)
        ->and($parsed['qnh_hpa'])->toBe(1010.0)
        ->and($parsed['qfe_hpa'])->toBe(1008.0);
});

test('authenticated user can view met report page and store manual qam message', function () {
    $user = Pegawai::create([
        'nama' => 'Test Admin',
        'email' => 'admin@bmkg.go.id',
        'password' => Hash::make('password'),
        'jenis_pegawai' => 'PNS',
    ]);

    $sampleText = "MET REPORT (QAM)\nOESMAN SADIK AIRPORT (WAEL)\nLABUHA\nDATE : 13 / 08 / 2026\nTIME : 23.00 UTC\n==================\nWIND : VRB 02 KT\nVISIBILITY : 9 KM\nWEATHER : NIL\nCLOUD : FEW 1800 FT\nTT/TD : 27°C / 23°C\nQNH : 1013 / 29.93\nQFE : 1011 / 29.87\nREMARKS : -\nTREND : NOSIG=\n==================\nhttps://bmkghalsel.carrd.co/#bandara";

    $response = $this->actingAs($user)
        ->post('/laporan/met-report/manual', [
            'raw_message' => $sampleText,
        ]);

    $response->assertStatus(302);

    $this->assertDatabaseHas('data_met_report', [
        'station_code' => 'WAEL',
        'data_timestamp' => '2026-08-13 23:00:00',
        'wind' => 'VRB 02 KT',
        'temp_drybulb' => 27.0,
        'temp_dewpoint' => 23.0,
        'qnh_hpa' => 1013.0,
    ]);
});

test('whatsapp webhook parses and stores incoming QAM group message automatically', function () {
    $sampleText = "MET REPORT (QAM)\nOESMAN SADIK AIRPORT (WAEL)\nLABUHA\nDATE : 13 / 08 / 2026\nTIME : 23.00 UTC\n==================\nWIND : VRB 02 KT\nVISIBILITY : 9 KM\nWEATHER : NIL\nCLOUD : FEW 1800 FT\nTT/TD : 27°C / 23°C\nQNH : 1013 / 29.93\nQFE : 1011 / 29.87\nREMARKS : -\nTREND : NOSIG=\n==================\nhttps://bmkghalsel.carrd.co/#bandara";

    $response = $this->postJson('/api/whatsapp/webhook', [
        'payload' => [
            'body' => $sampleText,
            '_data' => [
                'notifyName' => 'Dinar C. Nirwana',
            ],
        ],
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure(['status', 'data_id']);

    $this->assertDatabaseHas('data_met_report', [
        'station_code' => 'WAEL',
        'data_timestamp' => '2026-08-13 23:00:00',
        'qfe_hpa' => 1011.0,
    ]);
});
