<?php

namespace Database\Seeders;

use App\Models\JadwalBulanan;
use App\Models\JadwalDetail;
use App\Models\MasterShift;
use App\Models\Pegawai;
use Illuminate\Database\Seeder;

class JadwalDinasJuli2026Seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jadwalBulanan = JadwalBulanan::updateOrCreate(
            ['bulan' => 7, 'tahun' => 2026],
            [
                'stasiun' => 'Stasiun Meteorologi Oesman Sadik Halmahera Selatan',
                'zona_waktu' => 'WIT',
                'kepala_stasiun_nama' => 'BEN ARTHER MOLLE',
                'kepala_pokjung_nama' => 'MUHD. YUSRAN TITDOY BADER',
            ]
        );

        $schedules = [
            // TEKNISI
            [
                'name_search' => 'ZULFIKAR',
                'category' => 'teknisi',
                'shifts' => [
                    1 => 'PT', 2 => 'PT', 3 => 'PT', 4 => 'L', 5 => 'L', 6 => 'PT', 7 => 'PT', 8 => 'PT', 9 => 'ST', 10 => 'ST',
                    11 => 'L', 12 => 'L', 13 => 'PT', 14 => 'PT', 15 => 'PT', 16 => 'PT', 17 => 'PT', 18 => 'L', 19 => 'L', 20 => 'PT',
                    21 => 'PT', 22 => 'ST', 23 => 'L', 24 => 'L', 25 => 'PT', 26 => 'PT', 27 => 'PT', 28 => 'ST', 29 => 'L', 30 => 'L', 31 => 'PT',
                ],
            ],
            [
                'name_search' => 'ARWIN',
                'category' => 'teknisi',
                'shifts' => [
                    1 => 'CT', 2 => 'CT', 3 => 'CT', 4 => 'CT', 5 => 'CT', 6 => 'CT', 7 => 'CT', 8 => 'L', 9 => 'PT', 10 => 'PT',
                    11 => 'PT', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'ST',
                    21 => 'ST', 22 => 'PT', 23 => 'PT', 24 => 'PT', 25 => 'L', 26 => 'L', 27 => 'ST', 28 => 'PT', 29 => 'PT', 30 => 'PT', 31 => 'L',
                ],
            ],
            [
                'name_search' => 'KURNIAWAN',
                'category' => 'teknisi',
                'shifts' => [
                    1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            // OPERASIONAL
            [
                'name_search' => 'BEN ARTHER',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            [
                'name_search' => 'ANGGI',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            [
                'name_search' => 'SYAMSUL',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'CT', 2 => 'CT', 3 => 'CT', 4 => 'CT', 5 => 'CT', 6 => 'CT', 7 => 'L', 8 => 'M', 9 => 'S', 10 => 'P',
                    11 => 'L', 12 => 'M', 13 => 'M', 14 => 'S', 15 => 'P', 16 => 'L', 17 => 'M', 18 => 'S', 19 => 'P', 20 => 'L',
                    21 => 'L', 22 => 'M', 23 => 'S', 24 => 'P', 25 => 'L', 26 => 'L', 27 => 'M', 28 => 'S', 29 => 'P', 30 => 'L', 31 => 'L',
                ],
            ],
            [
                'name_search' => 'YUSRAN',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'P', 2 => 'L', 3 => 'L', 4 => 'M', 5 => 'S', 6 => 'CT', 7 => 'CT', 8 => 'CT', 9 => 'CT', 10 => 'CT',
                    11 => 'CT', 12 => 'CT', 13 => 'CT', 14 => 'M', 15 => 'S', 16 => 'P', 17 => 'L', 18 => 'L', 19 => 'M', 20 => 'S',
                    21 => 'P', 22 => 'L', 23 => 'L', 24 => 'M', 25 => 'S', 26 => 'P', 27 => 'L', 28 => 'L', 29 => 'M', 30 => 'S', 31 => 'P',
                ],
            ],
            [
                'name_search' => 'MIRZA',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'L', 2 => 'M', 3 => 'S', 4 => 'P', 5 => 'L', 6 => 'L', 7 => 'M', 8 => 'S', 9 => 'P', 10 => 'L',
                    11 => 'M', 12 => 'S', 13 => 'S', 14 => 'P', 15 => 'L', 16 => 'M', 17 => 'S', 18 => 'P', 19 => 'L', 20 => 'L',
                    21 => 'M', 22 => 'S', 23 => 'P', 24 => 'L', 25 => 'L', 26 => 'M', 27 => 'S', 28 => 'P', 29 => 'L', 30 => 'L', 31 => 'M',
                ],
            ],
            [
                'name_search' => 'DINAR',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'M', 2 => 'S', 3 => 'P', 4 => 'L', 5 => 'L', 6 => 'M', 7 => 'S', 8 => 'P', 9 => 'L', 10 => 'M',
                    11 => 'S', 12 => 'P', 13 => 'P', 14 => 'L', 15 => 'M', 16 => 'S', 17 => 'P', 18 => 'L', 19 => 'L', 20 => 'M',
                    21 => 'S', 22 => 'P', 23 => 'L', 24 => 'L', 25 => 'M', 26 => 'S', 27 => 'P', 28 => 'L', 29 => 'L', 30 => 'M', 31 => 'S',
                ],
            ],
            [
                'name_search' => 'REZKY',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'S', 2 => 'P', 3 => 'L', 4 => 'L', 5 => 'M', 6 => 'S', 7 => 'L', 8 => 'L', 9 => 'M', 10 => 'S',
                    11 => 'P', 12 => 'L', 13 => 'P', 14 => 'P', 15 => 'P', 16 => 'P', 17 => 'L', 18 => 'M', 19 => 'S', 20 => 'P',
                    21 => 'L', 22 => 'L', 23 => 'M', 24 => 'S', 25 => 'P', 26 => 'L', 27 => 'L', 28 => 'M', 29 => 'S', 30 => 'P', 31 => 'L',
                ],
            ],
            [
                'name_search' => 'IRSYAD',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            [
                'name_search' => 'RAFI',
                'category' => 'operasional',
                'shifts' => [
                    1 => 'L', 2 => 'L', 3 => 'M', 4 => 'S', 5 => 'P', 6 => 'P', 7 => 'P', 8 => 'L', 9 => 'L', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            // PPNPN
            [
                'name_search' => 'BEATRICH',
                'category' => 'ppnpn',
                'shifts' => [
                    1 => 'A', 2 => 'A', 3 => 'A', 4 => 'L', 5 => 'L', 6 => 'A', 7 => 'A', 8 => 'A', 9 => 'A', 10 => 'A',
                    11 => 'L', 12 => 'L', 13 => 'A', 14 => 'A', 15 => 'A', 16 => 'A', 17 => 'A', 18 => 'L', 19 => 'L', 20 => 'A',
                    21 => 'A', 22 => 'A', 23 => 'A', 24 => 'A', 25 => 'L', 26 => 'L', 27 => 'A', 28 => 'A', 29 => 'A', 30 => 'A', 31 => 'A',
                ],
            ],
            [
                'name_search' => 'MUKLAS',
                'category' => 'ppnpn',
                'shifts' => [
                    1 => 'M', 2 => 'M', 3 => 'L', 4 => 'L', 5 => 'P', 6 => 'P', 7 => 'CT', 8 => 'CT', 9 => 'CT', 10 => 'L',
                    11 => 'M', 12 => 'M', 13 => 'L', 14 => 'L', 15 => 'P', 16 => 'P', 17 => 'M', 18 => 'M', 19 => 'L', 20 => 'L',
                    21 => 'P', 22 => 'P', 23 => 'M', 24 => 'M', 25 => 'L', 26 => 'L', 27 => 'P', 28 => 'P', 29 => 'M', 30 => 'M', 31 => 'L',
                ],
            ],
            [
                'name_search' => 'MUHLIS',
                'category' => 'ppnpn',
                'shifts' => [
                    1 => 'P', 2 => 'P', 3 => 'M', 4 => 'M', 5 => 'L', 6 => 'L', 7 => 'M', 8 => 'M', 9 => 'L', 10 => 'L',
                    11 => 'P', 12 => 'P', 13 => 'M', 14 => 'M', 15 => 'L', 16 => 'L', 17 => 'P', 18 => 'P', 19 => 'M', 20 => 'M',
                    21 => 'L', 22 => 'L', 23 => 'P', 24 => 'P', 25 => 'M', 26 => 'M', 27 => 'L', 28 => 'L', 29 => 'P', 30 => 'P', 31 => 'M',
                ],
            ],
            [
                'name_search' => 'ABDU',
                'category' => 'ppnpn',
                'shifts' => [
                    1 => 'L', 2 => 'L', 3 => 'P', 4 => 'P', 5 => 'M', 6 => 'M', 7 => 'L', 8 => 'L', 9 => 'M', 10 => 'M',
                    11 => 'L', 12 => 'L', 13 => 'P', 14 => 'P', 15 => 'M', 16 => 'M', 17 => 'L', 18 => 'L', 19 => 'P', 20 => 'P',
                    21 => 'M', 22 => 'M', 23 => 'L', 24 => 'L', 25 => 'P', 26 => 'P', 27 => 'M', 28 => 'M', 29 => 'L', 30 => 'L', 31 => 'P',
                ],
            ],
        ];

        $jadwalBulanan->copyMasterShifts();

        foreach ($schedules as $sched) {
            $pegawai = Pegawai::where('nama', 'like', '%' . $sched['name_search'] . '%')->first();

            if (!$pegawai) {
                continue;
            }

            foreach ($sched['shifts'] as $day => $kodeShift) {
                $shift = \App\Models\JadwalBulananShift::where('jadwal_bulanan_id', $jadwalBulanan->id)
                    ->where('category', $sched['category'])
                    ->where('kode_shift', $kodeShift)
                    ->first();

                if (!$shift) {
                    continue;
                }

                $formattedDay = sprintf('%02d', $day);
                $tanggal = "2026-07-{$formattedDay}";

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
