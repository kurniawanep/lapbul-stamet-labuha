import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight,
    Briefcase,
    Calendar,
    Clock,
    CloudRain,
    CloudSun,
    Droplets,
    Eye,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Gauge,
    Layers,
    MessageSquare,
    Radio,
    ShieldCheck,
    Sparkles,
    Sun,
    Thermometer,
    TrendingUp,
    Users,
    Wind,
    Wrench,
    Zap,
} from 'lucide-react';
import type { BreadcrumbItem, SharedData } from '@/types';

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface LaporanCounts {
    pibal: number;
    tafor: number;
    metar: number;
    sinoptik: number;
    fklim: number;
    perawanan: number;
    penguapan: number;
    met_report: number;
    flight_document: number;
}

interface PageProps {
    bulan?: number;
    tahun?: number;
    pegawaiStats?: {
        total: number;
        pns: number;
        ppnpn: number;
    };
    laporanCounts?: LaporanCounts;
    stationInfo?: {
        nama: string;
        lokasi: string;
        wmo_id: string;
        station_id: number;
        timezone: string;
    };
    [key: string]: unknown;
}

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;
    const { bulan = 7, tahun = 2026, pegawaiStats, laporanCounts, stationInfo } = usePage<PageProps>().props;
    const user = auth.user;

    const currentMonthName = NAMA_BULAN[bulan - 1] || 'Juli';

    return (
        <>
            <Head title="Dashboard Utama - BMKG Oesman Sadik" />

            <div className="flex flex-col gap-8 p-4 md:p-8 bg-slate-50/50 min-h-screen pb-16">
                {/* 1. HERO BANNER EXECUTIVE */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950 p-6 md:p-10 text-white shadow-2xl border border-indigo-800/40">
                    <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                                    {stationInfo?.nama || 'Stasiun Meteorologi Oesman Sadik'}
                                </Badge>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                                    WMO: {stationInfo?.wmo_id || '97460'} &bull; ID: {stationInfo?.station_id || 138}
                                </Badge>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                                    {stationInfo?.timezone || 'WIT (UTC+9)'}
                                </Badge>
                            </div>

                            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                                Selamat Datang, {String(user?.nama || user?.name || 'Pegawai BMKG')}!
                            </h1>

                            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
                                Sistem Informasi Manajemen Jadwal Dinas, Monitoring Performa Operasional, dan Otomasi Laporan Bulanan.
                            </p>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <Link href="/monitoring">
                                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 text-xs">
                                    <TrendingUp className="h-4 w-4" /> Monitoring Performa
                                </Button>
                            </Link>

                            <Link href="/jadwal/operasional">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-2 text-xs">
                                    <Calendar className="h-4 w-4" /> Buka Jadwal Dinas
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. STATS OVERVIEW CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Pegawai */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total SDM Pegawai</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{pegawaiStats?.total ?? 0}</span>
                                    <span className="text-xs font-bold text-slate-500">Pegawai</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    PNS: {pegawaiStats?.pns ?? 0} &bull; PPNPN: {pegawaiStats?.ppnpn ?? 0}
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                                <Users className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Laporan Sinoptik */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sinoptik {currentMonthName}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-amber-600">{laporanCounts?.sinoptik ?? 0}</span>
                                    <span className="text-xs font-bold text-slate-500">Data</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Observasi 8 Jam Utama (UTC)
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                                <Sun className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Laporan METAR */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">METAR {currentMonthName}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-blue-600">{laporanCounts?.metar ?? 0}</span>
                                    <span className="text-xs font-bold text-slate-500">Laporan</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Observasi Cuaca Bandara
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                                <Gauge className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Status Sistem */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Integrasi BMKGSoft</span>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-black text-emerald-700">Terhubung</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    14 Modul Berjalan Normal
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. SECTION 1: ESEKUTIF & JADWAL DINAS */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-indigo-600" />
                            <h2 className="text-lg font-bold text-slate-900">Manajemen Pegawai &amp; Jadwal Dinas</h2>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                            4 Modul
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Operasional & TU */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800 border-none text-[10px] font-bold">Matriks</Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-blue-600 transition-colors">
                                    Jadwal Operasional &amp; TU
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Matriks piket bulanan observer, dinas pagi/siang/malam &amp; tata usaha.
                                </p>
                                <Link href="/jadwal/operasional" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Buka Matriks <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Teknisi */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                        <Wrench className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold">Teknisi</Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-amber-600 transition-colors">
                                    Jadwal Dinas Teknisi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Piket pemeliharaan peralatan meteorologi, radar &amp; sarana komunikasi.
                                </p>
                                <Link href="/jadwal/teknisi" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Jadwal <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* PPNPN */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">PPNPN</Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-emerald-600 transition-colors">
                                    Jadwal Dinas PPNPN
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Penjadwalan petugas PPNPN, kebersihan, pengamanan kantor &amp; taman.
                                </p>
                                <Link href="/jadwal/ppnpn" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Jadwal <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Pegawai Management */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-indigo-100 text-indigo-800 border-none text-[10px] font-bold">SDM</Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-indigo-600 transition-colors">
                                    Manajemen Pegawai
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Kelola database pegawai PNS &amp; PPNPN, NIP, pangkat &amp; akun login.
                                </p>
                                <Link href="/pegawai" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Kelola Data <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 4. SECTION 2: OTOMASI LAPORAN BULANAN METEOROLOGI */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-teal-600" />
                            <h2 className="text-lg font-bold text-slate-900">Otomasi &amp; Export Laporan Bulanan Meteorologi</h2>
                        </div>
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                            10 Modul Meteorologi
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {/* 1. PIBAL */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                                        <Wind className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-sky-100 text-sky-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.pibal ?? 0} Data
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-sky-600 transition-colors">
                                    Data PIBAL
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Pengamatan angin atas (00, 06, 12 UTC), Sandi PILOT &amp; Excel AE-39.
                                </p>
                                <Link href="/laporan/pibal" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat PIBAL <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 2. TAFOR */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                        <CloudRain className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.tafor ?? 0} Data
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-blue-600 transition-colors">
                                    Data TAFOR
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Prakiraan cuaca bandara TAF 24-jam &amp; evaluasi ketepatan waktu.
                                </p>
                                <Link href="/laporan/tafor" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat TAFOR <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 3. METAR */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <Gauge className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-indigo-100 text-indigo-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.metar ?? 0} Data
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-indigo-600 transition-colors">
                                    Data METAR
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Observasi cuaca rutin penerbangan jam-jaman / setengah jam.
                                </p>
                                <Link href="/laporan/metar" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat METAR <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 4. SINOPTIK */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                        <Sun className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.sinoptik ?? 0} Data
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-amber-600 transition-colors">
                                    Data Sinoptik
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Pengamatan permukaan 8 waktu utama &amp; evaluasi pengiriman GTS.
                                </p>
                                <Link href="/laporan/sinoptik" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Sinoptik <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 5. FKLIM */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                        <Thermometer className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-rose-100 text-rose-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.fklim ?? 0} Hari
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-rose-600 transition-colors">
                                    Data FKLIM
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Formulir klim bulanan (Suhu, RH, Hujan, Penyinaran &amp; Excel FKLIM).
                                </p>
                                <Link href="/laporan/fklim" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat FKLIM <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 6. PERAWANAN */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                                        <CloudSun className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-sky-100 text-sky-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.perawanan ?? 0} Hari
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-sky-600 transition-colors">
                                    Data Perawanan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Akumulasi tutupan awan harian (Cerah, Berawan) &amp; Export Excel.
                                </p>
                                <Link href="/laporan/perawanan" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Perawanan <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 7. PENGUAPAN */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                                        <Droplets className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-teal-100 text-teal-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.penguapan ?? 0} Hari
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-teal-600 transition-colors">
                                    Data Penguapan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Open Pan Evaporation, Hujan 07.00, Anemometer 0.5m &amp; Export Excel.
                                </p>
                                <Link href="/laporan/penguapan" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Penguapan <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 8. THUNDERSTORM */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-yellow-100 text-yellow-800 border-none text-[10px] font-bold">Docx</Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-yellow-600 transition-colors">
                                    Thunderstorm
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Rekapitulasi kejadian badai guntur bulanan &amp; Export DOCX resmi.
                                </p>
                                <Link href="/laporan/thunderstorm" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Thunderstorm <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 9. MET REPORT (QAM) */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.met_report ?? 0} QAM
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-emerald-600 transition-colors">
                                    MET REPORT (QAM)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Laporan cuaca penerbangan spesifik bandara &amp; Otomasi WA Gateway.
                                </p>
                                <Link href="/laporan/met-report" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat QAM <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        {/* 10. FLIGHT DOCUMENT */}
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl group">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                        <FileCheck className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-purple-100 text-purple-800 border-none text-[10px] font-bold">
                                        {laporanCounts?.flight_document ?? 0} Dokumen
                                    </Badge>
                                </div>
                                <CardTitle className="text-sm font-bold text-slate-900 pt-2 group-hover:text-purple-600 transition-colors">
                                    Flight Document
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-3">
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Penyusunan dokumen penerbangan (SIGWX, Satelit, TAF &amp; PDF).
                                </p>
                                <Link href="/laporan/flight-document" className="inline-block w-full">
                                    <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                        Lihat Dokumen <ArrowRight className="h-3 w-3" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* 5. SECTION 3: SYSTEM INTEGRATION & WHATSAPP GATEWAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* WhatsApp Gateway Card */}
                    <Card className="border border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Radio className="h-5 w-5 text-emerald-400" />
                                    <span>WhatsApp Gateway &amp; Notifikasi Otomatis</span>
                                </CardTitle>
                                <Badge className="bg-emerald-400 text-slate-950 font-bold">Active</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Pengiriman pesan cuaca penerbangan MET REPORT (QAM) secara otomatis ke grup WhatsApp maskapai dan operasional bandara.
                            </p>
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-semibold text-slate-500">Status Webhook &amp; Gateway:</span>
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Normal
                                </span>
                            </div>
                            <Link href="/pengaturan/whatsapp" className="inline-block w-full pt-1">
                                <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                    Pengaturan WhatsApp <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Master Shift & Jam Kerja Card */}
                    <Card className="border border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Layers className="h-5 w-5 text-indigo-400" />
                                    <span>Master Shift &amp; Jam Kerja Operasional</span>
                                </CardTitle>
                                <Badge className="bg-indigo-400 text-slate-950 font-bold">Konfigurasi</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Pengaturan kode shift (A, P, PF, S, M1, M2, WFH, dll.), jam masuk/keluar, serta warna indikator shift pada matriks jadwal.
                            </p>
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-semibold text-slate-500">Jam Operasional Stasiun:</span>
                                <span className="text-xs font-bold text-indigo-600">24 Jam Non-Stop</span>
                            </div>
                            <Link href="/jadwal/shifts" className="inline-block w-full pt-1">
                                <Button variant="outline" size="sm" className="w-full justify-between text-xs font-semibold">
                                    Pengaturan Master Shift <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            {
                title: 'Dashboard',
                href: '/dashboard',
            },
        ]}
    >
        {page}
    </AppLayout>
);
