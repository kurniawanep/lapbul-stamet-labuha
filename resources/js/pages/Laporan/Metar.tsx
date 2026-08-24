import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    ArrowDownUp,
    BarChart3,
    Calendar,
    CheckCircle2,
    Clock,
    Compass,
    Eye,
    Filter,
    Gauge,
    Info,
    Radio,
    RefreshCw,
    Sparkles,
    UserCheck,
    XCircle,
} from 'lucide-react';

interface Pegawai {
    id: number;
    nama: string;
}

interface DataMetarItem {
    id: number;
    bmkgsoft_entry_id: number | null;
    station_id: number;
    station_wmo_id: string | null;
    station_name: string;
    cccc: string | null;
    ttaaii: string | null;
    type_message: string | null;
    bbb: string | null;
    data_timestamp: string;
    received_timestamp: string | null;
    sent_timestamp: string | null;
    sandi: string | null;
    status: string | null;
    sender_username: string | null;
    observer_name: string | null;
    pegawai_id: number | null;
    pegawai?: Pegawai | null;
    monitoring_status?: string;
    delay_minutes?: number;
    sent_timestamp_display?: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface SyncDetailItem {
    timestamp: string;
    observer?: string;
    status: 'berhasil' | 'gagal';
    reason?: string | null;
}

interface SyncResultPayload {
    success: boolean;
    synced_count: number;
    failed_count: number;
    total_fetched: number;
    message: string;
    error_reason?: string | null;
    details?: SyncDetailItem[];
}

interface SummaryRow {
    jenis: string;
    target: number;
    target_pct: number;
    timely: number;
    timely_pct: number;
    late: number;
    late_pct: number;
    early: number;
    early_pct: number;
    missing: number;
    missing_pct: number;
}

interface TrendItem {
    label: string;
    value: number;
}

interface AnomalyRecord {
    slot_timestamp: string;
    slot_label: string;
    status: 'terlambat' | 'lebih_awal' | 'missing';
    status_label: string;
    sent_timestamp: string;
    observer: string;
}

interface DashboardStats {
    manualSummary: SummaryRow;
    awosSummary: SummaryRow;
    totalSummary: SummaryRow;
    monthlyTrendPercentage: TrendItem[];
    monthlyTrendLate: TrendItem[];
    anomalyRecords?: AnomalyRecord[];
}

interface Props {
    metarRecords: PaginatedResponse<DataMetarItem>;
    bulan: number;
    tahun: number;
    daysInMonth: number;
    totalRecords: number;
    sortOrder?: string;
    observerFilter?: string;
    availableObservers?: string[];
    dashboardStats?: DashboardStats;
}

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatDateTimeDisplay = (timestampStr: string) => {
    if (!timestampStr) {
        return { topUtc: '-', bottomWit: '-' };
    }

    const cleanStr = timestampStr.split('.')[0].replace('Z', '').replace('T', ' ');
    const [datePart, timePart] = cleanStr.split(' ');

    if (!datePart) {
        return { topUtc: timestampStr, bottomWit: '-' };
    }

    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr = '00', minStr = '00'] = (timePart || '00:00').split(':');

    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const utcHours = parseInt(hourStr, 10);
    const utcMinutes = parseInt(minStr, 10);

    const bulanIndoShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const utcMs = Date.UTC(year, monthIndex, day, utcHours, utcMinutes, 0);
    const pureUtcDate = new Date(utcMs);

    const dayNumStr = String(pureUtcDate.getUTCDate()).padStart(2, '0');
    const monthName = bulanIndoShort[pureUtcDate.getUTCMonth()];
    const fullYear = pureUtcDate.getUTCFullYear();
    const utcHoursStr = String(pureUtcDate.getUTCHours()).padStart(2, '0');
    const utcMinsStr = String(pureUtcDate.getUTCMinutes()).padStart(2, '0');

    const topUtc = `${dayNumStr} ${monthName} ${fullYear}, ${utcHoursStr}:${utcMinsStr} UTC`;

