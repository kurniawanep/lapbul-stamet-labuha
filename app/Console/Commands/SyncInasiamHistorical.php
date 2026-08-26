<?php

namespace App\Console\Commands;

use App\Services\InasiamService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SyncInasiamHistorical extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inasiam:sync-historical 
                            {--bulan= : Nomor bulan (1-12)} 
                            {--tahun= : Tahun (misal: 2026)} 
                            {--limit=500 : Jumlah maksimal record yang diambil}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Menyinkronkan data Flight Document dari INA-SIAM API untuk bulan dan tahun sebelumnya.';

    /**
     * Execute the console command.
     */
    public function handle(InasiamService $inasiamService): int
    {
        $bulan = $this->option('bulan') ? (int) $this->option('bulan') : null;
        $tahun = $this->option('tahun') ? (int) $this->option('tahun') : Carbon::now()->year;
        $limit = (int) $this->option('limit');

        $dateFrom = null;
        $dateTo = null;

        if ($bulan) {
            $startDate = Carbon::createFromDate($tahun, $bulan, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
            $dateFrom = $startDate->toDateTimeString();
            $dateTo = $endDate->toDateTimeString();

            $this->info("Memulai sinkronisasi Flight Document dari INA-SIAM untuk periode {$bulan}/{$tahun}...");
        } else {
            $this->info("Memulai sinkronisasi {$limit} Flight Document terbaru dari INA-SIAM...");
        }

        $result = $inasiamService->syncFlightDocuments($limit, $dateFrom, $dateTo);

        if ($result['success']) {
            $this->info("✓ " . $result['message']);
            return Command::SUCCESS;
        }

        $this->error("✗ Gagal menyinkronkan data: " . ($result['error_reason'] ?? 'Error tidak diketahui'));
        return Command::FAILURE;
    }
}
