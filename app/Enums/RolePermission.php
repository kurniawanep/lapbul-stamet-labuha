<?php

namespace App\Enums;

class RolePermission
{
    // Permission Constants
    public const MONITORING_VIEW = 'monitoring.view';

    public const PEGAWAI_VIEW = 'pegawai.view';
    public const PEGAWAI_MANAGE = 'pegawai.manage';

    public const JADWAL_VIEW = 'jadwal.view';
    public const JADWAL_OPERASIONAL_MANAGE = 'jadwal.operasional.manage';
    public const JADWAL_TEKNISI_MANAGE = 'jadwal.teknisi.manage';
    public const JADWAL_PPNPN_MANAGE = 'jadwal.ppnpn.manage';

    public const LAPORAN_VIEW = 'laporan.view';
    public const LAPORAN_PIBAL = 'laporan.pibal';
    public const LAPORAN_TAFOR = 'laporan.tafor';
    public const LAPORAN_METAR = 'laporan.metar';
    public const LAPORAN_SINOPTIK = 'laporan.sinoptik';
    public const LAPORAN_FKLIM = 'laporan.fklim';
    public const LAPORAN_PERAWANAN = 'laporan.perawanan';
    public const LAPORAN_PENGUAPAN = 'laporan.penguapan';
    public const LAPORAN_THUNDERSTORM = 'laporan.thunderstorm';
    public const LAPORAN_MET_REPORT = 'laporan.met_report';
    public const LAPORAN_FLIGHT_DOCUMENT = 'laporan.flight_document';
    public const LAPORAN_FLIGHT = 'laporan.flight';
    public const LAPORAN_PRODUK_BULANAN = 'laporan.produk_bulanan';

    public const WHATSAPP_MANAGE = 'whatsapp.manage';

    /**
     * Grouping of all permissions with metadata for UI and assignment.
     */
    public static function all(): array
    {
        return [
            'Pimpinan' => [
                self::MONITORING_VIEW => 'Monitoring Performa Stasiun',
            ],
            'Kepegawaian' => [
                self::PEGAWAI_VIEW => 'Melihat Daftar Pegawai',
                self::PEGAWAI_MANAGE => 'Mengelola Data Pegawai (Tambah/Edit/Hapus)',
            ],
            'Jadwal Dinas' => [
                self::JADWAL_VIEW => 'Melihat Seluruh Jadwal Dinas',
                self::JADWAL_OPERASIONAL_MANAGE => 'Edit / Update Jadwal Operasional & TU',
                self::JADWAL_TEKNISI_MANAGE => 'Edit / Update Jadwal Teknisi',
                self::JADWAL_PPNPN_MANAGE => 'Edit / Update Jadwal PPNPN',
            ],
            'Laporan Bulanan' => [
                self::LAPORAN_VIEW => 'Melihat Menu & Data Laporan Bulanan',
                self::LAPORAN_PIBAL => 'Kelola Data PIBAL (Sync / Export)',
                self::LAPORAN_TAFOR => 'Kelola Data TAFOR (Sync / Export)',
                self::LAPORAN_METAR => 'Kelola Data METAR (Sync)',
                self::LAPORAN_SINOPTIK => 'Kelola Data Sinoptik (Sync)',
                self::LAPORAN_FKLIM => 'Kelola Data FKLIM (Sync / Export)',
                self::LAPORAN_PERAWANAN => 'Kelola Data Perawanan (Sync / Export)',
                self::LAPORAN_PENGUAPAN => 'Kelola Data Penguapan (Sync / Export)',
                self::LAPORAN_THUNDERSTORM => 'Kelola Data Thunderstorm (Export)',
                self::LAPORAN_MET_REPORT => 'Kelola MET REPORT QAM (Input / Kirim WA)',
                self::LAPORAN_FLIGHT_DOCUMENT => 'Kelola Flight Document (Sync / Input / Delete)',
                self::LAPORAN_FLIGHT => 'Kelola Data Flight (Import / Input / Export)',
                self::LAPORAN_PRODUK_BULANAN => 'Kelola Produk Bulanan (Export Excel)',
            ],
            'Pengaturan Sistem' => [
                self::WHATSAPP_MANAGE => 'Pengaturan WhatsApp Gateway',
            ],
        ];
    }

    /**
     * Flattened list of all valid permission keys.
     */
    public static function allKeys(): array
    {
        $keys = [];
        foreach (self::all() as $permissions) {
            foreach ($permissions as $key => $label) {
                $keys[] = $key;
            }
        }
        return $keys;
    }

    /**
     * Default permissions assigned to each role.
     */
    public static function roleDefaults(?string $role): array
    {
        $allLaporan = [
            self::LAPORAN_VIEW,
            self::LAPORAN_PIBAL,
            self::LAPORAN_TAFOR,
            self::LAPORAN_METAR,
            self::LAPORAN_SINOPTIK,
            self::LAPORAN_FKLIM,
            self::LAPORAN_PERAWANAN,
            self::LAPORAN_PENGUAPAN,
            self::LAPORAN_THUNDERSTORM,
            self::LAPORAN_MET_REPORT,
            self::LAPORAN_FLIGHT_DOCUMENT,
            self::LAPORAN_FLIGHT,
            self::LAPORAN_PRODUK_BULANAN,
        ];

        return match ($role) {
            'Kepala Stasiun' => [
                self::MONITORING_VIEW,
                self::PEGAWAI_VIEW,
                self::JADWAL_VIEW,
                self::LAPORAN_VIEW,
            ],
            'Tata Usaha' => array_merge([
                self::PEGAWAI_VIEW,
                self::PEGAWAI_MANAGE,
                self::JADWAL_VIEW,
                self::JADWAL_OPERASIONAL_MANAGE,
            ], $allLaporan),
            'Observer & Forecaster' => array_merge([
                self::PEGAWAI_VIEW,
                self::JADWAL_VIEW,
            ], $allLaporan),
            'Teknisi' => [
                self::PEGAWAI_VIEW,
                self::JADWAL_VIEW,
                self::JADWAL_TEKNISI_MANAGE,
                self::LAPORAN_VIEW,
                self::WHATSAPP_MANAGE,
            ],
            'PPNPN' => [
                self::PEGAWAI_VIEW,
                self::JADWAL_VIEW,
            ],
            default => [
                self::PEGAWAI_VIEW,
                self::JADWAL_VIEW,
            ],
        };
    }
}
