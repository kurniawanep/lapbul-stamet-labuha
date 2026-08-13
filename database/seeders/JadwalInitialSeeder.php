<?php

namespace Database\Seeders;

use App\Models\JadwalBulanan;
use App\Models\JadwalDetail;
use App\Models\MasterShift;
use App\Models\Pegawai;
use Carbon\Carbon;
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

        $pegawaisData = [
            [
                'nama' => 'BEN ARTHER MOLLE',
                'email' => 'ben.molle@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '198001012005011001',
                'pangkat' => 'Penata Tk. I',
                'golongan' => 'III/d',
                'role' => 'Kepala Stasiun',
                'jabatan' => 'Kepala Stasiun',
                'tanggal_masuk_kerja' => '2005-01-01',
            ],
            [
                'nama' => 'ANGGI FERINA LARASATI',
                'email' => 'anggi.larasati@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199502022018012001',
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Ahli Pertama',
                'tanggal_masuk_kerja' => '2018-01-01',
            ],
            [
                'nama' => 'SYAMSUL MARASAOLY',
                'email' => 'syamsul.marasaoly@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199203032015011002',
                'pangkat' => 'Pengatur',
                'golongan' => 'II/c',
                'role' => 'Tata Usaha',
                'jabatan' => 'PMG Pelaksana',
                'tanggal_masuk_kerja' => '2015-01-01',
            ],
            [
                'nama' => 'MUHD. YUSRAN T.B',
                'email' => 'yusran.tb@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '198804042010011003',
                'pangkat' => 'Penata Muda Tk. I',
                'golongan' => 'III/b',
                'role' => 'Teknisi',
                'jabatan' => 'Kepala Pokjung',
                'tanggal_masuk_kerja' => '2010-01-01',
            ],
            [
                'nama' => 'MIRZA CH. PESULIMA',
                'email' => 'mirza.pesulima@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199405052017011004',
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Mahir',
                'tanggal_masuk_kerja' => '2017-01-01',
            ],
            [
                'nama' => 'DINAR CAHYA NIRWANA',
                'email' => 'dinar.nirwana@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199606062019012002',
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Ahli Pertama',
                'tanggal_masuk_kerja' => '2019-01-01',
            ],
            [
                'nama' => 'REZKY RAMADHAN',
                'email' => 'rezky.ramadhan@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199707072020011005',
                'pangkat' => 'Pengatur Muda',
                'golongan' => 'II/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Observer',
                'tanggal_masuk_kerja' => '2020-01-01',
            ],
            [
                'nama' => 'IRSYAD HUMAIDI',
                'email' => 'irsyad.humaidi@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199808082021011006',
                'pangkat' => 'Pengatur Muda',
                'golongan' => 'II/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Observer',
                'tanggal_masuk_kerja' => '2021-01-01',
            ],
            [
                'nama' => 'A. RAFI PERDANA',
                'email' => 'rafi.perdana@bmkg.go.id',
                'password' => $defaultPassword,
                'jenis_pegawai' => 'PNS',
                'nip' => '199909092022011007',
                'pangkat' => 'Pengatur Muda',
                'golongan' => 'II/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Observer',
                'tanggal_masuk_kerja' => '2022-01-01',
            ],
        ];

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
