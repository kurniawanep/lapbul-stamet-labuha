<?php

use App\Http\Controllers\Admin\HakAksesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FlightDocumentController;
use App\Http\Controllers\FklimController;
use App\Http\Controllers\JadwalController;
use App\Http\Controllers\MetReportController;
use App\Http\Controllers\MetarController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\PegawaiController;
use App\Http\Controllers\PenguapanController;
use App\Http\Controllers\PerawananController;
use App\Http\Controllers\PibalController;
use App\Http\Controllers\ProdukBulananController;
use App\Http\Controllers\SinoptikController;
use App\Http\Controllers\TaforController;
use App\Http\Controllers\ThunderstormController;
use App\Http\Controllers\WhatsAppManagementController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('dashboard');
})->name('home');

// Public Webhook for WhatsApp Gateway
Route::post('/api/whatsapp/webhook', [MetReportController::class, 'webhook']);

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Dashboard Manajemen Hak Akses (Khusus Super Admin)
    Route::middleware(['superadmin'])->prefix('admin')->name('admin.')->group(function () {
        Route::get('/hak-akses', [HakAksesController::class, 'index'])->name('hak-akses.index');
        Route::put('/hak-akses/{pegawai}', [HakAksesController::class, 'update'])->name('hak-akses.update');
        Route::post('/hak-akses/{pegawai}/reset', [HakAksesController::class, 'reset'])->name('hak-akses.reset');
    });

    // Monitoring Performa (Khusus Kepala Stasiun / User dengan izin monitoring.view)
    Route::get('/monitoring', [MonitoringController::class, 'index'])
        ->middleware('permission:monitoring.view')
        ->name('monitoring.index');

    // Pegawai Management Routes
    Route::get('/pegawai', [PegawaiController::class, 'index'])
        ->middleware('permission:pegawai.view')
        ->name('pegawai.index');
    Route::post('/pegawai', [PegawaiController::class, 'store'])
        ->middleware('permission:pegawai.manage')
        ->name('pegawai.store');
    Route::match(['put', 'patch'], '/pegawai/{pegawai}', [PegawaiController::class, 'update'])
        ->middleware('permission:pegawai.manage')
        ->name('pegawai.update');
    Route::delete('/pegawai/{pegawai}', [PegawaiController::class, 'destroy'])
        ->middleware('permission:pegawai.manage')
        ->name('pegawai.destroy');

    // Jadwal Dinas Routes (Operasional & TU, Teknisi, PPNPN, Master Shift)
    Route::get('/jadwal/operasional', [JadwalController::class, 'index'])
        ->middleware('permission:jadwal.view')
        ->name('jadwal.operasional');
    Route::get('/jadwal/teknisi', [JadwalController::class, 'teknisiIndex'])
        ->middleware('permission:jadwal.view')
        ->name('jadwal.teknisi');
    Route::get('/jadwal/ppnpn', [JadwalController::class, 'ppnpnIndex'])
        ->middleware('permission:jadwal.view')
        ->name('jadwal.ppnpn');
    Route::get('/jadwal/pdf', [JadwalController::class, 'exportPdf'])
        ->middleware('permission:jadwal.view')
        ->name('jadwal.pdf');

    // Jadwal Dinas Updates (Validasi role/kategori dilakukan di JadwalController@authorizeScheduleEdit)
    Route::post('/jadwal/update-cell', [JadwalController::class, 'updateCell'])->name('jadwal.update-cell');
    Route::post('/jadwal/batch-update-cells', [JadwalController::class, 'batchUpdateCells'])->name('jadwal.batch-update-cells');
    Route::post('/jadwal/bulk-update', [JadwalController::class, 'bulkUpdate'])->name('jadwal.bulk-update');
    Route::post('/jadwal/sync-observations', [JadwalController::class, 'syncObservations'])->name('jadwal.sync-observations');

    // Master Shifts Management (Authorized in Controller by Category or Super Admin)
    Route::get('/jadwal/shifts', [JadwalController::class, 'shiftsIndex'])
        ->name('jadwal.shifts.index');
    Route::post('/jadwal/shifts/batch-update', [JadwalController::class, 'batchUpdateShifts'])
        ->name('jadwal.shifts.batch-update');
    Route::post('/jadwal/shifts', [JadwalController::class, 'storeShift'])
        ->name('jadwal.shifts.store');
    Route::patch('/jadwal/shifts/{shift}', [JadwalController::class, 'updateShift'])
        ->name('jadwal.shifts.update');
    Route::delete('/jadwal/shifts/{shift}', [JadwalController::class, 'destroyShift'])
        ->name('jadwal.shifts.destroy');

    // Laporan Bulanan - Data PIBAL Routes
    Route::get('/laporan/pibal', [PibalController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.pibal');
    Route::post('/laporan/pibal/sync', [PibalController::class, 'sync'])
        ->middleware('permission:laporan.pibal')
        ->name('laporan.pibal.sync');
    Route::get('/laporan/pibal/export-ae31', [PibalController::class, 'exportAe31'])
        ->middleware('permission:laporan.view')
        ->name('laporan.pibal.export-ae31');
    Route::get('/laporan/pibal/export-lapbul', [PibalController::class, 'exportLapbulPibal'])
        ->middleware('permission:laporan.view')
        ->name('laporan.pibal.export-lapbul');
    Route::get('/laporan/pibal/export-lapbul-pibal', [PibalController::class, 'exportLapbulPibal'])
        ->middleware('permission:laporan.view')
        ->name('laporan.pibal.export-lapbul-pibal');

    // Laporan Bulanan - Data TAFOR Routes
    Route::get('/laporan/tafor', [TaforController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.tafor');
    Route::post('/laporan/tafor/sync', [TaforController::class, 'sync'])
        ->middleware('permission:laporan.tafor')
        ->name('laporan.tafor.sync');
    Route::get('/laporan/tafor/export-verifikasi', [TaforController::class, 'exportVerifikasi'])
        ->middleware('permission:laporan.view')
        ->name('laporan.tafor.export-verifikasi');

    // Laporan Bulanan - Data METAR Routes
    Route::get('/laporan/metar', [MetarController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.metar');
    Route::post('/laporan/metar/sync', [MetarController::class, 'sync'])
        ->middleware('permission:laporan.metar')
        ->name('laporan.metar.sync');

    // Laporan Bulanan - Data Sinoptik Routes
    Route::get('/laporan/sinoptik', [SinoptikController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.sinoptik');
    Route::post('/laporan/sinoptik/sync', [SinoptikController::class, 'sync'])
        ->middleware('permission:laporan.sinoptik')
        ->name('laporan.sinoptik.sync');

    // Laporan Bulanan - Data FKLIM Routes
    Route::get('/laporan/fklim', [FklimController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.fklim');
    Route::post('/laporan/fklim/sync', [FklimController::class, 'sync'])
        ->middleware('permission:laporan.fklim')
        ->name('laporan.fklim.sync');
    Route::get('/laporan/fklim/export-excel', [FklimController::class, 'exportExcel'])
        ->middleware('permission:laporan.view')
        ->name('laporan.fklim.export-excel');

    // Laporan Bulanan - Data Perawanan Routes
    Route::get('/laporan/perawanan', [PerawananController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.perawanan');
    Route::post('/laporan/perawanan/sync', [PerawananController::class, 'sync'])
        ->middleware('permission:laporan.perawanan')
        ->name('laporan.perawanan.sync');
    Route::get('/laporan/perawanan/export-excel', [PerawananController::class, 'exportExcel'])
        ->middleware('permission:laporan.view')
        ->name('laporan.perawanan.export-excel');

    // Laporan Bulanan - Data Penguapan Routes
    Route::get('/laporan/penguapan', [PenguapanController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.penguapan');
    Route::post('/laporan/penguapan/sync', [PenguapanController::class, 'sync'])
        ->middleware('permission:laporan.penguapan')
        ->name('laporan.penguapan.sync');
    Route::get('/laporan/penguapan/export-excel', [PenguapanController::class, 'exportExcel'])
        ->middleware('permission:laporan.view')
        ->name('laporan.penguapan.export-excel');

    // Laporan Bulanan - Data Thunderstorm Routes
    Route::get('/laporan/thunderstorm', [ThunderstormController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.thunderstorm');
    Route::get('/laporan/thunderstorm/export-docx', [ThunderstormController::class, 'exportDocx'])
        ->middleware('permission:laporan.view')
        ->name('laporan.thunderstorm.export-docx');

    // Laporan Bulanan - Data MET REPORT (QAM) Routes
    Route::get('/laporan/met-report', [MetReportController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.met-report');
    Route::post('/laporan/met-report/manual', [MetReportController::class, 'storeManual'])
        ->middleware('permission:laporan.met_report')
        ->name('laporan.met-report.manual');
    Route::post('/laporan/met-report/send-wa', [MetReportController::class, 'sendWhatsApp'])
        ->middleware('permission:laporan.met_report')
        ->name('laporan.met-report.send-wa');

    // Laporan Bulanan - Flight Document (FD) Routes
    Route::get('/laporan/flight-document', [FlightDocumentController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.flight-document');
    Route::post('/laporan/flight-document/sync-inasiam', [FlightDocumentController::class, 'syncInasiam'])
        ->middleware('permission:laporan.flight_document')
        ->name('laporan.flight-document.sync-inasiam');
    Route::post('/laporan/flight-document/manual', [FlightDocumentController::class, 'storeManual'])
        ->middleware('permission:laporan.flight_document')
        ->name('laporan.flight-document.manual');
    Route::post('/laporan/flight-document/{id}/toggle-wa', [FlightDocumentController::class, 'toggleWaStatus'])
        ->middleware('permission:laporan.flight_document')
        ->name('laporan.flight-document.toggle-wa');
    Route::delete('/laporan/flight-document/{id}', [FlightDocumentController::class, 'destroy'])
        ->middleware('permission:laporan.flight_document')
        ->name('laporan.flight-document.destroy');

    // Laporan Bulanan - Produk Bulanan Routes
    Route::get('/laporan/produk-bulanan', [ProdukBulananController::class, 'index'])
        ->middleware('permission:laporan.view')
        ->name('laporan.produk-bulanan');
    Route::get('/laporan/produk-bulanan/export-excel', [ProdukBulananController::class, 'exportExcel'])
        ->middleware('permission:laporan.view')
        ->name('laporan.produk-bulanan.export-excel');

    // Pengaturan WhatsApp Gateway Routes (Teknisi / Super Admin)
    Route::get('/pengaturan/whatsapp', [WhatsAppManagementController::class, 'index'])
        ->middleware('permission:whatsapp.manage')
        ->name('pengaturan.whatsapp');
    Route::post('/pengaturan/whatsapp/logout', [WhatsAppManagementController::class, 'logout'])
        ->middleware('permission:whatsapp.manage')
        ->name('pengaturan.whatsapp.logout');
    Route::post('/pengaturan/whatsapp/send-test', [WhatsAppManagementController::class, 'sendTest'])
        ->middleware('permission:whatsapp.manage')
        ->name('pengaturan.whatsapp.send-test');
});

require __DIR__.'/settings.php';
