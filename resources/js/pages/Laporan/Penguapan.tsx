import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, ArrowDownUp, Calendar, CheckCircle2, CloudRain, Droplets, Eye, FileSpreadsheet, Info, RefreshCw, Sun, Users, Wind } from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/penguapan' },
    { title: 'Data Penguapan', href: '/laporan/penguapan' },
];

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

interface PenguapanRecord {
    id: number;
    station_id: number;
    station_name: string;
    data_timestamp: string;
    op_diff_baca?: number | null;
    t_air_max?: number | null;
    t_air_min?: number | null;
    t_air_avg?: number | null;
    rr_0700?: number | null;
    op_eva?: number | null;
    ws_avg_0c5?: number | null;
    observer_name?: string | null;
    pegawai?: { id: number; nama: string } | null;
}

interface MonthlyTrendItem {
    month_num: number;
    month_name: string;
    total_evaporation: number;
    total_rainfall: number;
    avg_ws_0c5: number;
    days_reported: number;
    target_days: number;
}

interface DashboardStats {
    summary: {
        days_reported: number;
        target_days: number;
        completeness_pct: number;
        total_evaporation: number;
        avg_evaporation_daily: number;
        total_rainfall_0700: number;
        avg_ws_0c5: number;
        max_evaporation_day: number | null;
        max_evaporation_val: number;
    };
    missing_days: number[];
    monthly_trend: MonthlyTrendItem[];
}

interface PageProps {
    penguapanRecords: {
        data: PenguapanRecord[];
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
    availableObservers: string[];
    observerFilter: string;
    dashboardStats: DashboardStats;
    flash?: { success?: string; error?: string; sync_result?: any };
    [key: string]: unknown;
}

export default function PenguapanIndex() {
    const { penguapanRecords, bulan, tahun, daysInMonth, totalRecords, sortOrder, availableObservers, observerFilter, dashboardStats, flash } = usePage<PageProps>().props;

    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PenguapanRecord | null>(null);

    const recordsList = penguapanRecords.data || [];

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        router.get('/laporan/penguapan', {
            bulan: newBulan,
            tahun: newTahun,
            sort: sortOrder,
            observer: observerFilter,
        }, { preserveState: true });
    };

