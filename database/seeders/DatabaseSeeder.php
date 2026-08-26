<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // $this->call(JadwalInitialSeeder::class);
        $this->call(PegawaiSeeder::class);
        $this->call(MasterShiftSeeder::class);
        $this->call(JadwalDinasOperasional2026Seeder::class);
        $this->call(JadwalDinasPpnpn2026Seeder::class);
        $this->call(JadwalDinasTeknisi2026Seeder::class);
        $this->call(DataFlightDocumentSeeder::class);
    }
}
