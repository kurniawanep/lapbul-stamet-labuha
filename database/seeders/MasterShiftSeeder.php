<?php

namespace Database\Seeders;

use App\Models\MasterShift;
use Illuminate\Database\Seeder;

class MasterShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categoriesShifts = [
            'operasional' => [
                ['kode_shift' => 'A', 'nama_shift' => 'PAGI TU', 'jam_masuk' => '07:30:00', 'jam_keluar' => '16:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI OBS', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'PF', 'nama_shift' => 'PAGI FOD', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG OBS', 'jam_masuk' => '15:30:00', 'jam_keluar' => '23:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M', 'nama_shift' => 'MALAM OBS', 'jam_masuk' => '23:30:00', 'jam_keluar' => '07:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M1', 'nama_shift' => 'MALAM 1', 'jam_masuk' => '19:30:00', 'jam_keluar' => '01:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M2', 'nama_shift' => 'MALAM 2', 'jam_masuk' => '01:30:00', 'jam_keluar' => '07:45:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'WFH', 'nama_shift' => 'WORK FROM HOME', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'LATSAR', 'nama_shift' => 'LATSAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
            ],
            'teknisi' => [
                ['kode_shift' => 'PT', 'nama_shift' => 'PAGI TEKNISI', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'ST', 'nama_shift' => 'SIANG TEKNISI', 'jam_masuk' => '14:30:00', 'jam_keluar' => '22:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'A', 'nama_shift' => 'PAGI TU', 'jam_masuk' => '07:30:00', 'jam_keluar' => '16:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI TEKNISI', 'jam_masuk' => '07:30:00', 'jam_keluar' => '15:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG TEKNISI', 'jam_masuk' => '13:30:00', 'jam_keluar' => '20:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M', 'nama_shift' => 'MALAM TEKNISI', 'jam_masuk' => '19:30:00', 'jam_keluar' => '07:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'WFH', 'nama_shift' => 'WORK FROM HOME', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
            ],
            'ppnpn' => [
                ['kode_shift' => 'A', 'nama_shift' => 'PAGI TU', 'jam_masuk' => '07:30:00', 'jam_keluar' => '16:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'P', 'nama_shift' => 'PAGI PPNPN', 'jam_masuk' => '08:00:00', 'jam_keluar' => '18:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'S', 'nama_shift' => 'SIANG PPNPN', 'jam_masuk' => '13:30:00', 'jam_keluar' => '20:30:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'M', 'nama_shift' => 'MALAM PPNPN', 'jam_masuk' => '20:00:00', 'jam_keluar' => '08:00:00', 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'L', 'nama_shift' => 'LIBUR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
                ['kode_shift' => 'DL', 'nama_shift' => 'DINAS LUAR', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => false],
                ['kode_shift' => 'CT', 'nama_shift' => 'CUTI', 'jam_masuk' => null, 'jam_keluar' => null, 'is_tidak_masuk_kerja' => true],
            ],
        ];

        foreach ($categoriesShifts as $cat => $shiftsData) {
            foreach ($shiftsData as $sd) {
                $sd['category'] = $cat;
                MasterShift::updateOrCreate(
                    ['kode_shift' => $sd['kode_shift'], 'category' => $cat],
                    $sd
                );
            }
        }
    }
}