    const handleFilterChange = (updates: { newSortOrder?: string; newObserver?: string }) => {
        router.get('/laporan/penguapan', {
            bulan,
            tahun,
            sort: updates.newSortOrder ?? sortOrder,
            observer: updates.newObserver ?? observerFilter,
        }, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/penguapan/sync', { bulan, tahun }, {
            onFinish: () => setIsSyncing(false),
            preserveScroll: true,
        });
    };

    const handleExportExcel = () => {
        window.location.href = `/laporan/penguapan/export-excel?bulan=${bulan}&tahun=${tahun}`;
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

        return { topUtc, bottomWit };
    };

    return (
        <>
            <Head title={`Laporan Penguapan - ${NAMA_BULAN[bulan - 1]} ${tahun}`} />

            <div className="space-y-6 pb-12">
                {/* HERO HEADER BANNER */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-blue-950 p-6 md:p-8 text-white shadow-2xl border border-teal-800/40">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold backdrop-blur-md">
                                <Droplets className="h-3.5 w-3.5 text-teal-400" />
                                <span>Pengamatan Penguapan (Open Pan Evaporation)</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                                Laporan Bulanan Penguapan
                            </h1>
                            <p className="text-slate-300 text-xs md:text-sm max-w-xl">
                                Stasiun Meteorologi Oesman Sadik Halmahera Selatan
                            </p>
                        </div>

                        {/* CONTROLS */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-inner">
                                <Calendar className="h-4 w-4 text-teal-400 ml-2" />
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
                                onClick={handleExportExcel}
                                className="h-10 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Excel Laporan
                            </Button>

                            <Button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="h-10 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-teal-500/20 transition-all flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
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
                                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                                    <span>Kelengkapan: {dashboardStats.summary.completeness_pct}%</span>
                                </div>
                            </div>
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                                <Calendar className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Total Penguapan Bulanan */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Penguapan</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-teal-700">
                                        {dashboardStats.summary.total_evaporation}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">mm</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Rata-rata: {dashboardStats.summary.avg_evaporation_daily} mm/hari
                                </p>
                            </div>
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                                <Droplets className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Total Curah Hujan 07.00 */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curah Hujan (07.00)</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-sky-700">
                                        {dashboardStats.summary.total_rainfall_0700}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">mm</span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Maks Harian: {dashboardStats.summary.max_evaporation_val} mm (Tgl {dashboardStats.summary.max_evaporation_day ?? '-'})
                                </p>
                            </div>
                            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                                <CloudRain className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Rata-rata WS 0.5m */}
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kecepatan Angin 0.5m</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-indigo-700">
                                        {dashboardStats.summary.avg_ws_0c5}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">m/s</span>
                                </div>
                                <p className="text-[11px] font-bold text-indigo-700">
                                    Anemometer 0.5m Pan Penguapan
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                                <Wind className="h-6 w-6" />
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
                                <span>Distribusi Penguapan &amp; Curah Hujan Tahun {tahun}</span>
                                <Badge className="bg-teal-400 text-slate-950 font-bold">12 Bulan</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 overflow-visible">
                            {/* Bar Chart */}
                            <div className="h-72 flex items-end justify-between gap-2 pt-16 pb-4 px-2 border-b border-slate-200 overflow-visible relative">
                                {(() => {
                                    const maxVal = Math.max(
                                        50,
                                        ...dashboardStats.monthly_trend.map((item) =>
                                            Math.max(Number(item.total_evaporation) || 0, Number(item.total_rainfall) || 0)
                                        )
                                    );

                                    return dashboardStats.monthly_trend.map((item) => {
                                        const evaVal = Number(item.total_evaporation) || 0;
                                        const rainVal = Number(item.total_rainfall) || 0;
                                        const evaH = Math.min(100, Math.max(evaVal > 0 ? 3 : 0, (evaVal / maxVal) * 100));
                                        const rainH = Math.min(100, Math.max(rainVal > 0 ? 3 : 0, (rainVal / maxVal) * 100));

                                        return (
                                            <div key={item.month_num} className="flex-1 flex flex-col items-center gap-2 group relative">
                                                {/* FLOATING HOVER TOOLTIP CARD */}
                                                <div className="absolute -top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-48 p-3 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/50 flex flex-col gap-1.5 text-xs">
                                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold text-teal-400">
                                                        <span>{item.month_name} {tahun}</span>
                                                        <span className="text-[10px] text-slate-400">{item.days_reported}/{item.target_days} Hari</span>
                                                    </div>
                                                    <div className="space-y-1 text-[11px]">
                                                        <div className="flex items-center justify-between text-teal-300">
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Penguapan:</span>
                                                            <span className="font-bold">{evaVal} mm</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sky-300">
                                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> Curah Hujan:</span>
                                                            <span className="font-bold">{rainVal} mm</span>
                                                        </div>
                                                    </div>
                                                    {/* Tooltip pointer arrow */}
                                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                                </div>

                                                <div className="w-full flex items-end justify-center gap-1.5 h-44 relative">
                                                    {/* Evaporation Bar */}
                                                    <div
                                                        style={{ height: `${evaH}%` }}
                                                        className="w-3.5 bg-teal-500 rounded-t-sm transition-all group-hover:bg-teal-400 group-hover:shadow-[0_0_10px_rgba(20,184,166,0.8)] cursor-pointer shadow-sm"
                                                        title={`${item.month_name}: Penguapan ${evaVal} mm`}
                                                    />
                                                    {/* Rainfall Bar */}
                                                    <div
                                                        style={{ height: `${rainH}%` }}
                                                        className="w-3.5 bg-sky-400 rounded-t-sm transition-all group-hover:bg-sky-300 group-hover:shadow-[0_0_10px_rgba(56,189,248,0.8)] cursor-pointer shadow-sm"
                                                        title={`${item.month_name}: Curah Hujan ${rainVal} mm`}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-600 group-hover:text-teal-600 transition-colors">
                                                    {item.month_name}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Chart Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-teal-500" />
                                    <span>Total Penguapan (mm)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-sky-400" />
                                    <span>Curah Hujan 07.00 (mm)</span>
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
                                            Seluruh {daysInMonth} hari pengamatan penguapan periode {NAMA_BULAN[bulan - 1]} {tahun} telah tersimpan.
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
                                    <Droplets className="h-5 w-5 text-teal-400" />
                                    <span>Tabel Data Pengamatan Penguapan Harian</span>
                                </CardTitle>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Periode {NAMA_BULAN[bulan - 1]} {tahun} &bull; Total {totalRecords} Hari
                                </p>
                            </div>

                            {/* TABLE CONTROLS / FILTERS */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-300 text-xs flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-teal-400" /> Observer:
                                    </span>
                                    <Select
                                        value={observerFilter}
                                        onValueChange={(val) => handleFilterChange({ newObserver: val })}
                                    >
                                        <SelectTrigger className="w-[140px] h-8 text-xs bg-slate-800 border-slate-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs">
                                            <SelectItem value="ALL">Semua Observer</SelectItem>
                                            {availableObservers.map((obs) => (
                                                <SelectItem key={obs} value={obs}>
                                                    {obs}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-300 text-xs flex items-center gap-1">
                                        <ArrowDownUp className="h-3.5 w-3.5 text-teal-400" /> Urutan:
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
                                <p className="font-bold text-slate-700 text-base">Tidak ada data Penguapan</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-md">
                                    Tidak ditemukan data pengamatan penguapan untuk periode {NAMA_BULAN[bulan - 1]} {tahun}. Silakan klik tombol Sinkronkan BMKGSoft.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-12 text-center text-xs font-bold text-slate-800">NO</TableHead>
                                            <TableHead className="w-48 text-left text-xs font-bold text-slate-800">TANGGAL LAPORAN</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-teal-700">BEDA BACA (mm)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-emerald-700">PENGUAPAN (mm)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-sky-700">CURAH HUJAN (mm)</TableHead>
                                            <TableHead className="text-center text-xs font-bold text-indigo-700">WS 0.5m (m/s)</TableHead>
                                            <TableHead className="w-56 text-left text-xs font-bold text-slate-800">OBSERVER</TableHead>
                                            <TableHead className="w-16 text-center text-xs font-bold text-slate-800">AKSI</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody className="divide-y divide-slate-100 text-xs">
                                        {recordsList.map((item, idx) => {
                                            const rowNum = (penguapanRecords.current_page - 1) * penguapanRecords.per_page + idx + 1;
                                            const observerDisplay = item.pegawai?.nama || item.observer_name || 'Unassigned';
                                            const dtDisplay = formatDateTimeDisplay(item.data_timestamp);
                                            const renderVal = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v === 8888 ? 0 : v);

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
                                                    <TableCell className="text-center font-mono font-bold text-teal-700 border-r border-slate-100">
                                                        {renderVal(item.op_diff_baca)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-emerald-700 border-r border-slate-100">
                                                        {renderVal(item.op_eva)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-sky-700 border-r border-slate-100">
                                                        {renderVal(item.rr_0700)}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-indigo-700 border-r border-slate-100">
                                                        {renderVal(item.ws_avg_0c5)}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-slate-900 border-r border-slate-100">
                                                        {observerDisplay}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg"
                                                            onClick={() => setSelectedRecord(item)}
                                                            title="Lihat Detail Penguapan"
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
                                <Droplets className="h-5 w-5 text-teal-600" />
                                Rincian Penguapan - {formatDateTimeDisplay(selectedRecord.data_timestamp).topUtc}
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

                            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 flex justify-between items-center">
                                    <span className="text-teal-900 font-bold">Beda Baca:</span>
                                    <strong className="text-teal-900 text-sm">{selectedRecord.op_diff_baca ?? '-'} mm</strong>
                                </div>
                                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                                    <span className="text-emerald-900 font-bold">Penguapan:</span>
                                    <strong className="text-emerald-900 text-sm">{selectedRecord.op_eva ?? '-'} mm</strong>
                                </div>
                                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 flex justify-between items-center">
                                    <span className="text-sky-900 font-bold">Curah Hujan 07:</span>
                                    <strong className="text-sky-900 text-sm">{selectedRecord.rr_0700 ?? '-'} mm</strong>
                                </div>
                                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex justify-between items-center">
                                    <span className="text-indigo-900 font-bold">WS 0.5m:</span>
                                    <strong className="text-indigo-900 text-sm">{selectedRecord.ws_avg_0c5 ?? '-'} m/s</strong>
                                </div>
                            </div>

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

PenguapanIndex.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>{page}</AppLayout>
);
