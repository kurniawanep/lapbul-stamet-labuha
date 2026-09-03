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
    Info,
    LayoutDashboard,
    PieChart as PieChartIcon,
    Radio,
    RefreshCw,
    Sparkles,
    Sun,
    Table as TableIcon,
    UserCheck,
    XCircle,
} from 'lucide-react';

interface Pegawai {
    id: number;
    nama: string;
}

interface DataSinoptikItem {
    id: number;
    station_id: number;
    station_name: string;
    data_timestamp: string;
    received_timestamp: string | null;
    sent_timestamp: string | null;
    sandi: string | null;
    temp_drybulb: number | null;
    temp_max: number | null;
    temp_min: number | null;
    temp_wetbulb: number | null;
    temp_dewpoint: number | null;
    humidity: number | null;
    pressure_qff: number | null;
    pressure_qfe: number | null;
    wind_dir: number | null;
    wind_speed: number | null;
    visibility: number | null;
    rainfall: number | null;
    cloud_cover: string | null;
    observer_name: string | null;
    pegawai_id: number | null;
    pegawai?: Pegawai | null;
    teknisi_id?: number | null;
    teknisi?: Pegawai | null;
    ppnpn_id?: number | null;
    ppnpn?: Pegawai | null;
    monitoring_status?: 'tepat_waktu' | 'terlambat' | 'lebih_awal' | 'missing';
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
    jenis?: string;
    label?: string;
    hour?: number;
    is_utama?: boolean;
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
    percentage: number;
    full_label?: string;
    timely_count?: number;
    target_count?: number;
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
    utamaSummary: SummaryRow;
    selaSummary: SummaryRow;
    totalSummary: SummaryRow;
    bySlotHourUtama: SummaryRow[];
    bySlotHourSela: SummaryRow[];
    monthlyTrendUtama: MonthlyTrendItem[];
    monthlyTrendSela: MonthlyTrendItem[];
    anomalyRecords?: AnomalyRecord[];
}

