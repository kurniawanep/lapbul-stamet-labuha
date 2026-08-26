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
    Sun,
    Thermometer,
    UserCheck,
    Wind,
    XCircle,
} from 'lucide-react';

interface Pegawai {
    id: number;
    nama: string;
}

interface DataFklimItem {
    id: number;
    station_id: number;
    station_name: string;
    alias_station_id: string | null;
    data_timestamp: string;
    source_data: string | null;
    tbk_0700: number | null;
    tbk_1300: number | null;
    tbk_1800: number | null;
    tbk_avg: number | null;
    t_max: number | null;
    t_min: number | null;
    rr_0700: number | null;
    ss_8: number | null;
    cu_khusus: string | null;
    pp_qfe: number | null;
    rh_0700: number | null;
    rh_1300: number | null;
    rh_1800: number | null;
    rh_avg: number | null;
    ff_avg: number | null;
    wd_cardinal: string | null;
    ff_max: number | null;
    wd_ff_max: string | null;
    observer_name: string | null;
    pegawai_id: number | null;
    pegawai?: Pegawai | null;
    teknisi_id?: number | null;
    teknisi?: Pegawai | null;
    ppnpn_id?: number | null;
    ppnpn?: Pegawai | null;
    qc_flag: number;
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
    fklimRecords: PaginatedResponse<DataFklimItem>;
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

export default function FklimIndex({
    fklimRecords,
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
    const [selectedFklim, setSelectedFklim] = useState<DataFklimItem | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);

    const syncResult = flash?.sync_result;
    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    useEffect(() => {
        if (syncResult || flashError || (flashSuccess && syncResult)) {
            setShowSyncModal(true);
        }
    }, [syncResult, flashError, flashSuccess]);

    const recordsList = fklimRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
    }) => {
        const obs = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const sOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const pPage = params.newPerPage !== undefined ? params.newPerPage : fklimRecords.per_page;

        router.get(
            '/laporan/fklim',
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
            '/laporan/fklim',
            {
                bulan: newBulan,
                tahun: newTahun,
                observer: observerFilter === 'ALL' ? undefined : observerFilter,
                sort_order: sortOrder,
                per_page: fklimRecords.per_page,
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
            '/laporan/fklim/sync',
            { bulan, tahun },
            {
                onFinish: () => {
                    setIsSyncing(false);
                },
            }
        );
    };

    const renderPagination = () => {
        if (!fklimRecords.links || fklimRecords.links.length <= 1) return null;

        return (
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                    Menampilkan {fklimRecords.from || 0} - {fklimRecords.to || 0} dari {totalRecords} data FKLIM
                </span>
                <div className="flex items-center gap-1">
                    {fklimRecords.links.map((link, idx) => {
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
            <Head title="Laporan Bulanan Data FKLIM - Stasion Meteorologi Labuha" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* TOP HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 p-6 rounded-3xl text-white shadow-xl border border-amber-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold px-3 py-1 text-xs shadow-md">
                                Data Iklim Harian (FKLIM)
                            </Badge>
                            <span className="text-xs text-amber-300 font-mono tracking-widest uppercase">
                                Stasion Meteorologi Kelas III Oesman Sadik (WAEL / 97460)
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Thermometer className="h-7 w-7 text-amber-400 animate-pulse" />
                            Laporan Bulanan Pengamatan FKLIM
                        </h1>

                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Rekapitulasi Kepatuhan &amp; Pengiriman Data Iklim Harian (1 Laporan / Hari).
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
                            className="h-10 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
                        </Button>

                        <a
                            href={`/laporan/fklim/export-excel?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                type="button"
                                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Excel FKLIM
                            </Button>
                        </a>
                    </div>
                </div>

                {/* VIEW SWITCH TABS */}
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
                        Dashboard Monitoring Kinerja FKLIM
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
                        Daftar Data Pengamatan FKLIM ({totalRecords})
                    </Button>
                </div>

                {/* TAB 1: DASHBOARD VIEW */}
                {activeTab === 'dashboard' && dashboardStats && (
                    <div className="space-y-6">
                        {/* DONUT CHART & KPI STAT CARDS */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-amber-400" />
                                        Ringkasan Kepatuhan &amp; Ketepatan Waktu Laporan FKLIM
                                    </span>
                                    <Badge className="bg-amber-500 text-white font-bold">
                                        {NAMA_BULAN[bulan - 1]} {tahun}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                    {/* Donut Chart */}
                                    <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="relative w-56 h-56 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="40" className="stroke-slate-200" strokeWidth="16" fill="transparent" />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    className="stroke-amber-600 transition-all duration-1000 ease-out"
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.summary.timely_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset="0"
                                                    fill="transparent"
                                                />
                                                <circle
                                                    cx="50" cy="50" r="40"
                                                    className="stroke-rose-400 transition-all duration-1000 ease-out"
                                                    strokeWidth="16"
                                                    strokeDasharray={`${(dashboardStats.summary.missing_pct / 100) * 251.2} 251.2`}
                                                    strokeDashoffset={`-${(dashboardStats.summary.timely_pct / 100) * 251.2}`}
                                                    fill="transparent"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                                <span className="text-3xl font-black text-amber-600 tracking-tight">
                                                    {dashboardStats.summary.target} Data
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                                    Total Target
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-6 mt-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-sm bg-amber-600" />
                                                <span className="text-xs font-bold text-slate-700">Terkirim</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-sm bg-rose-400" />
                                                <span className="text-xs font-bold text-slate-700">Missing</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metric Cards */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60 text-slate-700 leading-relaxed text-sm">
                                            <p className="font-medium">
                                                Pengiriman laporan iklim harian (FKLIM) pada periode{' '}
                                                <span className="font-bold text-slate-900">{NAMA_BULAN[bulan - 1]} {tahun}</span>{' '}
                                                mengevaluasi 1 laporan harian per hari untuk pencatatan suhu, curah hujan, penyinaran matahari, dan tekanan udara.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-amber-950">
                                                    {dashboardStats.summary.timely_pct.toLocaleString('id-ID')}%
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-amber-800">
                                                    <span>Terkirim</span>
                                                    <span className="text-amber-950 font-extrabold">{dashboardStats.summary.timely} Data</span>
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

                                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col justify-between">
                                                <span className="text-2xl font-black text-slate-950">
                                                    {dashboardStats.summary.target} Hari
                                                </span>
                                                <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700">
                                                    <span>Target Total</span>
                                                    <span className="text-slate-950 font-extrabold">100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* MONTHLY TREND CHART & MISS DATA LIST */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* CHART & TREND TABLE */}
                            <Card className="lg:col-span-8 border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rekap Pengiriman FKLIM {tahun}</span>
                                        <Badge className="bg-amber-400 text-slate-950 font-bold">Trend Bulanan</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {/* Grouped Bar Chart */}
                                    <div className="h-64 flex items-end justify-between gap-3 pt-8 pb-4 px-2 border-b border-slate-200">
                                        {dashboardStats.monthlyTrendReport.map((item, idx) => {
                                            const maxVal = 35;
                                            const targetHeight = Math.max(10, Math.min(100, (item.target / maxVal) * 100));
                                            const sentHeight = Math.max(10, Math.min(100, (item.sent / maxVal) * 100));

                                            return (
                                                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                                    <span className="text-[10px] font-black text-slate-800 mb-1">
                                                        {item.pct.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%
                                                    </span>

                                                    <div className="flex items-end gap-1 w-full justify-center">
                                                        <div
                                                            style={{ height: `${targetHeight}%` }}
                                                            className="w-1/2 max-w-[16px] bg-amber-200 rounded-t-sm shadow transition-all relative"
                                                            title={`Seharusnya: ${item.target}`}
                                                        />
                                                        <div
                                                            style={{ height: `${sentHeight}%` }}
                                                            className="w-1/2 max-w-[16px] bg-amber-600 rounded-t-sm shadow hover:bg-amber-700 transition-all relative"
                                                            title={`Terkirim: ${item.sent}`}
                                                        />
                                                    </div>

                                                    <span className="text-[11px] font-bold text-slate-600 mt-2 truncate w-full text-center">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Table Legend & Values */}
                                    <div className="overflow-x-auto">
                                        <Table className="border-collapse w-full text-xs">
                                            <TableBody>
                                                <TableRow className="bg-slate-50 font-bold border-b border-slate-200">
                                                    <TableCell className="w-28 font-sans text-slate-700 flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-amber-200 rounded-xs shrink-0" />
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
                                                        <div className="w-3 h-3 bg-amber-600 rounded-xs shrink-0" />
                                                        Terkirim
                                                    </TableCell>
                                                    {dashboardStats.monthlyTrendReport.map((item, idx) => (
                                                        <TableCell key={idx} className="text-center font-mono text-amber-900 font-extrabold">
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

                            {/* MISS DATA LIST CARD */}
                            <Card className="lg:col-span-4 border border-slate-200 shadow-md bg-white overflow-hidden">
                                <CardHeader className="bg-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span>Rincian Miss Data FKLIM {tahun}</span>
                                        <Badge className="bg-rose-600 text-white font-bold">Missing Count</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3 font-mono text-xs">
                                    {dashboardStats.monthlyTrendReport.map((item, idx) => {
                                        const fullMonthName = [
                                            'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
                                            'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
                                        ][idx] || item.label.toUpperCase();

                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                                    item.missing > 0
                                                        ? 'bg-rose-50/80 border-rose-200 text-rose-950 font-extrabold'
                                                        : 'bg-emerald-50/50 border-emerald-100 text-emerald-900 font-bold'
                                                }`}
                                            >
                                                <span className="tracking-tight">MISS DATA FKLIM {fullMonthName}</span>
                                                <span className="text-sm font-black tracking-wider">
                                                    = {item.missing} DATA
                                                </span>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ANOMALY TABLE */}
                        {(() => {
                            const fklimAnomalies = dashboardStats.anomalyRecords || [];

                            return (
                                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white p-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                                Rincian Miss Data FKLIM Evaluasi Kepatuhan GTS ({NAMA_BULAN[bulan - 1]} {tahun})
                                            </CardTitle>
                                            <Badge className="bg-rose-600 text-white font-bold">
                                                {fklimAnomalies.length} Missing Data
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {fklimAnomalies.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/50">
                                                <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-2" />
                                                <p className="font-extrabold text-emerald-950 text-base">
                                                    Tidak Ada Data Missing FKLIM!
                                                </p>
                                                <p className="text-xs text-emerald-800 mt-1">
                                                    Seluruh pengiriman laporan iklim FKLIM bulan {NAMA_BULAN[bulan - 1]} {tahun} 100% Terkirim.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <Table className="w-full">
                                                    <TableHeader className="bg-slate-100 border-b border-slate-200">
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableHead className="w-12 text-center text-xs font-black text-slate-800">NO</TableHead>
                                                            <TableHead className="w-48 text-left text-xs font-black text-slate-800">TANGGAL LAPORAN</TableHead>
                                                            <TableHead className="w-44 text-left text-xs font-black text-slate-800">JENIS LAPORAN</TableHead>
                                                            <TableHead className="w-44 text-center text-xs font-black text-slate-800">STATUS EVALUASI</TableHead>
                                                            <TableHead className="text-left text-xs font-black text-slate-800">OBSERVER / PENGAMAT</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody className="divide-y divide-slate-100 font-mono text-xs">
                                                        {fklimAnomalies.map((item, idx) => {
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
                                    Daftar Pengamatan Data FKLIM ({NAMA_BULAN[bulan - 1]} {tahun})
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
                                    <p className="font-bold text-slate-700 text-base">Tidak ada data FKLIM</p>
                                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                                        Tidak ditemukan data pengamatan FKLIM untuk periode {NAMA_BULAN[bulan - 1]} {tahun}.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="w-full">
                                        <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-12 text-center text-xs font-bold text-slate-800">NO</TableHead>
                                                <TableHead className="w-48 text-left text-xs font-bold text-slate-800">TANGGAL LAPORAN</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">SUHU AVG (°C)</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">T MAX / MIN (°C)</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">CH 07.00 (MM)</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">PENYINARAN (SS 8)</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">RH AVG (%)</TableHead>
                                                <TableHead className="text-center text-xs font-bold text-slate-800">ANGIN MAX</TableHead>
                                                <TableHead className="w-56 text-left text-xs font-bold text-slate-800">OBSERVER</TableHead>
                                                <TableHead className="w-16 text-center text-xs font-bold text-slate-800">AKSI</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody className="divide-y divide-slate-100 text-xs">
                                            {recordsList.map((item, idx) => {
                                                const rowNum = (fklimRecords.current_page - 1) * fklimRecords.per_page + idx + 1;
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
                                                        <TableCell className="text-center font-mono font-bold text-slate-900 border-r border-slate-100">
                                                            {item.tbk_avg !== null ? `${item.tbk_avg}°C` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-slate-700 border-r border-slate-100">
                                                            {item.t_max !== null ? `${item.t_max}°` : '-'} / {item.t_min !== null ? `${item.t_min}°` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-amber-900 border-r border-slate-100">
                                                            {item.rr_0700 !== null ? `${item.rr_0700} mm` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-slate-800 border-r border-slate-100">
                                                            {item.ss_8 !== null ? `${Math.round((item.ss_8 / 8) * 100)}% (${item.ss_8} j)` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-slate-900 border-r border-slate-100">
                                                            {item.rh_avg !== null ? `${item.rh_avg}%` : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-slate-700 border-r border-slate-100">
                                                            {item.ff_max !== null ? `${item.ff_max} kt (${item.wd_ff_max || '-'})` : '-'}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-slate-900 border-r border-slate-100">
                                                            {observerDisplay}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedFklim(item)}
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
            <Dialog open={!!selectedFklim} onOpenChange={() => setSelectedFklim(null)}>
                <DialogContent className="max-w-3xl bg-white border border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Thermometer className="h-5 w-5 text-amber-600" />
                            Detail Pengamatan Data FKLIM Harian
                        </DialogTitle>
                    </DialogHeader>

                    {selectedFklim && (
                        <div className="space-y-4 pt-2 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <span className="text-slate-500 block">Tanggal UTC</span>
                                    <span className="font-bold text-slate-900">{selectedFklim.data_timestamp}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Observer Piket</span>
                                    <span className="font-bold text-slate-900">{selectedFklim.pegawai?.nama || selectedFklim.observer_name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Teknisi Piket</span>
                                    <span className="font-bold text-slate-900">{selectedFklim.teknisi?.nama || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">PPNPN Piket</span>
                                    <span className="font-bold text-slate-900">{selectedFklim.ppnpn?.nama || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">QC Flag</span>
                                    <Badge className="bg-slate-200 text-slate-800 font-bold">{selectedFklim.qc_flag}</Badge>
                                </div>
                            </div>

                            {/* PARAMETER GROUPS */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Suhu */}
                                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 space-y-2">
                                    <span className="font-bold text-amber-950 block text-sm flex items-center gap-1.5">
                                        <Thermometer className="h-4 w-4 text-amber-600" /> Suhu Udara (°C)
                                    </span>
                                    <div className="space-y-1 font-mono">
                                        <div className="flex justify-between"><span>Suhu 07.00:</span> <strong>{selectedFklim.tbk_0700 ?? '-'} °C</strong></div>
                                        <div className="flex justify-between"><span>Suhu 13.00:</span> <strong>{selectedFklim.tbk_1300 ?? '-'} °C</strong></div>
                                        <div className="flex justify-between"><span>Suhu 18.00:</span> <strong>{selectedFklim.tbk_1800 ?? '-'} °C</strong></div>
                                        <div className="flex justify-between border-t border-amber-200 pt-1"><span>Rata-Rata:</span> <strong>{selectedFklim.tbk_avg ?? '-'} °C</strong></div>
                                        <div className="flex justify-between"><span>Maksimum:</span> <strong>{selectedFklim.t_max ?? '-'} °C</strong></div>
                                        <div className="flex justify-between"><span>Minimum:</span> <strong>{selectedFklim.t_min ?? '-'} °C</strong></div>
                                    </div>
                                </div>

                                {/* Kelembaban & Hujan */}
                                <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/60 space-y-2">
                                    <span className="font-bold text-sky-950 block text-sm flex items-center gap-1.5">
                                        <CloudRain className="h-4 w-4 text-sky-600" /> RH &amp; Curah Hujan
                                    </span>
                                    <div className="space-y-1 font-mono">
                                        <div className="flex justify-between"><span>RH 07.00:</span> <strong>{selectedFklim.rh_0700 ?? '-'} %</strong></div>
                                        <div className="flex justify-between"><span>RH 13.00:</span> <strong>{selectedFklim.rh_1300 ?? '-'} %</strong></div>
                                        <div className="flex justify-between"><span>RH 18.00:</span> <strong>{selectedFklim.rh_1800 ?? '-'} %</strong></div>
                                        <div className="flex justify-between border-t border-sky-200 pt-1"><span>RH Rata-Rata:</span> <strong>{selectedFklim.rh_avg ?? '-'} %</strong></div>
                                        <div className="flex justify-between"><span>CH 07.00:</span> <strong>{selectedFklim.rr_0700 ?? '-'} mm</strong></div>
                                        <div className="flex justify-between"><span>Penyinaran SS8:</span> <strong>{selectedFklim.ss_8 !== null ? `${Math.round((selectedFklim.ss_8 / 8) * 100)}% (${selectedFklim.ss_8} jam)` : '-'}</strong></div>
                                    </div>
                                </div>

                                {/* Angin & Tekanan */}
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                    <span className="font-bold text-slate-900 block text-sm flex items-center gap-1.5">
                                        <Wind className="h-4 w-4 text-slate-600" /> Angin &amp; Tekanan
                                    </span>
                                    <div className="space-y-1 font-mono">
                                        <div className="flex justify-between"><span>Kecepatan Rata-rata:</span> <strong>{selectedFklim.ff_avg ?? '-'} km/jam</strong></div>
                                        <div className="flex justify-between"><span>Arah Terbanyak:</span> <strong>{selectedFklim.wd_cardinal ?? '-'}</strong></div>
                                        <div className="flex justify-between"><span>Kecepatan Maksimum:</span> <strong>{selectedFklim.ff_max ?? '-'} kt</strong></div>
                                        <div className="flex justify-between"><span>Arah Maksimum:</span> <strong>{selectedFklim.wd_ff_max ?? '-'}</strong></div>
                                        <div className="flex justify-between border-t border-slate-200 pt-1"><span>Tekanan QFE:</span> <strong>{selectedFklim.pp_qfe ?? '-'} hPa</strong></div>
                                    </div>
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
                            Hasil Sinkronisasi Data FKLIM
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

FklimIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/fklim' },
            { title: 'Data FKLIM', href: '/laporan/fklim' },
        ]}
    >
        {page}
    </AppLayout>
);
