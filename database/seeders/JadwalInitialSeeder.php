<?php

namespace Database\Seeders;

use App\Models\JadwalBulanan;
use App\Models\JadwalDetail;
use App\Models\MasterShift;
use App\Models\Pegawai;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class JadwalInitialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categoriesShifts = [
            'operasional' => [
                ['kode_shift' => 'A', 'nama_shift' => 'PAGI TU', 'jam_masuk' => '08:00:00', 'jam_keluar' => '15:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI OBS', 'jam_masuk' => '07:30:00', 'jam_keluar' => '13:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'PF', 'nama_shift' => 'PAGI FOD', 'jam_masuk' => '07:30:00', 'jam_keluar' => '13:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG OBS', 'jam_masuk' => '13:30:00', 'jam_keluar' => '19:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M1', 'nama_shift' => 'MALAM 1', 'jam_masuk' => '19:30:00', 'jam_keluar' => '01:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M2', 'nama_shift' => 'MALAM 2', 'jam_masuk' => '01:30:00', 'jam_keluar' => '07:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'WFH', 'nama_shift' => 'WORK FROM HOME', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'LATSAR', 'nama_shift' => 'LATSAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
            ],
            'teknisi' => [
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI TEKNISI', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG TEKNISI', 'jam_masuk' => '13:30:00', 'jam_keluar' => '20:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M', 'nama_shift' => 'MALAM TEKNISI', 'jam_masuk' => '19:30:00', 'jam_keluar' => '07:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'WFH', 'nama_shift' => 'WORK FROM HOME', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
            ],
            'ppnpn' => [
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI PPNPN', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG PPNPN', 'jam_masuk' => '13:30:00', 'jam_keluar' => '20:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M', 'nama_shift' => 'MALAM PPNPN', 'jam_masuk' => '19:30:00', 'jam_keluar' => '07:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
            ],
        ];

        $shiftModels = [];
        foreach ($categoriesShifts as $cat => $shiftsData) {
            foreach ($shiftsData as $sd) {
                $sd['category'] = $cat;
                $created = MasterShift::updateOrCreate(
                    ['kode_shift' => $sd['kode_shift'], 'category' => $cat],
                    $sd
                );
                $shiftModels[$cat][$sd['kode_shift']] = $created;
            }
        }

        $defaultPassword = Hash::make('password');

        $pegawaiModels = [];
        foreach ($pegawaisData as $pd) {
            $pegawaiModels[] = Pegawai::updateOrCreate(
                ['nama' => $pd['nama']],
                $pd
            );
        }

        // Create Monthly Schedule for August 2026
        $jadwalBulanan = JadwalBulanan::updateOrCreate(
            ['bulan' => 8, 'tahun' => 2026],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );

        $shiftPattern = ['P', 'PF', 'S', 'M1', 'M2', 'L', 'A', 'WFH', 'L'];
        $numDays = 31;

        foreach ($pegawaiModels as $index => $pegawai) {
            $cat = ($pegawai->jenis_pegawai === 'PPNPN') ? 'ppnpn' : (($pegawai->role === 'Teknisi') ? 'teknisi' : 'operasional');
            $availableShifts = $shiftModels[$cat];

            for ($day = 1; $day <= $numDays; $day++) {
                $tanggal = sprintf('2026-08-%02d', $day);
                $shiftCode = $shiftPattern[($index + $day) % count($shiftPattern)];
                $shift = $availableShifts[$shiftCode] ?? reset($availableShifts);

                JadwalDetail::updateOrCreate(
                    [
                        'pegawai_id' => $pegawai->id,
                        'tanggal' => $tanggal,
                    ],
                    [
                        'jadwal_bulanan_id' => $jadwalBulanan->id,
                        'shift_id' => $shift->id,
                    ]
                );
            }
        }
    }
}
