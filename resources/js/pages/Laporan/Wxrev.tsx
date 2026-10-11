import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Activity,
    AlertCircle,
    ArrowDownUp,
    Calendar,
    CheckCircle2,
    CloudRain,
    Copy,
    Droplets,
    Eye,
    FileSpreadsheet,
    Gauge,
    Info,
    RefreshCw,
    Search,
    Thermometer,
    User,
    Wind,
    XCircle,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/wxrev' },
    { title: 'Data WXREV', href: '/laporan/wxrev' },
];

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface PegawaiRef {
    id: number;
    nama: string;
}

interface WxrevRecord {
    id: number;
    station_id: number;
    station_name: string;
    data_timestamp: string;
    sandi?: string | null;
    mmyygp?: string | null;
    iiiii?: string | null;
    attxtxtntn?: string | null;
    appxpxpnpn?: string | null;
    auuxuxunun?: string | null;
    arrrrr?: string | null;
    rdrddfmfm1?: string | null;
    rdrddfmfm2?: string | null;
    jam_kirim?: string | null;
    pressure_indicator?: number | null;
    pressure_max?: number | null;
    pressure_min?: number | null;
    temperature_indicator?: number | null;
    temperature_max?: number | null;
    temperature_min?: number | null;
    relative_humidity_indicator?: number | null;
    relative_humidity_max?: number | null;
    relative_humidity_min?: number | null;
    rainfall_indicator?: number | null;
    rainfall_24?: number | null;
    number_of_observation?: number | null;
    dominant_wind_direction_1?: number | null;
    dominant_wind_direction_2?: number | null;
    dominant_wind_speed_1?: number | null;
    dominant_wind_speed_2?: number | null;
    number_of_dominant_wind_direction_1?: number | null;
    number_of_dominant_wind_direction_2?: number | null;
    observer_name?: string | null;
    pegawai?: PegawaiRef | null;
    teknisi?: PegawaiRef | null;
    ppnpn?: PegawaiRef | null;
}

interface MonthlyTrendItem {
    month_num: number;
    month_name: string;
    days_reported: number;
    target_days: number;
    completeness_pct: number;
    rainfall_total: number;
    rain_days: number;
    temp_max_avg: number | null;
    temp_min_avg: number | null;
}

interface DailyChartItem {
    day: number;
    date: string;
    has_data: boolean;
    temp_max: number | null;
    temp_min: number | null;
    pressure_max: number | null;
    pressure_min: number | null;
    rh_max: number | null;
    rh_min: number | null;
    rainfall: number;
    wind_speed: number | null;
}

interface DashboardStats {
    summary: {
        days_reported: number;
        target_days: number;
        completeness_pct: number;
        rainfall_total: number;
        rainfall_max_day: number | null;
        rainfall_max_val: number;
        rain_days_count: number;
        highest_temp_max: number | null;
        highest_temp_max_day: number | null;
        lowest_temp_min: number | null;
        lowest_temp_min_day: number | null;
        avg_temp_max: number | null;
        avg_temp_min: number | null;
        highest_pressure_max: number | null;
        lowest_pressure_min: number | null;
        avg_pressure: number | null;
        highest_rh_max: number | null;
        lowest_rh_min: number | null;
        avg_rh: number | null;
        max_wind_speed: number | null;
        avg_wind_speed: number | null;
        top_wind_dir: string | null;
    };
    missing_days: number[];
    daily_chart_data: DailyChartItem[];
    monthly_trend: MonthlyTrendItem[];
}

interface PageProps {
    wxrevRecords: {
        data: WxrevRecord[];
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
    search: string;
    dashboardStats: DashboardStats;
    flash?: { success?: string; error?: string; sync_result?: any };
    [key: string]: unknown;
}

export default function WxrevIndex() {
    const {
        wxrevRecords,
        bulan,
        tahun,
        daysInMonth,
        totalRecords,
        sortOrder,
        search,
        dashboardStats,
        flash,
    } = usePage<PageProps>().props;

    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<WxrevRecord | null>(null);
    const [copiedSandi, setCopiedSandi] = useState(false);
    const [searchTerm, setSearchTerm] = useState(search || '');

    const recordsList = wxrevRecords.data || [];

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        router.get('/laporan/wxrev', {
            bulan: newBulan,
            tahun: newTahun,
            sort: sortOrder,
            search: searchTerm,
        }, { preserveState: true });
    };

