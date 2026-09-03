import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowDownUp, Calendar, CheckCircle2, Cloud, CloudDrizzle, CloudSun, Eye, FileSpreadsheet, Info, RefreshCw, Sun } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/perawanan' },
    { title: 'Data Perawanan', href: '/laporan/perawanan' },
];

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface PerawananRecord {
    id: number;
    station_id: number;
    station_name: string;
    data_timestamp: string;
    clear: number;
    partly_cloudy: number;
    cloudy: number;
    totally_cloudy: number;
    total_observation: number;
    notes?: string | null;
    observer_name?: string | null;
    pegawai?: { id: number; nama: string } | null;
}

interface MonthlyTrendItem {
    month_num: number;
    month_name: string;
    clear: number;
    partly_cloudy: number;
    cloudy: number;
    totally_cloudy: number;
    days_reported: number;
    target_days: number;
}

interface DashboardStats {
    summary: {
        days_reported: number;
        target_days: number;
        completeness_pct: number;
        total_clear: number;
        total_partly_cloudy: number;
        total_cloudy: number;
        total_totally_cloudy: number;
        total_observation_hours: number;
        dominant_category: string;
        dominant_hours: number;
    };
    missing_days: number[];
    monthly_trend: MonthlyTrendItem[];
}

interface PageProps {
    perawananRecords: {
        data: PerawananRecord[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    bulan: number;
    tahun: number;
    daysInMonth: number;
    totalRecords: number;
    sortOrder: string;
    dashboardStats: DashboardStats;
    flash?: { success?: string; error?: string; sync_result?: any };
    [key: string]: unknown;
}

export default function PerawananIndex() {
    const { perawananRecords, bulan, tahun, daysInMonth, totalRecords, sortOrder, dashboardStats, flash } = usePage<PageProps>().props;

    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PerawananRecord | null>(null);

    const recordsList = perawananRecords.data || [];

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        router.get('/laporan/perawanan', {
            bulan: newBulan,
            tahun: newTahun,
            sort: sortOrder,
        }, { preserveState: true });
    };

    const handleFilterChange = (updates: { newSortOrder?: string }) => {
        router.get('/laporan/perawanan', {
            bulan,
            tahun,
            sort: updates.newSortOrder ?? sortOrder,
        }, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/perawanan/sync', { bulan, tahun }, {
            onFinish: () => setIsSyncing(false),
            preserveScroll: true,
        });
    };

    const formatDateTimeDisplay = (rawTs: string) => {
        const d = new Date(rawTs);
        const utcDay = String(d.getUTCDate()).padStart(2, '0');
        const utcMonth = NAMA_BULAN[d.getUTCMonth()];
        const utcYear = d.getUTCFullYear();
        const topUtc = `${utcDay} ${utcMonth} ${utcYear}`;

        const witDay = String(d.getDate()).padStart(2, '0');
        const witMonth = NAMA_BULAN[d.getMonth()];
        const witYear = d.getFullYear();
        const bottomWit = `${witDay} ${witMonth} ${witYear} (WIT)`;

        return { topUtc, bottomWit, rawDateStr: `${utcYear}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${utcDay}` };
    };

