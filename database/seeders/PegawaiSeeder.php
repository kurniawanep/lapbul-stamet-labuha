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
                'nip' => '199304172013121001',
                'nama' => 'BEN ARTHER MOLLE, S. Tr., M. Si',
                'email' => 'ben.arther@bmkg.go.id',
                'password' => Hash::make('ben'),
                'pangkat' => 'Penata Tk. I',
                'golongan' => 'III.d',
                'role' => 'Kepala Stasiun',
                'jabatan' => 'Kepala Stasiun',
                'tanggal_masuk_kerja' => '2014-01-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '198609142006041002',
                'nama' => 'MUHD. YUSRAN TITDOY BADER, S.Tr',
                'email' => 'yusran@bmkg.go.id',
                'password' => Hash::make('yusran'),
                'pangkat' => 'Penata Tk. I',
                'golongan' => 'III.d',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Muda',
                'tanggal_masuk_kerja' => '2006-04-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '198207272005021001',
                'nama' => 'SYAMSUL MARASAOLY',
                'email' => 'syamsul.marasaoly@bmkg.go.id',
                'password' => Hash::make('syamsul'),
                'pangkat' => 'Penata',
                'golongan' => 'III.c',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Penyelia',
                'tanggal_masuk_kerja' => '2005-02-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '198702202006041003',
                'nama' => 'ZULFIKAR A. SALAM, S.Tr,. M.Kom',
                'email' => 'zulfikar.a.salam@bmkg.go.id',
                'password' => Hash::make('zulfikar'),
                'pangkat' => 'Penata',
                'golongan' => 'III.c',
                'role' => 'Teknisi',
                'jabatan' => 'PMG Muda',
                'tanggal_masuk_kerja' => '2006-04-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '198803112012101001',
                'nama' => 'ARWIN AJIM, S.Tr',
                'email' => 'arwin.ajim@bmkg.go.id',
                'password' => Hash::make('arwin'),
                'pangkat' => 'Penata',
                'golongan' => 'III.c',
                'role' => 'Teknisi',
                'jabatan' => 'PMG Muda',
                'tanggal_masuk_kerja' => '2013-10-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199312232014112001',
                'nama' => 'MIRZA CHRISANDY PESULIMA, S.Tr',
                'email' => 'mirza.pesulima@bmkg.go.id',
                'password' => Hash::make('mirza'),
                'pangkat' => 'Penata',
                'golongan' => 'III.c',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2014-11-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199701042016012001',
                'nama' => 'DINAR CAHYA NIRWANA, S.Tr. Met.',
                'email' => 'dinar.nirwana@bmkg.go.id',
                'password' => Hash::make('dinar'),
                'pangkat' => 'Penata Muda Tk. I',
                'golongan' => 'III.b',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2016-01-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199701232021061001',
                'nama' => 'REZKY RAMADHAN, S.Tr. Met.',
                'email' => 'rezky.ramadhan@bmkg.go.id',
                'password' => Hash::make('rezky'),
                'pangkat' => 'Penata Muda Tk. I',
                'golongan' => 'III.b',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2021-06-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '199412032014112001',
                'nama' => 'ANGGI FERINA LARASATI, S.Tr',
                'email' => 'anggi.larasati@bmkg.go.id',
                'password' => Hash::make('anggi'),
                'pangkat' => 'Penata',
                'golongan' => 'III.c',
                'role' => 'Tata Usaha',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2014-11-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '200211192025121002',
                'nama' => 'KURNIAWAN EKO PUTRA, S.Tr.Inst.',
                'email' => 'k.ekoptr@gmail.com',
                'password' => Hash::make('Cimpaeun12'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Teknisi',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2025-12-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '200305162025121005',
                'nama' => 'A RAFI PERDANA, S.Tr.Met.',
                'email' => 'rafi.perdana@bmkg.go.id',
                'password' => Hash::make('rafi'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2025-12-01',
            ],
            [
                'jenis_pegawai' => 'PNS',
                'nip' => '200104102025121002',
                'nama' => 'IRSYAD HUMAIDI, S.Tr.Met',
                'email' => 'irsyad.humaidi@bmkg.go.id',
                'password' => Hash::make('irsyad'),
                'pangkat' => 'Penata Muda',
                'golongan' => 'III/a',
                'role' => 'Observer & Forecaster',
                'jabatan' => 'PMG Pertama',
                'tanggal_masuk_kerja' => '2025-12-01',
            ],

        ];

        foreach ($pnsData as $data) {
            Pegawai::updateOrCreate(
                !empty($data['email']) ? ['email' => $data['email']] : ['nama' => $data['nama']],
                $data
            );
        }

        // Data PPNPN
        $ppnpnData = [
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'M. ABDU ABUBAKAR',
                'role' => 'PPNPN',
                'jabatan' => null,
                'tanggal_masuk_kerja' => '2018-01-01',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'MUHLIS AMIR',
                'role' => 'PPNPN',
                'jabatan' => null,
                'tanggal_masuk_kerja' => '2018-01-01',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'MUKLAS ADAM',
                'role' => 'PPNPN',
                'jabatan' => null,
                'tanggal_masuk_kerja' => '2014-01-01',
            ],
            [
                'jenis_pegawai' => 'PPNPN',
                'nama' => 'BEATRICH APRIANY NARA',
                'role' => 'Tata Usaha',
                'jabatan' => null,
                'tanggal_masuk_kerja' => '2025-10-01',
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