    const handleSortChange = () => {
        const nextSort = sortOrder === 'asc' ? 'desc' : 'asc';
        router.get('/laporan/wxrev', {
            bulan,
            tahun,
            sort: nextSort,
            search: searchTerm,
        }, { preserveState: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/laporan/wxrev', {
            bulan,
            tahun,
            sort: sortOrder,
            search: searchTerm,
        }, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/wxrev/sync', { bulan, tahun }, {
            onFinish: () => setIsSyncing(false),
            preserveScroll: true,
        });
    };

    const handleCopySandi = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSandi(true);
        setTimeout(() => setCopiedSandi(false), 2000);
    };

    return (
        <>
            <Head title={`Laporan Bulanan - Data WXREV (${NAMA_BULAN[bulan - 1]} ${tahun})`} />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* FLASH NOTIFICATIONS */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div className="text-sm font-medium">{flash.success}</div>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 shadow-sm">
                        <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <div className="text-sm font-medium">{flash.error}</div>
                    </div>
                )}

                {/* HEADER & CONTROLS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {/* <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 tracking-wide uppercase">
                                Observasi Sandi
                            </span> */}
                            {/* <span className="text-xs text-slate-500 font-medium">Stamet Oesman Sadik (138)</span> */}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                            <Activity className="h-7 w-7 text-indigo-600" />
                            Laporan Bulanan WXREV
                        </h1>
                        {/* <p className="text-sm text-slate-500 mt-1">
                            Kumpulan Berita WXREV &bull; Periode: <span className="font-semibold text-slate-700">{NAMA_BULAN[bulan - 1]} {tahun}</span>
                        </p> */}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Selector */}
                        <Select
                            value={String(bulan)}
                            onValueChange={(val) => handleMonthYearChange(Number(val), tahun)}
                        >
                            <SelectTrigger className="w-[140px] bg-white border-slate-200">
                                <Calendar className="h-4 w-4 mr-2 text-slate-500" />
                                <SelectValue placeholder="Pilih Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                {NAMA_BULAN.map((nama, idx) => (
                                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                                        {nama}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Year Selector */}
                        <Select
                            value={String(tahun)}
                            onValueChange={(val) => handleMonthYearChange(bulan, Number(val))}
                        >
                            <SelectTrigger className="w-[110px] bg-white border-slate-200">
                                <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {[2024, 2025, 2026, 2027].map((yr) => (
                                    <SelectItem key={yr} value={String(yr)}>
                                        {yr}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Sync Button */}
                        <Button
                            variant="default"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkron BMKG'}
                        </Button>

                        {/* Export Excel Button */}
                        <a
                            href={`/laporan/wxrev/export-excel?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button
                                variant="outline"
                                className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold shadow-sm"
                            >
                                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                                Export Lapbul WXREV (.xlsx)
                            </Button>
                        </a>
                    </div>
                </div>

                {/* KPI SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Card 1: Kelengkapan */}
                    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white hover:border-indigo-300 transition-all">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelengkapan Data</span>
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                                <Activity className="h-4 w-4" />
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-2xl font-black text-slate-900">
                                {dashboardStats.summary.days_reported} / {daysInMonth}
                                <span className="text-xs font-normal text-slate-500 ml-1">Hari</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between text-xs">
                                <Badge className={dashboardStats.summary.completeness_pct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                    {dashboardStats.summary.completeness_pct}% Lengkap
                                </Badge>
                                <span className="text-slate-400">Target: {daysInMonth}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, dashboardStats.summary.completeness_pct)}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Suhu Ekstrem */}
                    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white hover:border-amber-300 transition-all">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suhu Udara Ekstrem</span>
                            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                                <Thermometer className="h-4 w-4" />
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-xl font-black text-slate-900">
                                {dashboardStats.summary.highest_temp_max ?? '-'}° / {dashboardStats.summary.lowest_temp_min ?? '-'}°C
                            </div>
                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <div className="flex justify-between">
                                    <span className="text-rose-600 font-medium">Max (Tgl {dashboardStats.summary.highest_temp_max_day ?? '-'}):</span>
                                    <span className="font-bold">{dashboardStats.summary.highest_temp_max ?? '-'} °C</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sky-600 font-medium">Min (Tgl {dashboardStats.summary.lowest_temp_min_day ?? '-'}):</span>
                                    <span className="font-bold">{dashboardStats.summary.lowest_temp_min ?? '-'} °C</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Tekanan Permukaan */}
                    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white hover:border-blue-300 transition-all">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tekanan Udara</span>
                            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                <Gauge className="h-4 w-4" />
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-xl font-black text-slate-900">
                                {dashboardStats.summary.avg_pressure ?? '-'}
                                <span className="text-xs font-normal text-slate-500 ml-1">hPa</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <div className="flex justify-between">
                                    <span>Tertinggi:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.highest_pressure_max ?? '-'} hPa</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Terendah:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.lowest_pressure_min ?? '-'} hPa</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: Kelembapan Relatif */}
                    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white hover:border-teal-300 transition-all">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kelembapan Relatif</span>
                            <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
                                <Droplets className="h-4 w-4" />
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-xl font-black text-slate-900">
                                {dashboardStats.summary.avg_rh ?? '-'}
                                <span className="text-xs font-normal text-slate-500 ml-1">% (Rerata)</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <div className="flex justify-between">
                                    <span>Max RH:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.highest_rh_max ?? '-'}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Min RH:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.lowest_rh_min ?? '-'}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 5: Curah Hujan */}
                    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white hover:border-cyan-300 transition-all">
                        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Curah Hujan 24 Jam</span>
                            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                                <CloudRain className="h-4 w-4" />
                            </span>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="text-xl font-black text-slate-900">
                                {dashboardStats.summary.rainfall_total}
                                <span className="text-xs font-normal text-slate-500 ml-1">mm</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                <div className="flex justify-between">
                                    <span>Hari Hujan:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.rain_days_count} Hari</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Max Harian:</span>
                                    <span className="font-bold text-slate-700">{dashboardStats.summary.rainfall_max_val} mm</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MISSING DAYS ALERT BANNER */}
                {dashboardStats.missing_days && dashboardStats.missing_days.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900">
                                    Perhatian: Ada {dashboardStats.missing_days.length} Tanggal Belum Memiliki Data WXREV
                                </h4>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Tanggal belum terlapor:{' '}
                                    <span className="font-mono font-bold">
                                        {dashboardStats.missing_days.map((d) => `Tgl ${d}`).join(', ')}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="border-amber-300 text-amber-800 hover:bg-amber-100 self-start md:self-auto shrink-0"
                        >
                            Sinkronkan Sekarang
                        </Button>
                    </div>
                )}

                {/* VISUAL CHARTS SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* CHART 1: Fluktuasi Harian Bulan Terpilih (8 cols) */}
                    <Card className="lg:col-span-8 border border-slate-200 shadow-md bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-slate-900 text-white p-4">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-400" />
                                    Tren Parameter Cuaca Harian ({NAMA_BULAN[bulan - 1]} {tahun})
                                </span>
                                <Badge className="bg-indigo-500 text-white font-bold">{daysInMonth} Hari</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Daily Bar & Points Visualization */}
                            <div className="h-72 flex items-end justify-between gap-1.5 pt-12 pb-4 px-2 border-b border-slate-200 relative overflow-visible">
                                {(() => {
                                    const maxRain = Math.max(10, ...dashboardStats.daily_chart_data.map((d) => d.rainfall || 0));
                                    const maxTemp = 40;

                                    return dashboardStats.daily_chart_data.map((item) => {
                                        const rainH = Math.min(100, Math.max(item.rainfall > 0 ? 5 : 0, (item.rainfall / maxRain) * 100));
                                        const tempH = item.temp_max ? Math.min(100, Math.max(10, ((item.temp_max - 20) / (maxTemp - 20)) * 100)) : 0;

                                        return (
                                            <div key={item.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                                {/* Tooltip Card */}
                                                <div className="absolute -top-32 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-48 p-2.5 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 flex flex-col gap-1 text-xs">
                                                    <div className="font-bold border-b border-slate-700 pb-1 text-indigo-400 flex justify-between">
                                                        <span>Tgl {item.day} {NAMA_BULAN[bulan - 1]}</span>
                                                        <span>{item.has_data ? '✓ Ada' : '✗ Kosong'}</span>
                                                    </div>
                                                    {item.has_data ? (
                                                        <div className="text-[11px] space-y-0.5">
                                                            <div className="text-amber-300">Tmax: {item.temp_max ?? '-'}°C | Tmin: {item.temp_min ?? '-'}°C</div>
                                                            <div className="text-cyan-300">Hujan 24j: {item.rainfall ?? 0} mm</div>
                                                            <div className="text-blue-300">Pmax: {item.pressure_max ?? '-'} hPa</div>
                                                            <div className="text-teal-300">RHmax: {item.rh_max ?? '-'}%</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">Tidak ada data WXREV</span>
                                                    )}
                                                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700" />
                                                </div>

                                                {/* Visual Heights */}
                                                <div className="w-full flex items-end justify-center gap-0.5 h-44 relative">
                                                    {item.has_data ? (
                                                        <>
                                                            {/* Temperature Bar */}
                                                            <div
                                                                style={{ height: `${tempH}%` }}
                                                                className="w-2.5 bg-amber-500 rounded-t-sm transition-all group-hover:bg-amber-400 shadow-sm"
                                                                title={`Tgl ${item.day}: Tmax ${item.temp_max}°C`}
                                                            />
                                                            {/* Rainfall Bar */}
                                                            <div
                                                                style={{ height: `${rainH}%` }}
                                                                className="w-2.5 bg-cyan-500 rounded-t-sm transition-all group-hover:bg-cyan-400 shadow-sm"
                                                                title={`Tgl ${item.day}: Hujan ${item.rainfall} mm`}
                                                            />
                                                        </>
                                                    ) : (
                                                        <div className="w-1.5 h-3 bg-slate-200 rounded-sm" />
                                                    )}
                                                </div>

                                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600">
                                                    {item.day}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                                    <span>Suhu Maksimum (°C)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-cyan-500" />
                                    <span>Curah Hujan 24 Jam (mm)</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                                    <span>Data Kosong</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CHART 2: Rekap 12 Bulan Sepanjang Tahun (4 cols) */}
                    <Card className="lg:col-span-4 border border-slate-200 shadow-md bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-slate-900 text-white p-4">
                            <CardTitle className="text-base font-bold flex items-center justify-between">
                                <span>Distribusi WXREV Tahun {tahun}</span>
                                <Badge className="bg-indigo-400 text-slate-950 font-bold">12 Bulan</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                                {dashboardStats.monthly_trend.map((m) => (
                                    <div
                                        key={m.month_num}
                                        onClick={() => handleMonthYearChange(m.month_num, tahun)}
                                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${m.month_num === bulan
                                            ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                                            : 'bg-slate-50/50 border-slate-200/70 hover:bg-slate-100/60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-extrabold ${m.month_num === bulan ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                {m.month_name}
                                            </span>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800">
                                                    {m.days_reported} / {m.target_days} Hari
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Hujan: {m.rainfall_total} mm ({m.rain_days} hr)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge className={m.completeness_pct === 100 ? 'bg-emerald-100 text-emerald-800 text-[10px]' : m.completeness_pct > 0 ? 'bg-amber-100 text-amber-800 text-[10px]' : 'bg-slate-100 text-slate-600 text-[10px]'}>
                                                {m.completeness_pct}%
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* MAIN TABLE SECTION */}
                <Card className="border border-slate-200/80 shadow-md bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                                Kumpulan Berita Sandi WXREV ({NAMA_BULAN[bulan - 1]} {tahun})
                            </CardTitle>
                            {/* <p className="text-xs text-slate-500 mt-1">
                                Format tabel disesuaikan dengan template resmi <span className="font-mono font-medium">template_lapbul_wxrev.xlsx</span>
                            </p> */}
                        </div>

                        {/* Search Bar & Sort */}
                        <div className="flex items-center gap-2.5">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Cari Sandi / MMYYGP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[220px] h-9 text-xs bg-slate-50 border-slate-200"
                                />
                            </form>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSortChange}
                                className="h-9 px-3 text-xs font-semibold border-slate-200"
                                title="Ubah urutan tanggal"
                            >
                                <ArrowDownUp className="h-3.5 w-3.5 mr-1 text-slate-500" />
                                {sortOrder === 'asc' ? 'Tgl 1 → 31' : 'Tgl 31 → 1'}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table className="w-full text-xs">
                                <TableHeader className="bg-slate-900 text-white hover:bg-slate-900">
                                    <TableRow className="border-b border-slate-800">
                                        <TableHead className="w-12 text-center text-white font-bold">NO</TableHead>
                                        <TableHead className="w-24 text-white font-bold">MMYYGP</TableHead>
                                        <TableHead className="w-24 text-white font-bold">aTTxTxTnTn</TableHead>
                                        <TableHead className="w-24 text-white font-bold">aPPxPxPnPn</TableHead>
                                        <TableHead className="w-24 text-white font-bold">aUUxUxUnUn</TableHead>
                                        <TableHead className="w-20 text-white font-bold">aRRRRR</TableHead>
                                        <TableHead className="w-24 text-white font-bold">rDrDDfmfm</TableHead>
                                        <TableHead className="w-28 text-white font-bold">Jam Kirim</TableHead>
                                        <TableHead className="text-white font-bold">Parameter Riil</TableHead>
                                        <TableHead className="w-36 text-white font-bold">Observer</TableHead>
                                        <TableHead className="w-16 text-center text-white font-bold">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recordsList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="h-44 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                                                    <Activity className="h-8 w-8 text-slate-300" />
                                                    <span className="font-semibold text-sm">Belum Ada Data WXREV</span>
                                                    <p className="text-xs text-slate-500">
                                                        Klik tombol "Sinkron BMKG" untuk mengambil data dari server BMKGSoft.
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSync}
                                                        disabled={isSyncing}
                                                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                                    >
                                                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                                        Ambil Data Bulan Ini
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recordsList.map((rec) => {
                                            const day = new Date(rec.data_timestamp).getUTCDate();

                                            return (
                                                <TableRow
                                                    key={rec.id}
                                                    className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                                                >
                                                    {/* Day */}
                                                    <TableCell className="text-center font-bold text-slate-700">
                                                        {day}
                                                    </TableCell>

                                                    {/* MMYYGP */}
                                                    <TableCell className="font-mono font-bold text-indigo-700">
                                                        {rec.mmyygp ?? '-'}
                                                    </TableCell>

                                                    {/* aTTxTxTnTn */}
                                                    <TableCell className="font-mono font-semibold text-amber-700">
                                                        {rec.attxtxtntn ?? '-'}
                                                    </TableCell>

                                                    {/* aPPxPxPnPn */}
                                                    <TableCell className="font-mono font-semibold text-blue-700">
                                                        {rec.appxpxpnpn ?? '-'}
                                                    </TableCell>

                                                    {/* aUUxUxUnUn */}
                                                    <TableCell className="font-mono font-semibold text-teal-700">
                                                        {rec.auuxuxunun ?? '-'}
                                                    </TableCell>

                                                    {/* aRRRRR */}
                                                    <TableCell className="font-mono font-semibold text-cyan-700">
                                                        {rec.arrrrr ?? '-'}
                                                    </TableCell>

                                                    {/* rDrDDfmfm */}
                                                    <TableCell className="font-mono font-semibold text-purple-700">
                                                        {rec.rdrddfmfm1 ?? '-'}
                                                    </TableCell>

                                                    {/* Jam Kirim */}
                                                    <TableCell className="font-mono text-slate-600 text-[11px]">
                                                        {rec.jam_kirim ?? '00,00Z VST'}
                                                    </TableCell>

                                                    {/* Decoded Parameters Mini Badges */}
                                                    <TableCell>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                            {rec.temperature_max !== null && (
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                                    T: {rec.temperature_max}° / {rec.temperature_min ?? '-'}°
                                                                </span>
                                                            )}
                                                            {rec.pressure_max !== null && (
                                                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                                    P: {rec.pressure_max} hPa
                                                                </span>
                                                            )}
                                                            {rec.relative_humidity_max !== null && (
                                                                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                                                    RH: {rec.relative_humidity_max}% / {rec.relative_humidity_min ?? '-'}%
                                                                </span>
                                                            )}
                                                            {rec.rainfall_24 !== null && (
                                                                <span className={`px-1.5 py-0.5 rounded border ${rec.rainfall_24 > 0 && rec.rainfall_24 != 8888 && rec.rainfall_24 != 9999
                                                                    ? 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold'
                                                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                                                    }`}>
                                                                    RR: {rec.rainfall_24 == 8888 ? 'TT' : rec.rainfall_24 == 9999 ? '-' : `${rec.rainfall_24} mm`}
                                                                </span>
                                                            )}
                                                            {rec.dominant_wind_speed_1 !== null && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                                    WS: {rec.dominant_wind_speed_1} kt
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Observer */}
                                                    <TableCell>
                                                        <div className="text-slate-700 font-medium truncate max-w-[130px]">
                                                            {rec.observer_name || rec.pegawai?.nama || '-'}
                                                        </div>
                                                    </TableCell>

                                                    {/* Detail Modal Action */}
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => setSelectedRecord(rec)}
                                                            className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                                            title="Lihat Detail Sandi"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        {wxrevRecords.total > 0 && (
                            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                                <div>
                                    Menampilkan {wxrevRecords.data.length} dari {wxrevRecords.total} data WXREV
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {wxrevRecords.links.map((link, idx) => (
                                        <button
                                            key={idx}
                                            disabled={!link.url || link.active}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${link.active
                                                ? 'bg-indigo-600 text-white'
                                                : link.url
                                                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    : 'text-slate-300 cursor-not-allowed'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* MODAL DETAIL RECORD */}
                <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
                    <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-indigo-600" />
                                    Detail Berita Sandi WXREV
                                </span>
                                {selectedRecord && (
                                    <Badge className="bg-indigo-100 text-indigo-800">
                                        {new Date(selectedRecord.data_timestamp).toISOString().split('T')[0]}
                                    </Badge>
                                )}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedRecord && (
                            <div className="space-y-5 pt-2">
                                {/* Raw Telegram Sandi */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Raw Sandi WXREV
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleCopySandi(selectedRecord.sandi || '')}
                                            className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                                        >
                                            <Copy className="h-3.5 w-3.5 mr-1" />
                                            {copiedSandi ? 'Tersalin!' : 'Salin Sandi'}
                                        </Button>
                                    </div>
                                    <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner">
                                        {selectedRecord.sandi || 'Tidak ada sandi raw'}
                                    </pre>
                                </div>

                                {/* Sandi Group Blocks */}
                                <div>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                        Kelompok Kode Sandi
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">MMYYGP</div>
                                            <div className="font-mono font-bold text-sm text-indigo-700">{selectedRecord.mmyygp ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">aTTxTxTnTn</div>
                                            <div className="font-mono font-bold text-sm text-amber-700">{selectedRecord.attxtxtntn ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">aPPxPxPnPn</div>
                                            <div className="font-mono font-bold text-sm text-blue-700">{selectedRecord.appxpxpnpn ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">aUUxUxUnUn</div>
                                            <div className="font-mono font-bold text-sm text-teal-700">{selectedRecord.auuxuxunun ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">aRRRRR</div>
                                            <div className="font-mono font-bold text-sm text-cyan-700">{selectedRecord.arrrrr ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">rDrDDfmfm (1)</div>
                                            <div className="font-mono font-bold text-sm text-purple-700">{selectedRecord.rdrddfmfm1 ?? '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">rDrDDfmfm (2)</div>
                                            <div className="font-mono font-bold text-sm text-slate-600">{selectedRecord.rdrddfmfm2 || '-'}</div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-[10px] text-slate-500 font-bold">Jam Kirim</div>
                                            <div className="font-mono font-bold text-sm text-slate-700">{selectedRecord.jam_kirim ?? '00,00Z VST'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Decoded Parameters Details */}
                                <div>
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                        Hasil Decode Parameter Cuaca
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                                            <div className="text-amber-800 font-semibold mb-1">Suhu Udara</div>
                                            <div>Max: <span className="font-bold">{selectedRecord.temperature_max ?? '-'} °C</span></div>
                                            <div>Min: <span className="font-bold">{selectedRecord.temperature_min ?? '-'} °C</span></div>
                                            <div className="text-[10px] text-amber-700 mt-0.5">Indikator: {selectedRecord.temperature_indicator ?? '-'}</div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80">
                                            <div className="text-blue-800 font-semibold mb-1">Tekanan Udara</div>
                                            <div>Max: <span className="font-bold">{selectedRecord.pressure_max ?? '-'} hPa</span></div>
                                            <div>Min: <span className="font-bold">{selectedRecord.pressure_min ?? '-'} hPa</span></div>
                                            <div className="text-[10px] text-blue-700 mt-0.5">Indikator: {selectedRecord.pressure_indicator ?? '-'}</div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80">
                                            <div className="text-teal-800 font-semibold mb-1">Kelembapan Relatif</div>
                                            <div>Max: <span className="font-bold">{selectedRecord.relative_humidity_max ?? '-'} %</span></div>
                                            <div>Min: <span className="font-bold">{selectedRecord.relative_humidity_min ?? '-'} %</span></div>
                                            <div className="text-[10px] text-teal-700 mt-0.5">Indikator: {selectedRecord.relative_humidity_indicator ?? '-'}</div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/80">
                                            <div className="text-cyan-800 font-semibold mb-1">Curah Hujan</div>
                                            <div>24 Jam: <span className="font-bold">{selectedRecord.rainfall_24 == 8888 ? 'TT (Trace)' : selectedRecord.rainfall_24 == 9999 ? '-' : `${selectedRecord.rainfall_24 ?? 0} mm`}</span></div>
                                            <div className="text-[10px] text-cyan-700 mt-0.5">Indikator: {selectedRecord.rainfall_indicator ?? '-'}</div>
                                            <div className="text-[10px] text-cyan-700">Pengamatan: {selectedRecord.number_of_observation ?? 24}x</div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80">
                                            <div className="text-purple-800 font-semibold mb-1">Angin Dominan</div>
                                            <div>Arah: <span className="font-bold">{selectedRecord.dominant_wind_direction_1 ?? '-'}</span></div>
                                            <div>Kecepatan: <span className="font-bold">{selectedRecord.dominant_wind_speed_1 ?? '-'} knot</span></div>
                                        </div>

                                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                            <div className="text-slate-800 font-semibold mb-1">Petugas / Observer</div>
                                            <div className="truncate font-bold text-slate-700">
                                                {selectedRecord.observer_name || selectedRecord.pegawai?.nama || 'Unassigned'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1">
                                                Stasiun: {selectedRecord.station_name}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

WxrevIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/wxrev' },
            { title: 'Data WXREV', href: '/laporan/wxrev' },
        ]}
    >
        {page}
    </AppLayout>
);
