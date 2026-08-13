<?php

namespace Database\Seeders;

use App\Models\Pegawai;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PegawaiSeeder extends Seeder
{
    public function run()
    {
        // Data PNS
        $pnsData = [
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '200211192025121002',
                'nama' => 'KURNIAWAN EKO PUTRA',
                'email' => 'k.ekoptr@gmail.com',
                'password' => Hash::make('Cimpaeun12'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Teknisi',
                'jabatan' => 'PMG pertama',
                'tanggal_masuk_kerja' => '2005-12-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '198502022007021002',
                'nama' => 'MUHD. YUSRAN T.B',
                'email' => 'yusran.tb@bmkg.go.id',
                'password' => Hash::make('password'),
                'pangkat' => 'Penata',
                'golongan' => 'III/c',
                'role' => 'Tata Usaha',
                'jabatan' => 'Petugas Informasi Publik',
                'tanggal_masuk_kerja' => '2007-02-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199003032012031003',
                'nama' => 'FATIMAH SARI',
                'email' => 'fatimah.sari@bmkg.go.id',
                'password' => Hash::make('password'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Pengamat Meteorologi',
                'tanggal_masuk_kerja' => '2012-03-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199204042015041004',
                'nama' => 'ABDUL WAHAB',
                'email' => 'abdul.wahab@bmkg.go.id',
                'password' => Hash::make('password'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Pengamat Meteorologi',
                'tanggal_masuk_kerja' => '2015-04-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199305052016051005',
                'nama' => 'ANDI JAYA',
                'email' => 'andi.jaya@bmkg.go.id',
                'password' => Hash::make('password'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Pengamat Meteorologi',
                'tanggal_masuk_kerja' => '2016-05-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199406062018061006',
                'nama' => 'SITI RAHAYU',
                'email' => 'siti.rahayu@bmkg.go.id',
                'password' => Hash::make('password'),
                'pangkat' => 'Penata Muda Tingkat I',
                'golongan' => 'III/b',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'Analis Cuaca',
                'tanggal_masuk_kerja' => '2018-06-01',
            ],
        ];

        foreach ($pnsData as $data) {
            Pegawai::updateOrCreate(
                ['nama' => $data['nama']],
                $data
            );
        }

        // Data PPNPN
        $ppnpnData = [
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 1',
                'jabatan' => 'Teknisi Pemeliharaan',
                'tanggal_masuk_kerja' => '2020-01-01',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 2',
                'jabatan' => 'Petugas Kebersihan',
                'tanggal_masuk_kerja' => '2020-01-15',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 3',
                'jabatan' => 'Pramubakti',
                'tanggal_masuk_kerja' => '2021-02-01',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 4',
                'jabatan' => 'Pengemudi',
                'tanggal_masuk_kerja' => '2021-03-10',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 5',
                'jabatan' => 'Penjaga Malam',
                'tanggal_masuk_kerja' => '2021-04-05',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'PEMUDA 6',
                'jabatan' => 'Asisten Teknisi',
                'tanggal_masuk_kerja' => '2022-05-20',
            ],
        ];

        foreach ($ppnpnData as $data) {
            Pegawai::updateOrCreate(
                ['nama' => $data['nama']],
                $data
            );
        }
    }
}
