<?php

use App\Http\Controllers\FlightDocumentController;
use App\Http\Controllers\JadwalController;
use App\Http\Controllers\MetReportController;
use App\Http\Controllers\MetarController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\PegawaiController;
use App\Http\Controllers\PibalController;
use App\Http\Controllers\SinoptikController;
use App\Http\Controllers\TaforController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

// Public Webhook for WhatsApp Gateway
Route::post('/api/whatsapp/webhook', [MetReportController::class, 'webhook'])->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Monitoring Performa untuk Kepala Stasiun
    Route::get('/monitoring', [MonitoringController::class, 'index'])->name('monitoring.index');

    // Pegawai Management Routes
    Route::resource('pegawai', PegawaiController::class)->except(['create', 'edit', 'show']);

    // Jadwal Dinas Routes (Operasional & TU, Teknisi, PPNPN, Master Shift)
    Route::get('/jadwal/operasional', [JadwalController::class, 'index'])->name('jadwal.operasional');
    Route::get('/jadwal/teknisi', [JadwalController::class, 'teknisiIndex'])->name('jadwal.teknisi');
    Route::get('/jadwal/ppnpn', [JadwalController::class, 'ppnpnIndex'])->name('jadwal.ppnpn');

    Route::post('/jadwal/update-cell', [JadwalController::class, 'updateCell'])->name('jadwal.update-cell');
    Route::post('/jadwal/batch-update-cells', [JadwalController::class, 'batchUpdateCells'])->name('jadwal.batch-update-cells');
    Route::post('/jadwal/bulk-update', [JadwalController::class, 'bulkUpdate'])->name('jadwal.bulk-update');
    Route::get('/jadwal/shifts', [JadwalController::class, 'shiftsIndex'])->name('jadwal.shifts.index');
    Route::post('/jadwal/shifts', [JadwalController::class, 'storeShift'])->name('jadwal.shifts.store');
    Route::patch('/jadwal/shifts/{shift}', [JadwalController::class, 'updateShift'])->name('jadwal.shifts.update');
    Route::delete('/jadwal/shifts/{shift}', [JadwalController::class, 'destroyShift'])->name('jadwal.shifts.destroy');
    Route::get('/jadwal/pdf', [JadwalController::class, 'exportPdf'])->name('jadwal.pdf');

    // Laporan Bulanan - Data PIBAL Routes
    Route::get('/laporan/pibal', [PibalController::class, 'index'])->name('laporan.pibal');
    Route::post('/laporan/pibal/sync', [PibalController::class, 'sync'])->name('laporan.pibal.sync');
    Route::get('/laporan/pibal/export-ae31', [PibalController::class, 'exportAe31'])->name('laporan.pibal.export-ae31');
    Route::get('/laporan/pibal/export-lapbul', [PibalController::class, 'exportLapbulPibal'])->name('laporan.pibal.export-lapbul');

    // Laporan Bulanan - Data TAFOR Routes
    Route::get('/laporan/tafor', [TaforController::class, 'index'])->name('laporan.tafor');
    Route::post('/laporan/tafor/sync', [TaforController::class, 'sync'])->name('laporan.tafor.sync');
    Route::get('/laporan/tafor/export-verifikasi', [TaforController::class, 'exportVerifikasi'])->name('laporan.tafor.export-verifikasi');

    // Laporan Bulanan - Data METAR Routes
    Route::get('/laporan/metar', [MetarController::class, 'index'])->name('laporan.metar');
    Route::post('/laporan/metar/sync', [MetarController::class, 'sync'])->name('laporan.metar.sync');

    // Laporan Bulanan - Data Sinoptik Routes
    Route::get('/laporan/sinoptik', [SinoptikController::class, 'index'])->name('laporan.sinoptik');
    Route::post('/laporan/sinoptik/sync', [SinoptikController::class, 'sync'])->name('laporan.sinoptik.sync');

    // Laporan Bulanan - Data MET REPORT (QAM) Routes
    Route::get('/laporan/met-report', [MetReportController::class, 'index'])->name('laporan.met-report');
    Route::post('/laporan/met-report/manual', [MetReportController::class, 'storeManual'])->name('laporan.met-report.manual');
    Route::post('/laporan/met-report/send-wa', [MetReportController::class, 'sendWhatsApp'])->name('laporan.met-report.send-wa');

    // Laporan Bulanan - Flight Document (FD) Routes
    Route::get('/laporan/flight-document', [FlightDocumentController::class, 'index'])->name('laporan.flight-document');
    Route::post('/laporan/flight-document/sync-inasiam', [FlightDocumentController::class, 'syncInasiam'])->name('laporan.flight-document.sync-inasiam');
    Route::post('/laporan/flight-document/manual', [FlightDocumentController::class, 'storeManual'])->name('laporan.flight-document.manual');
    Route::post('/laporan/flight-document/{id}/toggle-wa', [FlightDocumentController::class, 'toggleWaStatus'])->name('laporan.flight-document.toggle-wa');
    Route::delete('/laporan/flight-document/{id}', [FlightDocumentController::class, 'destroy'])->name('laporan.flight-document.destroy');
});

require __DIR__.'/settings.php';
