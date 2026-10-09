<?php

namespace App\Console\Commands;

use App\Services\SimpanMkgSyncService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SyncSimpanMkgCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'simpan-mkg:sync {--bulan= : Nomor bulan (1-12)} {--tahun= : Tahun (misal 2026)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sinkronisasi data log diseminasi dari Supabase SIMPAN-MKG dan atribusikan ke jadwal dinas operasional';

    /**
     * Execute the console command.
     */
    public function handle(SimpanMkgSyncService $syncService): int
    {
        $bulan = (int) ($this->option('bulan') ?: Carbon::now()->month);
        $tahun = (int) ($this->option('tahun') ?: Carbon::now()->year);

        $this->info("Memulai sinkronisasi SIMPAN-MKG untuk periode {$bulan}/{$tahun}...");

        $result = $syncService->syncMonth($bulan, $tahun);

        if (!$result['success']) {
            $this->error("Sinkronisasi gagal: " . $result['message']);
            return Command::FAILURE;
        }

        $this->info($result['message']);
        $this->table(
            ['ID', 'Waktu (WIT)', 'Petugas Berdinas', 'Shift', 'Media', 'Status'],
            array_map(fn($d) => [
                $d['id'],
                $d['waktu_wit'],
                $d['pegawai'],
                $d['shift'],
                $d['media_type'],
                $d['status'],
            ], $result['details'] ?? [])
        );

        return Command::SUCCESS;
    }
}