    return (
        <>
            <Head title={`Laporan Perawanan - ${NAMA_BULAN[bulan - 1]} ${tahun}`} />

            <div className="space-y-6 pb-12">
                {/* HERO HEADER BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-blue-950 p-6 md:p-8 text-white shadow-2xl border border-sky-800/40">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold backdrop-blur-md">
                                <CloudSun className="h-3.5 w-3.5 text-sky-400" />
                                <span>Pengamatan Awan &amp; Perawanan Harian</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                                Laporan Bulanan Perawanan
                            </h1>
                            <p className="text-slate-300 text-xs md:text-sm max-w-xl">
                                Stasiun Meteorologi Oesman Sadik Halmahera Selatan
                            </p>
                        </div>

                        {/* CONTROLS */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
                                <Calendar className="h-4 w-4 text-sky-400 ml-2" />
                                <Select
                                    value={String(bulan)}
                                    onValueChange={(val) => handleMonthYearChange(Number(val), tahun)}
                                >
                                    <SelectTrigger className="w-[120px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                        {NAMA_BULAN.map((n, i) => (
                                            <SelectItem key={i + 1} value={String(i + 1)}>
                                                {n}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={String(tahun)}
                                    onValueChange={(val) => handleMonthYearChange(bulan, Number(val))}
                                >
                                    <SelectTrigger className="w-[90px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                        {[2024, 2025, 2026, 2027].map((y) => (
                                            <SelectItem key={y} value={String(y)}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="h-10 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-sky-500/20 transition-all flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
                            </Button>

                            <Button
                                onClick={() => window.location.href = `/laporan/perawanan/export-excel?bulan=${bulan}&tahun=${tahun}`}
                                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Excel Laporan
                            </Button>
                        </div>
                    </div>
                </div>

                {/* FLASH NOTIFICATION */}
                {flash?.success && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold">{flash.success}</p>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 shadow-sm">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <p className="text-xs font-semibold">{flash.error}</p>
                    </div>
                )}

                {/* 4 STAT SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Hari Disinkronkan */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hari Disinkronkan</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-slate-900">{dashboardStats.summary.days_reported}</span>
                                    <span className="text-xs font-bold text-slate-500">/ {dashboardStats.summary.target_days} Hari</span>
                                </div>
                                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                                    <span>Kelengkapan: {dashboardStats.summary.completeness_pct}%</span>
                                </div>
                            </div>
                            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                                <Calendar className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Cerah & Cerah Berawan */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cerah &amp; Cerah Berawan</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-amber-600">
                                        {dashboardStats.summary.total_clear + dashboardStats.summary.total_partly_cloudy}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">Jam</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Cerah: {dashboardStats.summary.total_clear}j &bull; Cerah Berawan: {dashboardStats.summary.total_partly_cloudy}j
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                                <Sun className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Berawan & Mendung */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Berawan &amp; Mendung</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-sky-700">
                                        {dashboardStats.summary.total_cloudy + dashboardStats.summary.total_totally_cloudy}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">Jam</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Berawan: {dashboardStats.summary.total_cloudy}j &bull; Mendung: {dashboardStats.summary.total_totally_cloudy}j
                                </p>
                            </div>
                            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                                <Cloud className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Kategori Dominan */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori Dominan</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black text-slate-900 truncate max-w-[170px]">
                                        {dashboardStats.summary.dominant_category}
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-sky-700">
                                    Total: {dashboardStats.summary.dominant_hours} Jam Pengamatan
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                                <CloudSun className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MONTHLY TREND CHART & MISS DATA LIST */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* CHART & TREND TABLE */}
                    <Card className="lg:col-span-8 border border-slate-200 shadow-md bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-slate-900 text-white p-4">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                <span>Distribusi Perawanan Tahun {tahun}</span>
                                <Badge className="bg-sky-400 text-slate-950 font-bold">12 Bulan</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 overflow-visible">
                            {/* Grouped Bar Chart */}
                            <div className="h-72 flex items-end justify-between gap-2 pt-16 pb-4 px-2 border-b border-slate-200 overflow-visible relative">
                                {dashboardStats.monthly_trend.map((item) => {
                                    const maxVal = 744; // 31 days * 24 hours
                                    const clearH = Math.max(item.clear > 0 ? 4 : 0, (item.clear / maxVal) * 100);
                                    const partlyH = Math.max(item.partly_cloudy > 0 ? 4 : 0, (item.partly_cloudy / maxVal) * 100);
                                    const cloudyH = Math.max(item.cloudy > 0 ? 4 : 0, (item.cloudy / maxVal) * 100);
                                    const totallyH = Math.max(item.totally_cloudy > 0 ? 4 : 0, (item.totally_cloudy / maxVal) * 100);

                                    return (
                                        <div key={item.month_num} className="flex-1 flex flex-col items-center gap-2 group relative">
                                            {/* FLOATING HOVER TOOLTIP CARD */}
                                            <div className="absolute -top-36 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-48 p-3 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/50 flex flex-col gap-1.5 text-xs">
                                                <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold text-sky-400">
                                                    <span>{item.month_name} {tahun}</span>
                                                    <span className="text-[10px] text-slate-400">{item.days_reported}/{item.target_days} Hari</span>
                                                </div>
                                                <div className="space-y-1 text-[11px]">
                                                    <div className="flex items-center justify-between text-amber-300">
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Cerah:</span>
                                                        <span className="font-bold">{item.clear} jam</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sky-300">
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Cerah Berawan:</span>
                                                        <span className="font-bold">{item.partly_cloudy} jam</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-blue-300">
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Berawan:</span>
                                                        <span className="font-bold">{item.cloudy} jam</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-slate-300">
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> Mendung:</span>
                                                        <span className="font-bold">{item.totally_cloudy} jam</span>
                                                    </div>
                                                </div>
                                                {/* Tooltip pointer arrow */}
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                            </div>

                                            <div className="w-full flex items-end justify-center gap-1 h-44 relative">
                                                {/* Clear bar */}
                                                <div
                                                    style={{ height: `${clearH}%` }}
                                                    className="w-2 bg-amber-400 rounded-t-sm transition-all group-hover:bg-amber-300 group-hover:shadow-[0_0_8px_rgba(251,191,36,0.8)] cursor-pointer"
                                                    title={`${item.month_name}: Cerah ${item.clear} jam`}
                                                />
                                                {/* Partly Cloudy bar */}
                                                <div
                                                    style={{ height: `${partlyH}%` }}
                                                    className="w-2 bg-sky-400 rounded-t-sm transition-all group-hover:bg-sky-300 group-hover:shadow-[0_0_8px_rgba(56,189,248,0.8)] cursor-pointer"
                                                    title={`${item.month_name}: Cerah Berawan ${item.partly_cloudy} jam`}
                                                />
                                                {/* Cloudy bar */}
                                                <div
                                                    style={{ height: `${cloudyH}%` }}
                                                    className="w-2 bg-blue-600 rounded-t-sm transition-all group-hover:bg-blue-400 group-hover:shadow-[0_0_8px_rgba(37,99,235,0.8)] cursor-pointer"
                                                    title={`${item.month_name}: Berawan ${item.cloudy} jam`}
                                                />
                                                {/* Totally Cloudy bar */}
                                                <div
                                                    style={{ height: `${totallyH}%` }}
                                                    className="w-2 bg-slate-700 rounded-t-sm transition-all group-hover:bg-slate-500 group-hover:shadow-[0_0_8px_rgba(100,116,139,0.8)] cursor-pointer"
                                                    title={`${item.month_name}: Mendung ${item.totally_cloudy} jam`}
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600 group-hover:text-sky-600 transition-colors">
                                                {item.month_name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Chart Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                                    <span>Cerah (N 0-2)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-sky-400" />
                                    <span>Cerah Berawan (N 3-4)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-blue-600" />
                                    <span>Berawan (N 5-7)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-slate-700" />
                                    <span>Sangat Berawan / Mendung (N 8)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* MISSING DAYS LIST */}
                    <Card className="lg:col-span-4 border border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                        <div>
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span>Status Data Harian</span>
                                    <Badge className={dashboardStats.missing_days.length === 0 ? "bg-emerald-400 text-slate-950 font-bold" : "bg-amber-400 text-slate-950 font-bold"}>
                                        {dashboardStats.missing_days.length === 0 ? 'Lengkap' : `${dashboardStats.missing_days.length} Belum`}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {dashboardStats.missing_days.length === 0 ? (
                                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                                        <p className="font-bold text-emerald-900 text-xs">Data Bulan Ini 100% Lengkap</p>
                                        <p className="text-[11px] text-emerald-700">
                                            Seluruh {daysInMonth} hari pengamatan perawanan periode {NAMA_BULAN[bulan - 1]} {tahun} telah tersimpan.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                                            <p className="font-bold flex items-center gap-1.5">
                                                <AlertCircle className="h-4 w-4 text-amber-600" /> Hari Belum Disinkronkan:
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {dashboardStats.missing_days.map((d) => (
                                                    <Badge key={d} variant="outline" className="bg-white border-amber-300 text-amber-900 font-mono font-bold text-[11px]">
                                                        Tgl {d}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                            <Button
                                onClick={handleSync}
                                disabled={isSyncing}
                                size="sm"
                                variant="outline"
                                className="w-full font-bold text-xs"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                Jalankan Sinkronisasi BMKGSoft
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* DATA TABLE SECTION */}
                <Card className="border border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <CloudSun className="h-5 w-5 text-sky-400" />
                                    <span>Tabel Data Pengamatan Perawanan Harian</span>
                                </CardTitle>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Periode {NAMA_BULAN[bulan - 1]} {tahun} &bull; Total {totalRecords} Hari
                                </p>
                            </div>

                            {/* TABLE CONTROLS / FILTERS */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-300 text-xs flex items-center gap-1">
                                        <ArrowDownUp className="h-3.5 w-3.5 text-sky-400" /> Urutan:
                                    </span>
                                    <Select
                                        value={sortOrder}
                                        onValueChange={(val) => handleFilterChange({ newSortOrder: val })}
                                    >
                                        <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-800 border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs">
                                            <SelectItem value="asc">Terlama</SelectItem>
                                            <SelectItem value="desc">Terbaru</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {recordsList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <Info className="h-10 w-10 text-slate-400 mb-3" />
                                <p className="font-bold text-slate-700 text-base">Tidak ada data Perawanan</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-md">
                                    Tidak ditemukan data pengamatan perawanan untuk periode {NAMA_BULAN[bulan - 1]} {tahun}. Silakan klik tombol Sinkronkan BMKGSoft.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-12 text-center text-xs font-bold text-slate-800">NO</TableHead>
                                            <TableHead className="w-48 text-left text-xs font-bold text-slate-800">TANGGAL LAPORAN</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-amber-700">CERAH (0-2)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-sky-700">CERAH BERAWAN (3-4)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-blue-700">BERAWAN (5-7)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-slate-800">MENDUNG (8)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-slate-800">TOTAL JAM</TableHead>
                                            <TableHead className="w-16 text-center text-xs font-bold text-slate-800">AKSI</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody className="divide-y divide-slate-100 text-xs">
                                        {recordsList.map((item, idx) => {
                                            const rowNum = (perawananRecords.current_page - 1) * perawananRecords.per_page + idx + 1;
                                            const dtDisplay = formatDateTimeDisplay(item.data_timestamp);

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <TableCell className="text-center font-bold text-slate-500 border-r border-slate-100">
                                                        {rowNum}
                                                    </TableCell>
                                                    <TableCell className="border-r border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{dtDisplay.topUtc}</span>
                                                            <span className="text-[11px] text-slate-500">{dtDisplay.bottomWit}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-amber-700 border-r border-slate-100">
                                                        {item.clear} jam
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-sky-700 border-r border-slate-100">
                                                        {item.partly_cloudy} jam
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-blue-700 border-r border-slate-100">
                                                        {item.cloudy} jam
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-slate-800 border-r border-slate-100">
                                                        {item.totally_cloudy} jam
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-slate-900 border-r border-slate-100">
                                                        <Badge variant="outline" className="bg-slate-100 font-bold border-slate-300">
                                                            {item.total_observation} j
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg"
                                                            onClick={() => setSelectedRecord(item)}
                                                            title="Lihat Detail Perawanan"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* DETAIL MODAL DIALOG */}
            {selectedRecord && (
                <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
                    <DialogContent className="max-w-md rounded-2xl bg-white border border-slate-200">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <CloudSun className="h-5 w-5 text-sky-600" />
                                Rincian Perawanan - {formatDateTimeDisplay(selectedRecord.data_timestamp).topUtc}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 pt-2 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                                <div className="flex justify-between text-slate-600">
                                    <span>Stasiun:</span>
                                    <strong className="text-slate-900">{selectedRecord.station_name}</strong>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Observer / Pengamat:</span>
                                    <strong className="text-slate-900">{selectedRecord.observer_name || '-'}</strong>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="font-bold text-slate-800 block text-xs">Kategori Jam Pengamatan:</span>
                                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
                                        <span className="text-amber-900 font-bold">Cerah (0-2):</span>
                                        <strong className="text-amber-900 text-sm">{selectedRecord.clear} j</strong>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex justify-between items-center">
                                        <span className="text-sky-900 font-bold">Cerah Berawan:</span>
                                        <strong className="text-sky-900 text-sm">{selectedRecord.partly_cloudy} j</strong>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                                        <span className="text-blue-900 font-bold">Berawan (5-7):</span>
                                        <strong className="text-blue-900 text-sm">{selectedRecord.cloudy} j</strong>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 flex justify-between items-center">
                                        <span className="text-slate-900 font-bold">Mendung (8):</span>
                                        <strong className="text-slate-900 text-sm">{selectedRecord.totally_cloudy} j</strong>
                                    </div>
                                </div>
                            </div>

                            {selectedRecord.notes && (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                    <span className="font-bold text-slate-700 block">Catatan:</span>
                                    <p className="text-slate-600">{selectedRecord.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

PerawananIndex.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>
);
