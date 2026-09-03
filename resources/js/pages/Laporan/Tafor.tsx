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
    CloudRain,
    Compass,
    Eye,
    FileSpreadsheet,
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

interface DataTaforItem {
    id: number;
    bmkgsoft_entry_id: number | null;
    station_id: number;
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
    teknisi_id?: number | null;
    teknisi?: Pegawai | null;
    ppnpn_id?: number | null;
    ppnpn?: Pegawai | null;
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

interface MonthlyTrendItem {
    label: string;
    target: number;
    sent: number;
    missing: number;
    pct: number;
}

interface AnomalyRecord {
    slot_timestamp: string;
    slot_label: string;
    status: 'missing';
    status_label: string;
    sent_timestamp: string;
    observer: string;
}

interface DashboardStats {
    summary: SummaryRow;
    monthlyTrendReport: MonthlyTrendItem[];
    anomalyRecords?: AnomalyRecord[];
}

interface Props {
    taforRecords: PaginatedResponse<DataTaforItem>;
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

export default function TaforIndex({
    taforRecords,
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
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedTafor, setSelectedTafor] = useState<DataTaforItem | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [hoveredDonutSegment, setHoveredDonutSegment] = useState<{
        label: string;
        count: number;
        pct: number;
        dotColor: string;
    } | null>(null);

    const syncResult = flash?.sync_result;
    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    useEffect(() => {
        if (syncResult || flashError || (flashSuccess && syncResult)) {
            setShowSyncModal(true);
        }
    }, [syncResult, flashError, flashSuccess]);

    const recordsList = taforRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
    }) => {
        const obs = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const sOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const pPage = params.newPerPage !== undefined ? params.newPerPage : taforRecords.per_page;

        router.get(
            '/laporan/tafor',
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
            '/laporan/tafor',
            {
                bulan: newBulan,
                tahun: newTahun,
                observer: observerFilter === 'ALL' ? undefined : observerFilter,
                sort_order: sortOrder,
                per_page: taforRecords.per_page,
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
            '/laporan/tafor/sync',
            { bulan, tahun },
            {
                onFinish: () => {
                    setIsSyncing(false);
                },
            }
        );
    };

    const handleExportExcel = () => {
        window.location.href = `/laporan/tafor/export-verifikasi?bulan=${bulan}&tahun=${tahun}`;
    };

    const renderPagination = () => {
        if (!taforRecords.links || taforRecords.links.length <= 1) return null;

        return (
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                    Menampilkan {taforRecords.from || 0} - {taforRecords.to || 0} dari {totalRecords} data TAFOR
                </span>
                <div className="flex items-center gap-1">
                    {taforRecords.links.map((link, idx) => {
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
                                className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${link.active
                                    ? 'bg-sky-600 hover:bg-sky-700 text-white font-bold'
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
            <Head title="Laporan Bulanan TAFOR - Stasion Meteorologi Labuha" />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* TOP HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-sky-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold px-3 py-1 text-xs shadow-md">
                                Prakiraan Cuaca Bandara (TAFOR)
                            </Badge>
                            <span className="text-xs text-sky-300 font-mono tracking-widest uppercase">
                                Stasion Meteorologi Kelas III Oesman Sadik (WAEL / 97460)
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <CloudRain className="h-7 w-7 text-sky-400 animate-pulse" />
                            Laporan Bulanan Pengiriman TAFOR
                        </h1>

                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Rekapitulasi Monitoring &amp; Pengiriman TAFOR
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
                            onClick={handleExportExcel}
                            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export Excel Verifikasi
                        </Button>

                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="h-10 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-sky-500/20 transition-all flex items-center gap-2"
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
                        className={`h-9 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'dashboard'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        <BarChart3 className="h-4 w-4 text-sky-400" />
                        Dashboard Monitoring Pengiriman TAFOR
                    </Button>

                    <Button
                        type="button"
                        variant={activeTab === 'records' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('records')}
                        className={`h-9 px-4 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === 'records'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                    >
                        <Calendar className="h-4 w-4 text-sky-400" />
                        Daftar Data Pengiriman TAFOR ({totalRecords})
                    </Button>
                </div>

                {/* TAB 1: TAFOR DASHBOARD VIEW */}
                {activeTab === 'dashboard' && dashboardStats && (
                    <div className="space-y-6">
                        {/* CHART SECTION 1: Donut Ring Chart & Stat KPI Cards */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-sky-400" />
                                        Ringkasan Monitoring Ketepatan Waktu Pengiriman TAFOR
                                    </span>
                                    <Badge className="bg-sky-500 text-white font-bold">
                                        {NAMA_BULAN[bulan - 1]} {tahun}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                    {/* Donut Chart (5 cols) */}
                                    <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="relative w-56 h-56 flex items-center justify-center">
                                            {/* Floating Hover Badge */}
                                            {hoveredDonutSegment && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-xs font-semibold shadow-xl border border-slate-700/50 backdrop-blur-sm pointer-events-none transition-all flex items-center gap-2 whitespace-nowrap">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${hoveredDonutSegment.dotColor}`} />
                                                    <span>{hoveredDonutSegment.label}:</span>
                                                    <span className="font-black text-amber-400">{hoveredDonutSegment.count} Data</span>
                                                    <span className="text-slate-300">({hoveredDonutSegment.pct.toLocaleString('id-ID')}%)</span>
                                                </div>
                                            )}

                                            <svg className="w-full h-full transform -rotate-90 overflow-visible pointer-events-none" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className="stroke-slate-200 pointer-events-auto"
                                                    strokeWidth="16"
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className={`stroke-indigo-900 transition-all duration-200 cursor-pointer pointer-events-auto ${
                                                        hoveredDonutSegment?.label === 'Terkirim' ? 'stroke-[19px] brightness-125' : 'hover:stroke-[18px]'
                                                    }`}
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.summary.timely_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset="0"
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                    onMouseEnter={() => setHoveredDonutSegment({
                                                        label: 'Terkirim',
                                                        count: dashboardStats.summary.timely,
                                                        pct: dashboardStats.summary.timely_pct,
                                                        dotColor: 'bg-indigo-900',
                                                    })}
                                                    onMouseLeave={() => setHoveredDonutSegment(null)}
                                                >
                                                    <title>{`Terkirim: ${dashboardStats.summary.timely} Data (${dashboardStats.summary.timely_pct.toLocaleString('id-ID')}%)`}</title>
                                                </circle>
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className={`stroke-rose-400 transition-all duration-200 cursor-pointer pointer-events-auto ${
                                                        hoveredDonutSegment?.label === 'Missing' ? 'stroke-[19px] brightness-125' : 'hover:stroke-[18px]'
                                                    }`}
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.summary.missing_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset={`-${(dashboardStats.summary.timely_pct / 100) * 251.2}`}
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                    onMouseEnter={() => setHoveredDonutSegment({
                                                        label: 'Missing',
                                                        count: dashboardStats.summary.missing,
                                                        pct: dashboardStats.summary.missing_pct,
                                                        dotColor: 'bg-rose-400',
                                                    })}
                                                    onMouseLeave={() => setHoveredDonutSegment(null)}
                                                >
                                                    <title>{`Missing: ${dashboardStats.summary.missing} Data (${dashboardStats.summary.missing_pct.toLocaleString('id-ID')}%)`}</title>
                                                </circle>
                                            </svg>
                                            <div
                                                className="absolute inset-8 rounded-full flex flex-col items-center justify-center text-center transition-all z-10 cursor-default"
                                                onMouseEnter={() => setHoveredDonutSegment(null)}
                                            >
                                                <span className="text-3xl font-black text-amber-500 tracking-tight transition-transform pointer-events-none">
                                                    {hoveredDonutSegment ? `${hoveredDonutSegment.count} Data` : `${dashboardStats.summary.timely} Data`}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5 pointer-events-none">
                                                    {hoveredDonutSegment ? hoveredDonutSegment.label : 'Terkirim'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Legend with interactive hover */}
                                        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6">
                                            <div
                                                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                                                    hoveredDonutSegment?.label === 'Terkirim' ? 'bg-indigo-100 ring-1 ring-indigo-300' : 'hover:bg-slate-100'
                                                }`}
                                                onMouseEnter={() => setHoveredDonutSegment({
                                                    label: 'Terkirim',
                                                    count: dashboardStats.summary.timely,
                                                    pct: dashboardStats.summary.timely_pct,
                                                    dotColor: 'bg-indigo-900',
                                                })}
                                                onMouseLeave={() => setHoveredDonutSegment(null)}
                                            >
                                                <div className="w-3.5 h-3.5 rounded-sm bg-indigo-900" />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Terkirim ({dashboardStats.summary.timely})
                                                </span>
                                            </div>
                                            <div
                                                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                                                    hoveredDonutSegment?.label === 'Missing' ? 'bg-rose-100 ring-1 ring-rose-300' : 'hover:bg-slate-100'
                                                }`}
                                                onMouseEnter={() => setHoveredDonutSegment({
                                                    label: 'Missing',
                                                    count: dashboardStats.summary.missing,
                                                    pct: dashboardStats.summary.missing_pct,
                                                    dotColor: 'bg-rose-400',
                                                })}
                                                onMouseLeave={() => setHoveredDonutSegment(null)}
                                            >
                                                <div className="w-3.5 h-3.5 rounded-sm bg-rose-400" />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Missing ({dashboardStats.summary.missing})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metric Cards (7 cols) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-200/60 text-slate-700 leading-relaxed text-sm">
                                            <p className="font-medium">
                                                Pengiriman TAFOR pada periode{' '}
                                                <span className="font-bold text-slate-900">{NAMA_BULAN[bulan - 1]} {tahun}</span>{' '}
                                                mengevaluasi 4 slot pengamatan per hari (06:00, 12:00, 18:00, dan 00:00 UTC)
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-indigo-950">
                                                    {dashboardStats.summary.timely_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-indigo-800">
                                                    <span>Terkirim</span>
                                                    <span className="text-indigo-950 font-extrabold">{dashboardStats.summary.timely} Data</span>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-rose-950">
                                                    {dashboardStats.summary.missing_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-rose-800">
                                                    <span>Missing</span>
                                                    <span className="text-rose-950 font-extrabold">{dashboardStats.summary.missing} Data</span>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-sky-950">
                                                    {dashboardStats.summary.target} Data
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-sky-800">
                                                    <span>Target Total</span>
                                                    <span className="text-sky-950 font-extrabold">100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CHART SECTION 2 & 3: Rekap Pengiriman Tafor (Chart + Data Table + Miss Data List - Image 1 & Image 2) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* CHART & TREND TABLE (8 cols - Image 1) */}
                            <Card className="lg:col-span-8 border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rekap Pengiriman Tafor {tahun}</span>
                                        <Badge className="bg-sky-400 text-slate-950 font-bold">Trend Bulanan</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6 overflow-visible">
                                    {/* Single Bar Chart: Terkirim & Persentase */}
                                    <div className="h-72 flex items-end justify-between gap-2 pt-8 pb-4 px-2 border-b border-slate-200 overflow-visible relative">
                                        {(() => {
                                            const validPcts = dashboardStats.monthlyTrendReport.filter(i => i.pct > 0).map(i => i.pct);
                                            const minValPct = validPcts.length > 0 ? Math.max(0, Math.floor(Math.min(...validPcts) - 5)) : 0;
                                            const pctRange = Math.max(1, 100 - minValPct);

                                            return dashboardStats.monthlyTrendReport.map((item, idx) => {
                                                const heightPct = item.pct > 0 ? Math.max(8, Math.min(100, ((item.pct - minValPct) / pctRange) * 100)) : 0;

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                                        {/* FLOATING HOVER TOOLTIP CARD */}
                                                        <div className="absolute -top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-44 p-2.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/50 flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold text-sky-400">
                                                                <span>{(item as any).full_label || item.label}</span>
                                                            </div>
                                                            <div className="space-y-1 text-[11px]">
                                                                <div className="flex items-center justify-between text-indigo-300">
                                                                    <span>Ketepatan:</span>
                                                                    <span className="font-bold">{item.pct.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-slate-300">
                                                                    <span>Terkirim:</span>
                                                                    <span className="font-bold">{item.sent} / {item.target} Data</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                                        </div>

                                                        {/* Percentage Label */}
                                                        <span className="text-[10px] font-black text-slate-800 mb-1">
                                                            {item.pct > 0 ? `${item.pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '0%'}
                                                        </span>

                                                        {/* Single Bar Container */}
                                                        <div className="w-full max-w-[36px] bg-slate-100 rounded-t-sm flex items-end justify-center h-44 p-0.5">
                                                            <div
                                                                style={{ height: `${heightPct}%` }}
                                                                className={`w-full ${heightPct > 0 ? 'bg-indigo-900 group-hover:bg-indigo-800 group-hover:shadow-[0_0_8px_rgba(49,46,129,0.8)]' : 'bg-slate-200'} rounded-t-sm transition-all duration-300 relative cursor-pointer`}
                                                                title={`Terkirim: ${item.sent} / ${item.target} (${item.pct}%)`}
                                                            />
                                                        </div>

                                                        <span className="text-[10px] font-bold text-slate-600 mt-2 truncate w-full text-center group-hover:text-indigo-600 transition-colors">
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Table Legend & Values (Matching User Image 1) */}
                                    <div className="overflow-x-auto">
                                        <Table className="border-collapse w-full text-xs">
                                            <TableBody>
                                                <TableRow className="bg-slate-50 font-bold border-b border-slate-200">
                                                    <TableCell className="w-28 font-sans text-slate-700 flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-sky-200 rounded-xs shrink-0" />
                                                        Seharusnya
                                                    </TableCell>
                                                    {dashboardStats.monthlyTrendReport.map((item, idx) => (
                                                        <TableCell key={idx} className="text-center font-mono text-slate-900">
                                                            {item.target}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                <TableRow className="bg-slate-50 font-bold border-b border-slate-200">
                                                    <TableCell className="w-28 font-sans text-slate-700 flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-indigo-900 rounded-xs shrink-0" />
                                                        Terkirim
                                                    </TableCell>
                                                    {dashboardStats.monthlyTrendReport.map((item, idx) => (
                                                        <TableCell key={idx} className="text-center font-mono text-indigo-900 font-extrabold">
                                                            {item.sent}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                <TableRow className="bg-slate-100 font-black">
                                                    <TableCell className="w-28 font-sans text-slate-900">
                                                        Persentase
                                                    </TableCell>
                                                    {dashboardStats.monthlyTrendReport.map((item, idx) => (
                                                        <TableCell key={idx} className="text-center font-mono text-slate-950">
                                                            {item.pct.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* MISS DATA TAFOR LIST CARD (4 cols - Image 2) */}
                            <Card className="lg:col-span-4 border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rincian Miss Data TAFOR {tahun}</span>
                                        <Badge className="bg-rose-600 text-white font-bold">Missing Count</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 font-mono text-xs">
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {dashboardStats.monthlyTrendReport.map((item, idx) => {
                                            const fullMonthName = ((item as any).full_label || item.label).toUpperCase();

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${item.missing > 0
                                                        ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-extrabold'
                                                        : 'bg-emerald-50/50 border-emerald-100 text-emerald-900 font-bold'
                                                        }`}
                                                >
                                                    <span className="tracking-tight truncate mr-1">{fullMonthName.slice(0, 3)}</span>
                                                    <span className="text-xs font-black tracking-wider whitespace-nowrap">
                                                        {item.missing} <span className="font-normal opacity-70">miss</span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE SECTION 4: Detail Rincian Sandi TAFOR Evaluasi Kepatuhan GTS */}
                        {(() => {
                            const taforAnomalies = dashboardStats.anomalyRecords || [];

                            return (
                                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white p-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-sky-400" />
                                                Rincian Miss Data TAFOR Evaluasi Monitoring GTS ({NAMA_BULAN[bulan - 1]} {tahun})
                                            </CardTitle>
                                            <Badge className="bg-rose-600 text-white font-bold">
                                                {taforAnomalies.length} Missing Data
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {taforAnomalies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/50">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                                                <p className="font-extrabold text-emerald-950 text-base">
                                                    Tidak Ada Data Missing TAFOR!
                                                </p>
                                                <p className="text-xs text-emerald-800 mt-1">
                                                    Seluruh pengiriman berita TAFOR pada bulan {NAMA_BULAN[bulan - 1]} {tahun} 100% Terkirim.
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
                                                        {taforAnomalies.map((item, idx) => {
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
                                                                        <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold">
                                                                            <XCircle className="h-3 w-3 mr-1 text-rose-600" /> {item.status_label}
                                                                        </Badge>
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
                                    <Calendar className="h-5 w-5 text-sky-600" />
                                    Daftar Pengamatan TAFOR ({NAMA_BULAN[bulan - 1]} {tahun})
                                </CardTitle>

                                <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                            <Filter className="h-3.5 w-3.5 text-sky-600" /> Observer:
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
                                            <ArrowDownUp className="h-3.5 w-3.5 text-sky-600" /> Urutan:
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
                                    <p className="font-bold text-slate-700 text-base">Tidak ada data TAFOR</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                                        Tidak ditemukan data pengamatan TAFOR untuk periode {NAMA_BULAN[bulan - 1]} {tahun}.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="w-full">
                                        <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-12 text-center text-xs font-bold text-slate-800">NO</TableHead>
                                                <TableHead className="w-48 text-left text-xs font-bold text-slate-800">WAKTU SLOTS PENGAMATAN</TableHead>
                                                <TableHead className="text-left text-xs font-bold text-slate-800">BERITA SANDI TAFOR</TableHead>
                                                <TableHead className="w-48 text-left text-xs font-bold text-slate-800">WAKTU PENGIRIMAN GTS</TableHead>
                                                <TableHead className="w-56 text-left text-xs font-bold text-slate-800">OBSERVER / PENGAMAT</TableHead>
                                                <TableHead className="w-16 text-center text-xs font-bold text-slate-800">AKSI</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody className="divide-y divide-slate-100 text-xs">
                                            {recordsList.map((item, idx) => {
                                                const rowNum = (taforRecords.current_page - 1) * taforRecords.per_page + idx + 1;
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
                                                        <TableCell className="font-mono text-[11px] text-slate-600 border-r border-slate-100">
                                                            {item.sent_timestamp || item.received_timestamp || '-'}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900 border-r border-slate-100">
                                                            {observerDisplay}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedTafor(item)}
                                                                className="h-7 w-7 p-0 hover:bg-sky-50 hover:text-sky-700"
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
            <Dialog open={!!selectedTafor} onOpenChange={() => setSelectedTafor(null)}>
                <DialogContent className="max-w-2xl bg-white border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <CloudRain className="h-5 w-5 text-sky-600" />
                            Detail Pengamatan TAFOR
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTafor && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-slate-500 block">Waktu Slot (UTC)</span>
                                    <span className="font-bold text-slate-900">{selectedTafor.data_timestamp}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Waktu Pengiriman (GTS)</span>
                                    <span className="font-bold text-slate-900">{selectedTafor.sent_timestamp || selectedTafor.received_timestamp || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Observer Piket</span>
                                    <span className="font-bold text-slate-900">{selectedTafor.pegawai?.nama || selectedTafor.observer_name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Teknisi Piket</span>
                                    <span className="font-bold text-slate-900">{selectedTafor.teknisi?.nama || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">PPNPN Piket</span>
                                    <span className="font-bold text-slate-900">{selectedTafor.ppnpn?.nama || '-'}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-xs font-bold text-slate-700 block">Sandi Berita TAFOR</span>
                                <div className="p-3 bg-slate-900 text-sky-300 font-mono text-xs rounded-xl shadow-inner break-all">
                                    {selectedTafor.sandi || 'NIL'}
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
                            <Sparkles className="h-5 w-5 text-sky-600" />
                            Hasil Sinkronisasi Data TAFOR
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
                                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
                                    <span className="text-xl font-black text-sky-700 block">{syncResult.total_fetched}</span>
                                    <span className="text-[11px] font-bold text-sky-800">Total Diambil</span>
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
