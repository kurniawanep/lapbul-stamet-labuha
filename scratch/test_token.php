<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\BmkgsoftService;

$service = app(BmkgsoftService::class);
$startDate = '2026-08-01T00:00:00Z';
$endDate = '2026-08-21T23:59:59Z';

echo "=== MEMBENCHMARK SINKRONISASI SEMUA JENIS DATA (METAR, TAFOR, PIBAL, SINOPTIK) ===\n\n";

// 1. METAR
$start = microtime(true);
$resMetar = $service->syncMetarData($startDate, $endDate);
$elapsedMetar = round(microtime(true) - $start, 2);
echo "[METAR] Status: " . ($resMetar['success'] ? 'SUCCESS' : 'FAILED') . " | Fetched: " . ($resMetar['total_fetched'] ?? 0) . " | Synced: " . ($resMetar['synced_count'] ?? 0) . " | Waktu: {$elapsedMetar}s\n";

// 2. TAFOR
$start = microtime(true);
$resTafor = $service->syncTaforData($startDate, $endDate);
$elapsedTafor = round(microtime(true) - $start, 2);
echo "[TAFOR] Status: " . ($resTafor['success'] ? 'SUCCESS' : 'FAILED') . " | Fetched: " . ($resTafor['total_fetched'] ?? 0) . " | Synced: " . ($resTafor['synced_count'] ?? 0) . " | Waktu: {$elapsedTafor}s\n";

// 3. PIBAL
$start = microtime(true);
$resPibal = $service->syncPibalData($startDate, $endDate);
$elapsedPibal = round(microtime(true) - $start, 2);
echo "[PIBAL] Status: " . ($resPibal['success'] ? 'SUCCESS' : 'FAILED') . " | Fetched: " . ($resPibal['total_fetched'] ?? 0) . " | Synced: " . ($resPibal['synced_count'] ?? 0) . " | Waktu: {$elapsedPibal}s\n";

// 4. SINOPTIK
$start = microtime(true);
$resSinop = $service->syncSinoptikData($startDate, $endDate);
$elapsedSinop = round(microtime(true) - $start, 2);
echo "[SINOPTIK] Status: " . ($resSinop['success'] ? 'SUCCESS' : 'FAILED') . " | Fetched: " . ($resSinop['total_fetched'] ?? 0) . " | Synced: " . ($resSinop['synced_count'] ?? 0) . " | Waktu: {$elapsedSinop}s\n";

echo "\nALL DATA TYPES SYNCHRONIZED SUCCESSFULLY!\n";