interface Props {
    sinoptikRecords: PaginatedResponse<DataSinoptikItem>;
    bulan: number;
    tahun: number;
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

export default function SinoptikIndex({
    sinoptikRecords,
    bulan,
    tahun,
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
    const [selectedSinoptik, setSelectedSinoptik] = useState<DataSinoptikItem | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncFilter, setSyncFilter] = useState<'ALL' | 'BERHASIL' | 'GAGAL'>('ALL');
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

    const recordsList = sinoptikRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
        newBulan?: number;
        newTahun?: number;
    }) => {
        const activeObserver = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const activeSortOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const activePerPage = params.newPerPage !== undefined ? params.newPerPage : sinoptikRecords.per_page;
        const activeBulan = params.newBulan !== undefined ? params.newBulan : bulan;
        const activeTahun = params.newTahun !== undefined ? params.newTahun : tahun;

        const queryData: Record<string, any> = {
            bulan: activeBulan,
            tahun: activeTahun,
            per_page: activePerPage,
            sort_order: activeSortOrder,
        };

        if (activeObserver && activeObserver !== 'ALL') {
            queryData.observer = activeObserver;
        }

        router.get('/laporan/sinoptik', queryData, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/sinoptik/sync', { bulan, tahun }, {
            preserveScroll: true,
            onSuccess: () => setShowSyncModal(true),
            onError: () => setShowSyncModal(true),
            onFinish: () => setIsSyncing(false),
        });
    };

    return (
        <>
            <Head title="Laporan Bulanan - Data Sinoptik BMKG" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* Flash Banner Notifications */}
                {flashSuccess && !showSyncModal && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2.5 text-sm font-medium">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <span>{flashSuccess}</span>
                        </div>
                        {syncResult && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSyncModal(true)}
                                className="h-8 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                                Lihat Rincian Response
                            </Button>
                        )}
                    </div>
                )}

                {flashError && !showSyncModal && (
                    <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2.5 text-sm font-medium">
                            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                            <span>{flashError}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSyncModal(true)}
                            className="h-8 text-xs border-rose-300 text-rose-800 hover:bg-rose-100"
                        >
                            Detail Peringatan
                        </Button>
                    </div>
                )}

                {/* Header Branding */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-blue-950 text-white p-6 rounded-2xl shadow-xl">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/30 px-3 py-1 text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Monitoring Kinerja SYNOP
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                Stasiun Meteorologi Oesman Sadik
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                            <Sun className="h-7 w-7 text-amber-400 animate-pulse" />
                            Laporan Kinerja &amp; Pengamatan Sinoptik (SYNOP AAXX)
                        </h1>
                        <p className="text-slate-300 text-sm">
                            Rekapitulasi Ketepatan Waktu GTS &amp; Evaluasi Pengiriman Berita Sinoptik (WMO ID: 97460)
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Year Filter */}
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10">
                            <Select
                                value={String(bulan)}
                                onValueChange={(val) => handleFilterChange({ newBulan: Number(val) })}
                            >
                                <SelectTrigger className="w-[130px] bg-transparent border-0 text-white focus:ring-0">
                                    <SelectValue placeholder="Bulan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800">
                                    {NAMA_BULAN.map((m, idx) => (
                                        <SelectItem key={idx + 1} value={String(idx + 1)}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(tahun)}
                                onValueChange={(val) => handleFilterChange({ newTahun: Number(val) })}
                            >
                                <SelectTrigger className="w-[100px] bg-transparent border-0 text-white focus:ring-0">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800">
                                    {[2025, 2026, 2027].map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sync Button */}
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-lg shadow-amber-900/30"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
                        </Button>
                    </div>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Button
                        variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('dashboard')}
                        className={`gap-2 font-bold text-sm rounded-xl ${activeTab === 'dashboard'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                    >
                        <LayoutDashboard className="h-4 w-4 text-amber-400" />
                        Dashboard Monitoring Kinerja SYNOP
                    </Button>
                    <Button
                        variant={activeTab === 'records' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('records')}
                        className={`gap-2 font-bold text-sm rounded-xl ${activeTab === 'records'
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                    >
                        <TableIcon className="h-4 w-4 text-sky-400" />
                        Daftar Data Pengamatan AAXX ({totalRecords})
                    </Button>
                </div>

                {/* TAB 1: DASHBOARD MONITORING KINERJA SYNOP */}
                {activeTab === 'dashboard' && dashboardStats && (
                    <div className="space-y-8">
                        {/* CHART SECTION 1: Donut Chart Kinerja Pengiriman Berita SYNOP */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-5 border-b">
                                <CardTitle className="text-xl md:text-2xl font-extrabold flex items-center gap-3">
                                    <PieChartIcon className="h-6 w-6 text-sky-400" />
                                    Kinerja Pengiriman Berita SYNOP ({NAMA_BULAN[bulan - 1]} {tahun})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                    {/* Donut Visual */}
                                    <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
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
                                                {/* Background Circle */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className="stroke-slate-200 pointer-events-auto"
                                                    strokeWidth="16"
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                />
                                                {/* Timely Arc (Dark Blue / Sky) */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className={`stroke-sky-900 transition-all duration-200 cursor-pointer pointer-events-auto ${
                                                        hoveredDonutSegment?.label === 'Tepat Waktu' ? 'stroke-[19px] brightness-125' : 'hover:stroke-[18px]'
                                                    }`}
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.totalSummary.timely_pct / 100) * 251.2} 251.2`}
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                    onMouseEnter={() => setHoveredDonutSegment({
                                                        label: 'Tepat Waktu',
                                                        count: dashboardStats.totalSummary.timely,
                                                        pct: dashboardStats.totalSummary.timely_pct,
                                                        dotColor: 'bg-sky-900',
                                                    })}
                                                    onMouseLeave={() => setHoveredDonutSegment(null)}
                                                >
                                                    <title>{`Tepat Waktu: ${dashboardStats.totalSummary.timely} Data (${dashboardStats.totalSummary.timely_pct.toLocaleString('id-ID')}%)`}</title>
                                                </circle>
                                                {/* Late Arc (Bright Blue) */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="40"
                                                    className={`stroke-sky-400 transition-all duration-200 cursor-pointer pointer-events-auto ${
                                                        hoveredDonutSegment?.label === 'Terlambat' ? 'stroke-[19px] brightness-125' : 'hover:stroke-[18px]'
                                                    }`}
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.totalSummary.late_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset={`-${(dashboardStats.totalSummary.timely_pct / 100) * 251.2}`}
                                                    fill="none"
                                                    style={{ pointerEvents: 'stroke' }}
                                                    onMouseEnter={() => setHoveredDonutSegment({
                                                        label: 'Terlambat',
                                                        count: dashboardStats.totalSummary.late,
                                                        pct: dashboardStats.totalSummary.late_pct,
                                                        dotColor: 'bg-sky-400',
                                                    })}
                                                    onMouseLeave={() => setHoveredDonutSegment(null)}
                                                >
                                                    <title>{`Terlambat: ${dashboardStats.totalSummary.late} Data (${dashboardStats.totalSummary.late_pct.toLocaleString('id-ID')}%)`}</title>
                                                </circle>
                                            </svg>
                                            <div
                                                className="absolute inset-8 rounded-full flex flex-col items-center justify-center text-center transition-all z-10 cursor-default"
                                                onMouseEnter={() => setHoveredDonutSegment(null)}
                                            >
                                                <span className="text-3xl font-black text-amber-500 tracking-tight transition-transform pointer-events-none">
                                                    {hoveredDonutSegment ? `${hoveredDonutSegment.count} Data` : `${dashboardStats.totalSummary.timely} Data`}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5 pointer-events-none">
                                                    {hoveredDonutSegment ? hoveredDonutSegment.label : 'Tepat Waktu'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Legend with interactive hover */}
                                        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6">
                                            <div
                                                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                                                    hoveredDonutSegment?.label === 'Tepat Waktu' ? 'bg-sky-100 ring-1 ring-sky-300' : 'hover:bg-slate-100'
                                                }`}
                                                onMouseEnter={() => setHoveredDonutSegment({
                                                    label: 'Tepat Waktu',
                                                    count: dashboardStats.totalSummary.timely,
                                                    pct: dashboardStats.totalSummary.timely_pct,
                                                    dotColor: 'bg-sky-900',
                                                })}
                                                onMouseLeave={() => setHoveredDonutSegment(null)}
                                            >
                                                <div className="w-3.5 h-3.5 rounded-sm bg-sky-900" />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Tepat Waktu ({dashboardStats.totalSummary.timely})
                                                </span>
                                            </div>
                                            <div
                                                className={`flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                                                    hoveredDonutSegment?.label === 'Terlambat' ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-slate-100'
                                                }`}
                                                onMouseEnter={() => setHoveredDonutSegment({
                                                    label: 'Terlambat',
                                                    count: dashboardStats.totalSummary.late,
                                                    pct: dashboardStats.totalSummary.late_pct,
                                                    dotColor: 'bg-sky-400',
                                                })}
                                                onMouseLeave={() => setHoveredDonutSegment(null)}
                                            >
                                                <div className="w-3.5 h-3.5 rounded-sm bg-sky-400" />
                                                <span className="text-xs font-bold text-slate-700">
                                                    Terlambat ({dashboardStats.totalSummary.late})
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text Narrative & Metric Cards */}
                                    <div className="lg:col-span-6 space-y-6">
                                        <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 text-slate-700 leading-relaxed text-sm">
                                            <p className="font-medium">
                                                Pengiriman berita SYNOP (Utama, Penting, dan Jam Sela) pada periode{' '}
                                                <span className="font-bold text-slate-900">{NAMA_BULAN[bulan - 1]} {tahun}</span>{' '}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Timely Stat Card */}
                                            <div className="p-5 rounded-2xl bg-sky-100/70 border border-sky-200 flex items-center justify-between shadow-sm">
                                                <div>
                                                    <span className="text-2xl font-black text-sky-950">
                                                        {dashboardStats.totalSummary.timely_pct.toLocaleString('id-ID')}%
                                                    </span>
                                                    <span className="block text-xs font-bold text-sky-800 uppercase tracking-wide mt-0.5">
                                                        Tepat Waktu
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-extrabold text-sky-900">
                                                        {dashboardStats.totalSummary.timely}
                                                    </span>
                                                    <span className="block text-xs font-semibold text-sky-700">Data</span>
                                                </div>
                                            </div>

                                            {/* Late Stat Card */}
                                            <div className="p-5 rounded-2xl bg-sky-100/70 border border-sky-200 flex items-center justify-between shadow-sm">
                                                <div>
                                                    <span className="text-2xl font-black text-sky-950">
                                                        {dashboardStats.totalSummary.late_pct.toLocaleString('id-ID')}%
                                                    </span>
                                                    <span className="block text-xs font-bold text-sky-800 uppercase tracking-wide mt-0.5">
                                                        Terlambat
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xl font-extrabold text-sky-900">
                                                        {dashboardStats.totalSummary.late}
                                                    </span>
                                                    <span className="block text-xs font-semibold text-sky-700">Data</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* CHART SECTION 2: Monthly Trends Bar Charts (Images 4 & 5) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Bar Chart 1: Jam Penting / Utama */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-sky-400" />
                                        Persentase Pengiriman SYNOP Jam Utama (Tepat Waktu)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 overflow-visible">
                                    <div className="h-72 flex items-end justify-between gap-1.5 pt-16 pb-4 px-2 border-b border-slate-200 overflow-visible relative">
                                        {(() => {
                                            const validPcts = dashboardStats.monthlyTrendUtama.filter(i => i.percentage > 0).map(i => i.percentage);
                                            const minValPct = validPcts.length > 0 ? Math.max(0, Math.floor(Math.min(...validPcts) - 5)) : 0;
                                            const pctRange = Math.max(1, 100 - minValPct);

                                            return dashboardStats.monthlyTrendUtama.map((item, idx) => {
                                                const pct = item.percentage;
                                                const barHeight = pct > 0 ? Math.max(8, Math.min(100, ((pct - minValPct) / pctRange) * 100)) : 0;

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center min-w-[32px] group relative">
                                                        {/* FLOATING HOVER TOOLTIP CARD */}
                                                        <div className="absolute -top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-44 p-2.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/50 flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold text-sky-400">
                                                                <span>{item.full_label || item.label}</span>
                                                            </div>
                                                            <div className="space-y-1 text-[11px]">
                                                                <div className="flex items-center justify-between text-sky-300">
                                                                    <span>Ketepatan:</span>
                                                                    <span className="font-bold">{pct.toLocaleString('id-ID')}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-slate-300">
                                                                    <span>Tepat Waktu:</span>
                                                                    <span className="font-bold">{item.timely_count || 0} / {item.target_count || 248}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                                        </div>

                                                        <span className="text-[10px] font-extrabold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                                                            {pct > 0 ? pct.toLocaleString('id-ID') : '0'}
                                                        </span>
                                                        <div className="w-full max-w-[28px] bg-slate-100 rounded-t-sm flex items-end h-44 p-0.5">
                                                            <div
                                                                className={`w-full ${barHeight > 0 ? 'bg-blue-600 group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(37,99,235,0.8)]' : 'bg-slate-200'} rounded-t-sm transition-all duration-300 cursor-pointer`}
                                                                style={{ height: `${barHeight}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 mt-2 truncate w-full text-center group-hover:text-blue-600 transition-colors">
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bar Chart 2: Jam Sela */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-sky-400" />
                                        Persentase Pengiriman SYNOP Jam Sela (Tepat Waktu)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 overflow-visible">
                                    <div className="h-72 flex items-end justify-between gap-1.5 pt-16 pb-4 px-2 border-b border-slate-200 overflow-visible relative">
                                        {(() => {
                                            const validPcts = dashboardStats.monthlyTrendSela.filter(i => i.percentage > 0).map(i => i.percentage);
                                            const minValPct = validPcts.length > 0 ? Math.max(0, Math.floor(Math.min(...validPcts) - 5)) : 0;
                                            const pctRange = Math.max(1, 100 - minValPct);

                                            return dashboardStats.monthlyTrendSela.map((item, idx) => {
                                                const pct = item.percentage;
                                                const barHeight = pct > 0 ? Math.max(8, Math.min(100, ((pct - minValPct) / pctRange) * 100)) : 0;

                                                return (
                                                    <div key={idx} className="flex-1 flex flex-col items-center min-w-[32px] group relative">
                                                        {/* FLOATING HOVER TOOLTIP CARD */}
                                                        <div className="absolute -top-28 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 w-44 p-2.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-sm border border-slate-700/50 flex flex-col gap-1 text-xs">
                                                            <div className="flex items-center justify-between border-b border-slate-700 pb-1 font-bold text-sky-400">
                                                                <span>{item.full_label || item.label}</span>
                                                            </div>
                                                            <div className="space-y-1 text-[11px]">
                                                                <div className="flex items-center justify-between text-sky-300">
                                                                    <span>Ketepatan:</span>
                                                                    <span className="font-bold">{pct.toLocaleString('id-ID')}%</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-slate-300">
                                                                    <span>Tepat Waktu:</span>
                                                                    <span className="font-bold">{item.timely_count || 0} / {item.target_count || 496}</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 rotate-45 border-r border-b border-slate-700/50" />
                                                        </div>

                                                        <span className="text-[10px] font-extrabold text-slate-800 mb-1 group-hover:scale-110 transition-transform">
                                                            {pct > 0 ? pct.toLocaleString('id-ID') : '0'}
                                                        </span>
                                                        <div className="w-full max-w-[28px] bg-slate-100 rounded-t-sm flex items-end h-44 p-0.5">
                                                            <div
                                                                className={`w-full ${barHeight > 0 ? 'bg-blue-600 group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(37,99,235,0.8)]' : 'bg-slate-200'} rounded-t-sm transition-all duration-300 cursor-pointer`}
                                                                style={{ height: `${barHeight}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] font-bold text-slate-500 mt-2 truncate w-full text-center group-hover:text-blue-600 transition-colors">
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE SECTION 1: Detail Pengiriman SYNOP Berdasarkan Waktu - Summary Table */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-100/80 border-b p-4">
                                <CardTitle className="text-xl md:text-2xl font-black text-slate-900 text-center tracking-tight">
                                    Detail Pengiriman SYNOP Berdasarkan Waktu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="border-collapse w-full">
                                        <TableHeader className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead rowSpan={2} className="w-12 text-center border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    NO
                                                </TableHead>
                                                <TableHead rowSpan={2} className="text-left border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    JENIS BERITA
                                                </TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    TARGET
                                                </TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    TEPAT WAKTU
                                                </TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    TERLAMBAT
                                                </TableHead>
                                                <TableHead colSpan={2} className="text-center border-r border-slate-300 font-black text-xs uppercase text-slate-900">
                                                    LEBIH AWAL
                                                </TableHead>
                                                <TableHead colSpan={2} className="text-center font-black text-xs uppercase text-slate-900">
                                                    MISSING
                                                </TableHead>
                                            </TableRow>
                                            <TableRow className="hover:bg-transparent border-t border-slate-300">
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">(%)</TableHead>
                                                <TableHead className="text-center border-r border-slate-300 text-[11px] font-extrabold text-slate-800">Jumlah</TableHead>
                                                <TableHead className="text-center text-[11px] font-extrabold text-slate-800">(%)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-slate-200 font-mono text-xs">
                                            {/* Row 1: Utama & Penting */}
                                            <TableRow className="hover:bg-slate-50">
                                                <TableCell className="text-center font-bold border-r border-slate-200">1</TableCell>
                                                <TableCell className="font-sans font-bold border-r border-slate-200 text-slate-900">
                                                    SYNOP (Utama dan Penting)
                                                </TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.utamaSummary.target}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">100</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{dashboardStats.utamaSummary.timely}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{dashboardStats.utamaSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-rose-600">{dashboardStats.utamaSummary.late}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-rose-600">{dashboardStats.utamaSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.utamaSummary.early}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.utamaSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold text-slate-500">{dashboardStats.utamaSummary.missing}</TableCell>
                                                <TableCell className="text-center font-semibold text-slate-500">{dashboardStats.utamaSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>

                                            {/* Row 2: Jam Sela */}
                                            <TableRow className="hover:bg-slate-50">
                                                <TableCell className="text-center font-bold border-r border-slate-200">2</TableCell>
                                                <TableCell className="font-sans font-bold border-r border-slate-200 text-slate-900">
                                                    SYNOP (Jam Sela)
                                                </TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.selaSummary.target}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">100</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{dashboardStats.selaSummary.timely}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{dashboardStats.selaSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-rose-600">{dashboardStats.selaSummary.late}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-bold text-rose-600">{dashboardStats.selaSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.selaSummary.early}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold">{dashboardStats.selaSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200 font-semibold text-slate-500">{dashboardStats.selaSummary.missing}</TableCell>
                                                <TableCell className="text-center font-semibold text-slate-500">{dashboardStats.selaSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>

                                            {/* Row Total */}
                                            <TableRow className="bg-slate-100 font-black border-t-2 border-slate-400">
                                                <TableCell colSpan={2} className="text-center font-sans font-black border-r border-slate-300 text-slate-900 uppercase">
                                                    JUMLAH
                                                </TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.target}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">100</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.totalSummary.timely}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.totalSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.totalSummary.late}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.totalSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.early}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300">{dashboardStats.totalSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-center border-r border-slate-300 text-slate-700">{dashboardStats.totalSummary.missing}</TableCell>
                                                <TableCell className="text-center text-slate-700">{dashboardStats.totalSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* TABLE SECTION 2 & 3: Breakdown Slot Jam (Images 1 bottom & 2) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Table Breakdown: SYNOP Utama & Penting (8 Slot) */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rincian SYNOP Utama &amp; Penting (8 Slot Jam)</span>
                                        <Badge className="bg-amber-500 text-slate-900 font-bold">00, 03, 06, 09, 12, 15, 18, 21 UTC</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table className="border-collapse w-full">
                                            <TableHeader className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead rowSpan={2} className="w-10 text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">NO</TableHead>
                                                    <TableHead rowSpan={2} className="text-left border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">WAKTU PENGIRIMAN</TableHead>
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
                                                {dashboardStats.bySlotHourUtama.map((st, idx) => (
                                                    <TableRow key={st.hour} className="hover:bg-slate-50">
                                                        <TableCell className="text-center font-bold border-r border-slate-200">{idx + 1}</TableCell>
                                                        <TableCell className="font-sans font-bold border-r border-slate-200 text-slate-900">{st.label}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">{st.target}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">100</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely_pct.toLocaleString('id-ID')}</TableCell>

                                                        {/* Red Highlight Cell if Late > 0 */}
                                                        <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-red-600 text-white font-black' : 'text-slate-700'}`}>
                                                            {st.late}
                                                        </TableCell>
                                                        <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-red-600 text-white font-black' : 'text-slate-700'}`}>
                                                            {st.late_pct.toLocaleString('id-ID')}
                                                        </TableCell>

                                                        <TableCell className="text-center border-r border-slate-200">{st.early}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">{st.early_pct.toLocaleString('id-ID')}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 text-slate-500">{st.missing}</TableCell>
                                                        <TableCell className="text-center text-slate-500">{st.missing_pct.toLocaleString('id-ID')}</TableCell>
                                                    </TableRow>
                                                ))}

                                                {/* Total Row */}
                                                <TableRow className="bg-slate-100 font-black border-t-2 border-slate-300">
                                                    <TableCell colSpan={2} className="text-center font-sans font-black border-r border-slate-300 text-slate-900 uppercase">JUMLAH</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.utamaSummary.target}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">100</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.utamaSummary.timely}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.utamaSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.utamaSummary.late}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.utamaSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.utamaSummary.early}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.utamaSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-slate-700">{dashboardStats.utamaSummary.missing}</TableCell>
                                                    <TableCell className="text-center text-slate-700">{dashboardStats.utamaSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Table Breakdown: SYNOP Jam Sela (16 Slot) */}
                            <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rincian SYNOP Jam Sela (16 Slot Jam)</span>
                                        <Badge className="bg-sky-500 text-slate-900 font-bold">16 Slot Jam UTC</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto max-h-[520px]">
                                        <Table className="border-collapse w-full">
                                            <TableHeader className="bg-slate-200 text-slate-900 border-b border-slate-300 sticky top-0 z-10">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead rowSpan={2} className="w-10 text-center border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">NO</TableHead>
                                                    <TableHead rowSpan={2} className="text-left border-r border-slate-300 font-black text-[11px] uppercase text-slate-900">WAKTU PENGIRIMAN</TableHead>
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
                                                {dashboardStats.bySlotHourSela.map((st, idx) => (
                                                    <TableRow key={st.hour} className="hover:bg-slate-50">
                                                        <TableCell className="text-center font-bold border-r border-slate-200">{idx + 1}</TableCell>
                                                        <TableCell className="font-sans font-bold border-r border-slate-200 text-slate-900">{st.label}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">{st.target}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">100</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 font-bold text-emerald-700">{st.timely_pct.toLocaleString('id-ID')}</TableCell>

                                                        {/* Red Highlight Cell if Late > 0 */}
                                                        <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-red-600 text-white font-black' : 'text-slate-700'}`}>
                                                            {st.late}
                                                        </TableCell>
                                                        <TableCell className={`text-center border-r border-slate-200 font-bold ${st.late > 0 ? 'bg-red-600 text-white font-black' : 'text-slate-700'}`}>
                                                            {st.late_pct.toLocaleString('id-ID')}
                                                        </TableCell>

                                                        <TableCell className="text-center border-r border-slate-200">{st.early}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200">{st.early_pct.toLocaleString('id-ID')}</TableCell>
                                                        <TableCell className="text-center border-r border-slate-200 text-slate-500">{st.missing}</TableCell>
                                                        <TableCell className="text-center text-slate-500">{st.missing_pct.toLocaleString('id-ID')}</TableCell>
                                                    </TableRow>
                                                ))}

                                                {/* Total Row */}
                                                <TableRow className="bg-slate-100 font-black border-t-2 border-slate-300">
                                                    <TableCell colSpan={2} className="text-center font-sans font-black border-r border-slate-300 text-slate-900 uppercase">JUMLAH</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.selaSummary.target}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">100</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.selaSummary.timely}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-emerald-800">{dashboardStats.selaSummary.timely_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.selaSummary.late}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-rose-700">{dashboardStats.selaSummary.late_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.selaSummary.early}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300">{dashboardStats.selaSummary.early_pct.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-300 text-slate-700">{dashboardStats.selaSummary.missing}</TableCell>
                                                    <TableCell className="text-center text-slate-700">{dashboardStats.selaSummary.missing_pct.toLocaleString('id-ID')}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* TABLE SECTION 4: Detail Rincian SYNOP Terlambat, Lebih Awal, atau Missing */}
                        {(() => {
                            const sinopAnomalies = dashboardStats.anomalyRecords || [];
                            const sinopMissing = sinopAnomalies.filter((r) => r.status === 'missing');
                            const sinopLate = sinopAnomalies.filter((r) => r.status === 'terlambat');
                            const sinopEarly = sinopAnomalies.filter((r) => r.status === 'lebih_awal');

                            const displayedAnomalies =
                                anomalyTab === 'missing'
                                    ? sinopMissing
                                    : anomalyTab === 'terlambat'
                                        ? sinopLate
                                        : anomalyTab === 'lebih_awal'
                                            ? sinopEarly
                                            : sinopAnomalies;

                            return (
                                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                                Rincian Sandi SYNOP Evaluasi Monitoring GTS
                                            </CardTitle>

                                            {/* Sub-tabs for Missing, Terlambat, Lebih Awal */}
                                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('all')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${anomalyTab === 'all'
                                                        ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                                                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    Semua ({sinopAnomalies.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('missing')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${anomalyTab === 'missing'
                                                        ? 'bg-rose-600 text-white shadow-md font-black'
                                                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    Missing ({sinopMissing.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('terlambat')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${anomalyTab === 'terlambat'
                                                        ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    Terlambat ({sinopLate.length})
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => setAnomalyTab('lebih_awal')}
                                                    className={`h-7 px-3 text-xs font-bold rounded-lg transition-all ${anomalyTab === 'lebih_awal'
                                                        ? 'bg-blue-500 text-white shadow-md font-black'
                                                        : 'bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50'
                                                        }`}
                                                >
                                                    Lebih Awal ({sinopEarly.length})
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
                                                        ? `Seluruh pengiriman berita SYNOP pada bulan ${NAMA_BULAN[bulan - 1]} ${tahun} 100% Tepat Waktu.`
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
                                    Daftar Pengamatan Sinoptik ({NAMA_BULAN[bulan - 1]} {tahun})
                                </CardTitle>

                                {/* Sort & Filter Control Bar */}
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
                                                <SelectValue placeholder="Semua Observer" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white max-h-60">
                                                <SelectItem value="ALL">Semua Observer</SelectItem>
                                                {availableObservers.map((obs) => (
                                                    <SelectItem key={obs} value={obs}>
                                                        {obs}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                        <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                            <ArrowDownUp className="h-3.5 w-3.5 text-indigo-600" /> Urutan:
                                        </span>
                                        <Select
                                            value={sortOrder}
                                            onValueChange={(val) => handleFilterChange({ newSortOrder: val })}
                                        >
                                            <SelectTrigger className="w-[160px] h-8 text-xs bg-white border-slate-200">
                                                <SelectValue placeholder="Urutan Tanggal" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="desc">Terbaru → Terlama</SelectItem>
                                                <SelectItem value="asc">Terlama → Terbaru</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                        <span className="font-semibold text-slate-600 whitespace-nowrap">Baris:</span>
                                        <Select
                                            value={String(sinoptikRecords.per_page)}
                                            onValueChange={(val) => handleFilterChange({ newPerPage: Number(val) })}
                                        >
                                            <SelectTrigger className="w-[75px] h-8 text-xs bg-white border-slate-200">
                                                <SelectValue placeholder="10" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-100/70 border-b">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-12 text-center text-xs font-extrabold text-slate-700">No</TableHead>
                                            <TableHead className="w-48 text-xs font-extrabold text-slate-700">Waktu Data (UTC &amp; WIT)</TableHead>
                                            <TableHead className="w-40 text-center text-xs font-extrabold text-slate-700">Hasil Monitoring GTS</TableHead>
                                            <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">TT (°C)</TableHead>
                                            <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">RH (%)</TableHead>
                                            <TableHead className="w-28 text-center text-xs font-extrabold text-slate-700">QFF (hPa)</TableHead>
                                            <TableHead className="w-32 text-center text-xs font-extrabold text-slate-700">Angin (dd/ff)</TableHead>
                                            <TableHead className="text-xs font-extrabold text-slate-700">Raw Sandi AAXX</TableHead>
                                            <TableHead className="w-44 text-xs font-extrabold text-slate-700">Observer / Sender</TableHead>
                                            <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-slate-100">
                                        {recordsList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-12 text-slate-500">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Info className="h-8 w-8 text-slate-300" />
                                                        <p className="font-semibold text-slate-700">Tidak Ada Data Sinoptik</p>
                                                        <p className="text-xs text-slate-400">
                                                            Belum ada data Sinoptik terdata untuk periode bulan {NAMA_BULAN[bulan - 1]} {tahun}.
                                                        </p>
                                                        <Button
                                                            onClick={handleSync}
                                                            disabled={isSyncing}
                                                            size="sm"
                                                            className="mt-2 bg-amber-600 hover:bg-amber-700 text-white gap-2"
                                                        >
                                                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                                            Sinkronkan dari BMKGSoft
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recordsList.map((item, idx) => {
                                                const recordIndex = ((sinoptikRecords.current_page || 1) - 1) * (sinoptikRecords.per_page || 10) + idx + 1;
                                                const dt = formatDateTimeDisplay(item.data_timestamp);

                                                return (
                                                    <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <TableCell className="text-center font-mono text-xs font-semibold text-slate-400">
                                                            {recordIndex}
                                                        </TableCell>

                                                        <TableCell className="whitespace-nowrap">
                                                            <div className="flex flex-col text-xs">
                                                                <span className="font-bold text-slate-900">{dt.topUtc}</span>
                                                                <span className="text-[11px] font-medium text-slate-500">{dt.bottomWit}</span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Monitoring GTS Status Column */}
                                                        <TableCell className="text-center whitespace-nowrap">
                                                            {item.monitoring_status === 'tepat_waktu' ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Tepat Waktu
                                                                </Badge>
                                                            ) : item.monitoring_status === 'terlambat' ? (
                                                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200">
                                                                    <Clock className="h-3 w-3 mr-1 text-amber-600" /> Terlambat {item.delay_minutes ?? 0} mnt
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                                                                    Missing
                                                                </Badge>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-center font-mono text-xs font-bold text-amber-700">
                                                            {item.temp_drybulb !== null ? `${item.temp_drybulb}°C` : '-'}
                                                        </TableCell>

                                                        <TableCell className="text-center font-mono text-xs font-bold text-blue-700">
                                                            {item.humidity !== null ? `${item.humidity}%` : '-'}
                                                        </TableCell>

                                                        <TableCell className="text-center font-mono text-xs font-bold text-slate-800">
                                                            {item.pressure_qff !== null ? item.pressure_qff : '-'}
                                                        </TableCell>

                                                        <TableCell className="text-center font-mono text-xs">
                                                            {item.wind_dir !== null || item.wind_speed !== null ? (
                                                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300">
                                                                    {item.wind_dir ?? 0}° / {item.wind_speed ?? 0}kt
                                                                </Badge>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="font-mono text-xs max-w-[320px]">
                                                            <p className="truncate bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
                                                                {item.sandi || '-'}
                                                            </p>
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="flex flex-col text-xs">
                                                                {item.pegawai ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                                                        <span className="font-bold text-slate-900">{item.pegawai.nama}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="font-bold text-slate-900">{item.observer_name || '-'}</span>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedSinoptik(item)}
                                                                className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1 text-amber-600" /> Detail
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Section */}
                            {sinoptikRecords.total > 0 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50/50">
                                    <div className="text-xs text-slate-500">
                                        Menampilkan <span className="font-semibold text-slate-700">{sinoptikRecords.from || 0}</span> sampai{' '}
                                        <span className="font-semibold text-slate-700">{sinoptikRecords.to || 0}</span> dari{' '}
                                        <span className="font-semibold text-slate-700">{sinoptikRecords.total}</span> data pengamatan
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {sinoptikRecords.links.map((link, key) => {
                                            let label = link.label;
                                            if (label.includes('&laquo;') || label.includes('Previous')) {
                                                label = 'Prev';
                                            } else if (label.includes('&raquo;') || label.includes('Next')) {
                                                label = 'Next';
                                            }

                                            return link.url ? (
                                                <Button
                                                    key={key}
                                                    variant={link.active ? 'default' : 'outline'}
                                                    size="sm"
                                                    className={`h-8 min-w-[32px] text-xs px-2.5 ${link.active
                                                        ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                    onClick={() => router.get(link.url!, {}, { preserveState: true })}
                                                >
                                                    {label}
                                                </Button>
                                            ) : (
                                                <span
                                                    key={key}
                                                    className="h-8 min-w-[32px] px-2.5 flex items-center justify-center text-xs text-slate-400 border border-slate-100 rounded-md bg-slate-50 cursor-not-allowed"
                                                >
                                                    {label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modal Detail Sandi Sinoptik */}
            <Dialog open={!!selectedSinoptik} onOpenChange={() => setSelectedSinoptik(null)}>
                <DialogContent className="max-w-2xl bg-white border-slate-200">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Sun className="h-5 w-5 text-amber-600" />
                            Detail Pengamatan Sinoptik (AAXX)
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSinoptik && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-slate-500 font-medium">Waktu Pengamatan</p>
                                    <p className="font-bold text-slate-900 mt-0.5">{formatDateTimeDisplay(selectedSinoptik.data_timestamp).topUtc}</p>
                                    <p className="text-[11px] text-slate-600">{formatDateTimeDisplay(selectedSinoptik.data_timestamp).bottomWit}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Status Monitoring GTS</p>
                                    <p className="font-bold mt-0.5">
                                        {selectedSinoptik.monitoring_status === 'tepat_waktu' ? (
                                            <span className="text-emerald-700">Tepat Waktu</span>
                                        ) : selectedSinoptik.monitoring_status === 'terlambat' ? (
                                            <span className="text-amber-700">Terlambat {selectedSinoptik.delay_minutes} mnt</span>
                                        ) : (
                                            <span className="text-slate-600">Missing</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Suhu Udara (TT / Tmax / Tmin)</p>
                                    <p className="font-bold text-amber-700 mt-0.5">
                                        {selectedSinoptik.temp_drybulb ?? '-'}°C / {selectedSinoptik.temp_max ?? '-'}°C / {selectedSinoptik.temp_min ?? '-'}°C
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Kelembapan (RH) &amp; Td</p>
                                    <p className="font-bold text-blue-700 mt-0.5">
                                        {selectedSinoptik.humidity ?? '-'}% ({selectedSinoptik.temp_dewpoint ?? '-'}°C Td)
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Tekanan Udara (QFF / QFE)</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedSinoptik.pressure_qff ?? '-'} hPa / {selectedSinoptik.pressure_qfe ?? '-'} hPa
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Observer Piket</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedSinoptik.pegawai?.nama || selectedSinoptik.observer_name || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Teknisi Piket</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedSinoptik.teknisi?.nama || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">PPNPN Piket</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedSinoptik.ppnpn?.nama || '-'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-700 mb-1.5">Isi Teks Sandi AAXX Sinoptik (Raw GTS):</p>
                                <div className="bg-slate-950 text-amber-400 font-mono text-xs p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                                    {selectedSinoptik.sandi || 'Sandi tidak tersedia'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Response Detail Result Sync BMKGSoft */}
            <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-white border-slate-200 p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-3 border-b bg-slate-50/50">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-amber-600" />
                            Rincian Response Sinkronisasi BMKGSoft Sinoptik
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                        {/* Summary Status Box */}
                        {syncResult ? (
                            <div className="p-4 rounded-xl border bg-slate-50 space-y-3">
                                <div className="flex items-start gap-3">
                                    {syncResult.success && syncResult.failed_count === 0 ? (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                    ) : syncResult.synced_count > 0 ? (
                                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">{syncResult.message}</p>
                                        {syncResult.error_reason && (
                                            <p className="text-slate-600 text-xs mt-1">{syncResult.error_reason}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-2 text-center font-medium">
                                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <span className="text-slate-500 block text-[11px]">Total Diterima</span>
                                        <span className="text-base font-black text-slate-900">{syncResult.total_fetched}</span>
                                    </div>
                                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 shadow-sm text-emerald-900">
                                        <span className="text-emerald-700 block text-[11px]">Sukses</span>
                                        <span className="text-base font-black text-emerald-700">{syncResult.synced_count}</span>
                                    </div>
                                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 shadow-sm text-rose-900">
                                        <span className="text-rose-700 block text-[11px]">Gagal / Warn</span>
                                        <span className="text-base font-black text-rose-700">{syncResult.failed_count}</span>
                                    </div>
                                </div>
                            </div>
                        ) : flashError ? (
                            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-1">
                                <p className="font-bold text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-rose-600" /> Gagal Koneksi / Server Error
                                </p>
                                <p className="text-xs text-rose-700">{flashError}</p>
                            </div>
                        ) : null}

                        {/* Filter Tabs for Response Details */}
                        {syncResult?.details && syncResult.details.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 text-xs">
                                        Log Rincian Record ({syncResult.details.length} Data)
                                    </span>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setSyncFilter('ALL')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${syncFilter === 'ALL'
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Semua ({syncResult.details.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSyncFilter('BERHASIL')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${syncFilter === 'BERHASIL'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Sukses ({syncResult.synced_count})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSyncFilter('GAGAL')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${syncFilter === 'GAGAL'
                                                ? 'bg-rose-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                        >
                                            Gagal ({syncResult.failed_count})
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                    {syncResult.details
                                        .filter((item) => {
                                            if (syncFilter === 'BERHASIL') return item.status === 'berhasil';
                                            if (syncFilter === 'GAGAL') return item.status === 'gagal';
                                            return true;
                                        })
                                        .map((item, index) => (
                                            <div
                                                key={index}
                                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${item.status === 'berhasil'
                                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                                    : 'bg-rose-50/50 border-rose-200 text-rose-950'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.status === 'berhasil' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                                                    )}
                                                    <div>
                                                        <span className="font-bold">{formatDateTimeDisplay(item.timestamp).topUtc}</span>
                                                        {item.observer && (
                                                            <span className="text-slate-500 ml-2">({item.observer})</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {item.reason && (
                                                    <span className="text-[11px] text-rose-600 font-medium">{item.reason}</span>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

SinoptikIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/sinoptik' },
            { title: 'Data Sinoptik', href: '/laporan/sinoptik' },
        ]}
    >
        {page}
    </AppLayout>
);