    const witMs = utcMs + 9 * 3600 * 1000;
    const witDate = new Date(witMs);

    const witHoursStr = String(witDate.getUTCHours()).padStart(2, '0');
    const witMinsStr = String(witDate.getUTCMinutes()).padStart(2, '0');

    const bottomWit = `${witHoursStr}:${witMinsStr} WIT`;

    return { topUtc, bottomWit };
};

export default function MetarIndex({
    metarRecords,
    bulan,
    tahun,
    daysInMonth,
    totalRecords,
    sortOrder = 'desc',
    observerFilter = 'ALL',
    availableObservers = [],
    dashboardStats,
}: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
            sync_result?: SyncResultPayload;
        }
    }>().props;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'records'>('dashboard');
    const [anomalyTab, setAnomalyTab] = useState<'all' | 'missing' | 'terlambat' | 'lebih_awal'>('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedMetar, setSelectedMetar] = useState<DataMetarItem | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncFilter, setSyncFilter] = useState<'ALL' | 'BERHASIL' | 'GAGAL'>('ALL');

    const syncResult = flash?.sync_result;
    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    useEffect(() => {
        if (syncResult || flashError || (flashSuccess && syncResult)) {
            setShowSyncModal(true);
        }
    }, [syncResult, flashError, flashSuccess]);

    const recordsList = metarRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
    }) => {
        const obs = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const sOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const pPage = params.newPerPage !== undefined ? params.newPerPage : metarRecords.per_page;

        router.get(
            '/laporan/metar',
            {
                bulan,
                tahun,
                observer: obs === 'ALL' ? undefined : obs,
                sort_order: sOrder,
                per_page: pPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        router.get(
            '/laporan/metar',
            {
                bulan: newBulan,
                tahun: newTahun,
                observer: observerFilter === 'ALL' ? undefined : observerFilter,
                sort_order: sortOrder,
                per_page: metarRecords.per_page,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post(
            '/laporan/metar/sync',
            { bulan, tahun },
            {
                onFinish: () => {
                    setIsSyncing(false);
                },
            }
        );
    };

    const renderPagination = () => {
        if (!metarRecords.links || metarRecords.links.length <= 1) return null;

        return (
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                    Menampilkan {metarRecords.from || 0} - {metarRecords.to || 0} dari {totalRecords} data METAR
                </span>
                <div className="flex items-center gap-1">
                    {metarRecords.links.map((link, idx) => {
                        const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                        const isNext = link.label.includes('Next') || link.label.includes('&raquo;');
                        const displayLabel = isPrev ? '«' : isNext ? '»' : link.label;

                        return (
                            <Button
                                key={idx}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => {
                                    if (link.url) {
                                        router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                                    }
                                }}
                                className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${
                                    link.active
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                                        : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                {displayLabel}
                            </Button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            <Head title="Laporan Bulanan METAR - Stasion Meteorologi Labuha" />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* TOP HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold px-3 py-1 text-xs shadow-md">
                                Sandi METAR (WAEL)
                            </Badge>
                            <span className="text-xs text-amber-300 font-mono tracking-widest uppercase">
                                Stasion Meteorologi Kelas III Oesman Sadik
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Radio className="h-7 w-7 text-amber-400 animate-pulse" />
                            Laporan Bulanan Pengamatan METAR
                        </h1>

                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Evaluasi Kepatuhan &amp; Pemantauan Pengiriman Berita Cuaca Bandara (METAR Manual &amp; AWOS Auto).
                        </p>
                    </div>

                    {/* ACTION CONTROLS */}
                    <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
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
                            className="h-10 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold px-4 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
                        </Button>
                    </div>
                </div>

                {/* VIEW SWITCH TABS (Dashboard vs Data Table) */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <Button
                        type="button"
                        variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('dashboard')}
                        className={`h-9 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                            activeTab === 'dashboard'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <BarChart3 className="h-4 w-4 text-amber-400" />
                        Dashboard Monitoring Kinerja METAR
                    </Button>

                    <Button
                        type="button"
                        variant={activeTab === 'records' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('records')}
                        className={`h-9 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                            activeTab === 'records'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <Calendar className="h-4 w-4 text-amber-400" />
                        Daftar Data Pengamatan METAR ({totalRecords})
                    </Button>
                </div>

                {/* TAB 1: METAR DASHBOARD VIEW */}
                {activeTab === 'dashboard' && dashboardStats && (
                    <div className="space-y-6">
                        {/* CHART SECTION 1: Donut Ring Chart & Stat KPI Cards */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-amber-400" />
                                        Ringkasan Kepatuhan &amp; Ketepatan Waktu Berita METAR
                                    </span>
                                    <Badge className="bg-amber-500 text-slate-950 font-bold">
                                        {NAMA_BULAN[bulan - 1]} {tahun}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                    {/* Donut Chart (5 cols) */}
                                    <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="relative w-56 h-56 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="40" className="stroke-slate-200" strokeWidth="16" fill="transparent" />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    className="stroke-slate-900 transition-all duration-1000 ease-out"
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.totalSummary.timely_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset="0"
                                                    fill="transparent"
                                                />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    className="stroke-amber-500 transition-all duration-1000 ease-out"
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.totalSummary.late_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset={`-${(dashboardStats.totalSummary.timely_pct / 100) * 251.2}`}
                                                    fill="transparent"
                                                />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    className="stroke-rose-400 transition-all duration-1000 ease-out"
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.totalSummary.missing_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset={`-${((dashboardStats.totalSummary.timely_pct + dashboardStats.totalSummary.late_pct) / 100) * 251.2}`}
                                                    fill="transparent"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-3xl font-black text-amber-500 tracking-tight">
                                                    {dashboardStats.totalSummary.target} Data
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                                    Total Evaluasi
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-6 mt-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-sm bg-slate-900" />
                                                <span className="text-xs font-bold text-slate-700">Tepat Waktu</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-sm bg-amber-500" />
                                                <span className="text-xs font-bold text-slate-700">Terlambat</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-sm bg-rose-400" />
                                                <span className="text-xs font-bold text-slate-700">Missing</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metric Cards (7 cols) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60 text-slate-700 leading-relaxed text-sm">
                                            <p className="font-medium">
                                                Pengiriman berita METAR pada periode{' '}
                                                <span className="font-bold text-slate-900">{NAMA_BULAN[bulan - 1]} {tahun}</span>{' '}
                                                mengevaluasi METAR Manual (06.00-18.00 WIT) dan AWOS Auto (18.30-05.30 WIT) dengan batas toleransi tepat waktu :-2 s.d. :+2 menit.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-2xl bg-amber-100/70 border border-amber-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-amber-950">
                                                    {dashboardStats.totalSummary.timely_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-amber-800">
                                                    <span>Tepat Waktu</span>
                                                    <span className="text-amber-950 font-extrabold">{dashboardStats.totalSummary.timely} Data</span>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-rose-100/70 border border-rose-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-rose-950">
                                                    {dashboardStats.totalSummary.missing_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-rose-800">
                                                    <span>Missing</span>
                                                    <span className="text-rose-950 font-extrabold">{dashboardStats.totalSummary.missing} Data</span>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-yellow-100/70 border border-yellow-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-yellow-950">
                                                    {dashboardStats.totalSummary.late_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-yellow-800">
                                                    <span>Terlambat</span>
                                                    <span className="text-yellow-950 font-extrabold">{dashboardStats.totalSummary.late} Data</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CHART SECTION 2: Monthly Trend Bar Charts (Image 1 & Image 2) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* CHART 1: Persentase Pengiriman Data METAR 2026 (User Image 1) */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Persentase Pengiriman Data METAR {tahun}</span>
                                        <Badge className="bg-amber-400 text-slate-950 font-bold">% Ketepatan</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-64 flex items-end justify-between gap-3 pt-8 pb-4 px-2 border-b border-slate-200">
                                        {dashboardStats.monthlyTrendPercentage.map((item, idx) => {
                                            const minVal = 98.4;
                                            const maxVal = 100.2;
                                            const pctRange = maxVal - minVal;
                                            const heightPct = Math.max(10, Math.min(100, ((item.value - minVal) / pctRange) * 100));

                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                                    <span className="text-[11px] font-black text-slate-800 mb-1">
                                                        {item.value.toLocaleString('id-ID')}
                                                    </span>
                                                    <div
                                                        style={{ height: `${heightPct}%` }}
                                                        className="w-full max-w-[36px] bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 rounded-t-md shadow hover:brightness-110 transition-all relative"
                                                    />
                                                    <span className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CHART 2: Total Keterlambatan Data METAR 2026 (User Image 2) */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Total Keterlambatan Data METAR {tahun}</span>
                                        <Badge className="bg-indigo-600 text-white font-bold">Series 2 (Jumlah)</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="h-64 flex items-end justify-between gap-3 pt-8 pb-4 px-2 border-b border-slate-200">
                                        {dashboardStats.monthlyTrendLate.map((item, idx) => {
                                            const maxVal = 70;
                                            const heightPct = Math.max(10, Math.min(100, (item.value / maxVal) * 100));

                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                                    <span className="text-[11px] font-black text-slate-800 mb-1">
                                                        {item.value}
                                                    </span>
                                                    <div
                                                        style={{ height: `${heightPct}%` }}
                                                        className="w-full max-w-[36px] bg-indigo-900 hover:bg-indigo-800 rounded-t-md shadow transition-all relative"
                                                    />
                                                    <span className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE SECTION 3: Summary Table (Manual METAR vs AWOS Auto) */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span>Rincian Pengamatan METAR Berdasarkan Jenis Pengamatan</span>
                                    <Badge className="bg-amber-400 text-slate-950 font-bold">Manual &amp; AWOS Auto</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="border-collapse w-full">
                                        <TableHeader className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead rowSpan={2} className="w-12 text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">NO</TableHead>
                                                <TableHead rowSpan={2} className="text-left border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">JENIS PENGAMATAN</TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">TARGET</TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">TEPAT WAKTU</TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">TERLAMBAT</TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">LEBIH AWAL</TableHead>
                                                <TableHead colSpan={2} className="text-center font-black text-[11px] uppercase text-slate-900">MISSING</TableHead>
                                            </TableRow>
                                            <TableRow className="hover:bg-transparent border-t border-slate-300">
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[10px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center text-[10px] font-extrabold text-slate-800">(%)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-slate-200 font-mono text-[11px]">
                                            {[dashboardStats.manualSummary, dashboardStats.awosSummary].map((st, idx) => (
                                                <TableRow key={idx} className="hover:bg-slate-50">
                                                    <TableCell className="text-center font-bold border-r border-slate-200">{idx + 1}</TableCell>
                                                    <TableCell className="font-sans font-bold border-r border-slate-200 text-slate-900">{st.jenis}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200">{st.target}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200">100</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-amber-100 text-amber-900 font-black' : 'text-slate-700'}`}>
                                                        {st.late}
                                                    </TableCell>
                                                    <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-amber-100 text-amber-900 font-black' : 'text-slate-700'}`}>
                                                        {st.late_pct.toLocaleString('id-ID')}
                                                    </TableCell>
                                                    <TableCell className="text-center border-r border-slate-200">{st.early}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200">{st.early_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className={`text-center border-r border-slate-200 font-bold ${st.missing > 0 ? 'bg-rose-100 text-rose-900 font-black' : 'text-slate-500'}`}>
                                                        {st.missing}
                                                    </TableCell>
                                                    <TableCell className={`text-center text-slate-500 ${st.missing > 0 ? 'bg-rose-100 text-rose-900 font-black' : ''}`}>
                                                        {st.missing_pct.toLocaleString('id-ID')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {/* Row Total */}
                                            <TableRow className="bg-slate-100 font-black border-t-2 border-slate-400">
                                                <TableCell colSpan={2} className="text-center font-sans font-black border-r border-slate-300 text-slate-900 uppercase">
                                                    JUMLAH
                                                </TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.target}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">100</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.totalSummary.timely}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.totalSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-amber-700">{dashboardStats.totalSummary.late}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-amber-700">{dashboardStats.totalSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.early}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.totalSummary.missing}</TableCell>
                                                <TableCell className="text-center text-rose-700">{dashboardStats.totalSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* TABLE SECTION 4: Detail Rincian Sandi METAR Evaluasi Kepatuhan GTS */}
                        {(() => {
                            const metarAnomalies = dashboardStats.anomalyRecords || [];
                            const metarMissing = metarAnomalies.filter((r) => r.status === 'missing');
                            const metarLate = metarAnomalies.filter((r) => r.status === 'terlambat');
                            const metarEarly = metarAnomalies.filter((r) => r.status === 'lebih_awal');

                            const displayedAnomalies =
                                anomalyTab === 'missing'
                                    ? metarMissing
                                    : anomalyTab === 'terlambat'
                                    ? metarLate
                                    : anomalyTab === 'lebih_awal'
                                    ? metarEarly
                                    : metarAnomalies;

                            return (
                                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                                Rincian Sandi METAR Evaluasi Kepatuhan GTS
                                            </CardTitle>

                                            {/* Sub-tabs for Missing, Terlambat, Lebih Awal */}
                                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('all')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                                                        anomalyTab === 'all'
                                                            ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                                                            : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                    }`}
                                                >
                                                    Semua ({metarAnomalies.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('missing')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                                                        anomalyTab === 'missing'
                                                            ? 'bg-rose-600 text-white shadow-md font-black'
                                                            : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                    }`}
                                                >
                                                    Missing ({metarMissing.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('terlambat')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                                                        anomalyTab === 'terlambat'
                                                            ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                                            : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                    }`}
                                                >
                                                    Terlambat ({metarLate.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('lebih_awal')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${
                                                        anomalyTab === 'lebih_awal'
                                                            ? 'bg-blue-500 text-white shadow-md font-black'
                                                            : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                    }`}
                                                >
                                                    Lebih Awal ({metarEarly.length})
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {displayedAnomalies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/50">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                                                <p className="font-extrabold text-emerald-950 text-base">
                                                    {anomalyTab === 'all'
                                                        ? 'Tidak Ada Keterlambatan atau Data Missing!'
                                                        : `Tidak Ada Data ${anomalyTab.toUpperCase()}!`}
                                                </p>
                                                <p className="text-xs text-emerald-800 mt-1">
                                                    {anomalyTab === 'all'
                                                        ? `Seluruh pengiriman berita METAR pada bulan ${NAMA_BULAN[bulan - 1]} ${tahun} 100% Tepat Waktu.`
                                                        : `Tidak ditemukan catatan untuk kategori ${anomalyTab.toUpperCase()} pada periode ini.`}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <Table className="w-full">
                                                    <TableHeader className="bg-slate-100 border-b border-slate-200">
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableHead className="w-12 text-center text-xs font-black text-slate-800">NO</TableHead>
                                                            <TableHead className="w-48 text-left text-xs font-black text-slate-800">WAKTU SLOT PENGAMATAN</TableHead>
                                                            <TableHead className="w-44 text-left text-xs font-black text-slate-800">JENIS BERITA / SLOT</TableHead>
                                                            <TableHead className="w-44 text-center text-xs font-black text-slate-800">STATUS EVALUASI</TableHead>
                                                            <TableHead className="w-48 text-left text-xs font-black text-slate-800">WAKTU PENGIRIMAN GTS</TableHead>
                                                            <TableHead className="text-left text-xs font-black text-slate-800">OBSERVER / PENGAMAT</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                                                        {displayedAnomalies.map((item, idx) => {
                                                            const dtSlot = formatDateTimeDisplay(item.slot_timestamp);
                                                            return (
                                                                <TableRow key={idx} className="hover:bg-slate-50">
                                                                    <TableCell className="text-center font-bold border-r border-slate-100 text-slate-400">
                                                                        {idx + 1}
                                                                    </TableCell>
                                                                    <TableCell className="font-sans border-r border-slate-100">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-slate-900">{dtSlot.topUtc}</span>
                                                                            <span className="text-[11px] text-slate-500">{dtSlot.bottomWit}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="font-sans font-bold border-r border-slate-100 text-slate-800">
                                                                        {item.slot_label}
                                                                    </TableCell>
                                                                    <TableCell className="text-center border-r border-slate-100 whitespace-nowrap">
                                                                        {item.status === 'terlambat' ? (
                                                                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
                                                                                <Clock className="h-3 w-3 mr-1 text-amber-600" /> {item.status_label}
                                                                            </Badge>
                                                                        ) : item.status === 'lebih_awal' ? (
                                                                            <Badge className="bg-sky-100 text-sky-900 border-sky-300 font-bold">
                                                                                <Clock className="h-3 w-3 mr-1 text-sky-600" /> {item.status_label}
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold">
                                                                                <XCircle className="h-3 w-3 mr-1 text-rose-600" /> {item.status_label}
                                                                            </Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-slate-700 border-r border-slate-100">
                                                                        {item.sent_timestamp}
                                                                    </TableCell>
                                                                    <TableCell className="font-sans font-bold text-slate-900">
                                                                        {item.observer}
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
                            );
                        })()}
                    </div>
                )}

                {/* TAB 2: OBSERVATIONS DATA LIST TABLE */}
                {(activeTab === 'records' || !dashboardStats) && (
                    <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b pb-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-amber-600" />
                                    Daftar Pengamatan METAR ({NAMA_BULAN[bulan - 1]} {tahun})
                                </CardTitle>

                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                            <Filter className="h-3.5 w-3.5 text-amber-600" /> Observer:
                                        </span>
                                        <Select
                                            value={observerFilter}
                                            onValueChange={(val) => handleFilterChange({ newObserver: val })}
                                        >
                                            <SelectTrigger className="w-[150px] h-8 text-xs bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ALL">Semua Observer</SelectItem>
                                                {availableObservers.map((obs, idx) => (
                                                    <SelectItem key={idx} value={obs}>
                                                        {obs}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                            <ArrowDownUp className="h-3.5 w-3.5 text-amber-600" /> Urutan:
                                        </span>
                                        <Select
                                            value={sortOrder}
                                            onValueChange={(val) => handleFilterChange({ newSortOrder: val })}
                                        >
                                            <SelectTrigger className="w-[120px] h-8 text-xs bg-white border-slate-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="desc">Terbaru</SelectItem>
                                                <SelectItem value="asc">Terlama</SelectItem>
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
                                    <p className="font-bold text-slate-700 text-base">Tidak ada data METAR</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                                        Tidak ditemukan data pengamatan METAR untuk periode {NAMA_BULAN[bulan - 1]} {tahun}.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="w-full">
                                        <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-12 text-center text-xs font-bold text-slate-800">NO</TableHead>
                                                <TableHead className="w-48 text-left text-xs font-bold text-slate-800">WAKTU SLOTS PENGAMATAN</TableHead>
                                                <TableHead className="text-left text-xs font-bold text-slate-800">BERITA SANDI METAR</TableHead>
                                                <TableHead className="w-44 text-center text-xs font-bold text-slate-800">STATUS MONITORING</TableHead>
                                                <TableHead className="w-48 text-left text-xs font-bold text-slate-800">WAKTU PENGIRIMAN GTS</TableHead>
                                                <TableHead className="w-56 text-left text-xs font-bold text-slate-800">OBSERVER / PENGAMAT</TableHead>
                                                <TableHead className="w-16 text-center text-xs font-bold text-slate-800">AKSI</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody className="divide-y divide-slate-100 text-xs">
                                            {recordsList.map((item, idx) => {
                                                const rowNum = (metarRecords.current_page - 1) * metarRecords.per_page + idx + 1;
                                                const observerDisplay = item.pegawai?.nama || item.observer_name || '-';
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
                                                        <TableCell className="font-mono text-[11px] text-slate-800 max-w-xs truncate border-r border-slate-100">
                                                            {item.sandi || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center border-r border-slate-100 whitespace-nowrap">
                                                            {item.monitoring_status === 'terlambat' ? (
                                                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
                                                                    <Clock className="h-3 w-3 mr-1 text-amber-600" /> Terlambat ({item.delay_minutes || 0} mnt)
                                                                </Badge>
                                                            ) : item.monitoring_status === 'lebih_awal' ? (
                                                                <Badge className="bg-sky-100 text-sky-900 border-sky-300 font-bold">
                                                                    <Clock className="h-3 w-3 mr-1 text-sky-600" /> Lebih Awal
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Tepat Waktu
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-[11px] text-slate-600 border-r border-slate-100">
                                                            {item.sent_timestamp_display || item.sent_timestamp || item.received_timestamp || '-'}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900 border-r border-slate-100">
                                                            {observerDisplay}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedMetar(item)}
                                                                className="h-7 w-7 p-0 hover:bg-amber-50 hover:text-amber-700"
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
                            {renderPagination()}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* DETAIL MODAL DIALOG */}
            <Dialog open={!!selectedMetar} onOpenChange={() => setSelectedMetar(null)}>
                <DialogContent className="max-w-2xl bg-white border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Radio className="h-5 w-5 text-amber-600" />
                            Detail Pengamatan METAR
                        </DialogTitle>
                    </DialogHeader>

                    {selectedMetar && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-slate-500 block">Waktu Slot (UTC)</span>
                                    <span className="font-bold text-slate-900">{selectedMetar.data_timestamp}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Waktu Pengiriman (GTS)</span>
                                    <span className="font-bold text-slate-900">{selectedMetar.sent_timestamp || selectedMetar.received_timestamp || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Observer Piket</span>
                                    <span className="font-bold text-slate-900">{selectedMetar.pegawai?.nama || selectedMetar.observer_name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Teknisi Piket</span>
                                    <span className="font-bold text-slate-900">{selectedMetar.teknisi?.nama || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">PPNPN Piket</span>
                                    <span className="font-bold text-slate-900">{selectedMetar.ppnpn?.nama || '-'}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-xs font-bold text-slate-700 block">Sandi Berita METAR</span>
                                <div className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl shadow-inner break-all">
                                    {selectedMetar.sandi || 'NIL'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* SYNC RESULT MODAL DIALOG */}
            <Dialog open={showSyncModal} onOpenChange={() => setShowSyncModal(false)}>
                <DialogContent className="max-w-2xl bg-white border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-600" />
                            Hasil Sinkronisasi Data METAR
                        </DialogTitle>
                    </DialogHeader>

                    {flashError && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                            <div>{flashError}</div>
                        </div>
                    )}

                    {syncResult && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <span className="text-xl font-black text-emerald-700 block">{syncResult.synced_count}</span>
                                    <span className="text-[11px] font-bold text-emerald-800">Berhasil Disimpan</span>
                                </div>
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                                    <span className="text-xl font-black text-rose-700 block">{syncResult.failed_count}</span>
                                    <span className="text-[11px] font-bold text-rose-800">Gagal</span>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <span className="text-xl font-black text-amber-700 block">{syncResult.total_fetched}</span>
                                    <span className="text-[11px] font-bold text-amber-800">Total Diambil</span>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 font-medium">{syncResult.message}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

MetarIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/metar' },
            { title: 'Data METAR', href: '/laporan/metar' },
        ]}
    >
        {page}
    </AppLayout>
);

