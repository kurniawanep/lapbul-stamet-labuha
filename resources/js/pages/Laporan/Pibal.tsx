import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
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
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Compass,
    Download,
    Eye,
    FileSpreadsheet,
    Filter,
    Info,
    RefreshCw,
    Sparkles,
    UserCheck,
    Wind,
    XCircle,
} from 'lucide-react';

interface Pegawai {
    id: number;
    nama: string;
}

interface DataPibalItem {
    id: number;
    station_id: number;
    station_name: string;
    data_timestamp: string;
    observer_name: string | null;
    pegawai_id: number | null;
    pegawai?: Pegawai | null;
    wind_dir_surface: number | null;
    wind_speed_surface: number | null;
    station_elevation: string | null;
    sandi_pibal: string | null;
    penghentian_pengamatan: string | null;
    pembacaan_azimuth_elevasi: Record<string, { azimuth: string; elevasi: string }> | null;
    hasil_lapisan_wd_ws_dddff: Record<string, { lapisan: number; wd: number; ws: number; dddff: string }> | null;
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

interface SyncResult {
    success: boolean;
    synced_count: number;
    failed_count: number;
    total_fetched: number;
    message: string;
    error_reason?: string | null;
    details?: SyncDetailItem[];
}

interface Props {
    pibalRecords: PaginatedResponse<DataPibalItem>;
    bulan: number;
    tahun: number;
    daysInMonth: number;
    totalRecords: number;
    sortOrder?: string;
    observerFilter?: string;
    reasonFilter?: string;
    availableObservers?: string[];
    availableReasons?: string[];
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

export default function PibalIndex({
    pibalRecords,
    bulan,
    tahun,
    daysInMonth,
    totalRecords,
    sortOrder = 'desc',
    observerFilter = 'ALL',
    reasonFilter = 'ALL',
    availableObservers = [],
    availableReasons = [],
}: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
            sync_result?: SyncResult;
        }
    }>().props;

    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedPibal, setSelectedPibal] = useState<DataPibalItem | null>(null);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncFilter, setSyncFilter] = useState<'ALL' | 'BERHASIL' | 'GAGAL'>('ALL');

    const syncResult = flash?.sync_result;
    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    // Automatically open sync result modal when sync completes
    useEffect(() => {
        if (syncResult || flashError || (flashSuccess && syncResult)) {
            setShowSyncModal(true);
        }
    }, [syncResult, flashError, flashSuccess]);

    const recordsList = pibalRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newReason?: string;
        newSortOrder?: string;
        newPerPage?: number;
        newBulan?: number;
        newTahun?: number;
    }) => {
        const activeObserver = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const activeReason = params.newReason !== undefined ? params.newReason : reasonFilter;
        const activeSortOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const activePerPage = params.newPerPage !== undefined ? params.newPerPage : pibalRecords.per_page;
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
        if (activeReason && activeReason !== 'ALL') {
            queryData.reason = activeReason;
        }

        router.get('/laporan/pibal', queryData, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/pibal/sync', { bulan, tahun }, {
            preserveScroll: true,
            onSuccess: () => setShowSyncModal(true),
            onError: () => setShowSyncModal(true),
            onFinish: () => setIsSyncing(false),
        });
    };

    const filteredDetails = (syncResult?.details || []).filter((item) => {
        if (syncFilter === 'BERHASIL') return item.status === 'berhasil';
        if (syncFilter === 'GAGAL') return item.status === 'gagal';
        return true;
    });

    return (
        <>
            <Head title="Laporan Bulanan - Data PIBAL BMKG" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* Flash Banner Result Notification if active */}
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
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1 text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> BMKGSoft Synchronizer
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                Stasiun Meteorologi Oesman Sadik
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                            <Wind className="h-7 w-7 text-cyan-400 animate-pulse" />
                            Data Pengamatan PIBAL (Upper Air)
                        </h1>
                        <p className="text-blue-200/80 text-sm">
                            Integrasi Otomatis BMKGSoft API &amp; Rekap Kinerja Bulanan Pengamatan Angin Lapisan Atas
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

                        {/* Export Lapbul PIBAL (.xlsx) Button */}
                        <a
                            href={`/laporan/pibal/export-lapbul?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/30"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Lapbul PIBAL (.xlsx)
                            </Button>
                        </a>

                        {/* Export Form Ae.31 Button */}
                        <a
                            href={`/laporan/pibal/export-ae31?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button
                                variant="outline"
                                className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Form Ae.31 (.xlsx)
                            </Button>
                        </a>

                        {/* Sync Button */}
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-2 shadow-lg shadow-cyan-900/30"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan BMKGSoft'}
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Total Pengamatan PIBAL
                            </CardTitle>
                            <Activity className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900">{totalRecords} Records</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Data terdata bulan {NAMA_BULAN[bulan - 1]} {tahun}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Stasiun &amp; Kode WMO
                            </CardTitle>
                            <Compass className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900">97460 / WAEL</div>
                            <p className="text-xs text-slate-500 mt-1">Stamet Oesman Sadik Halmahera Selatan</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Export Master Lapbul (.xlsx)
                            </CardTitle>
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-emerald-700">6 Sheet Terisi Otomatis</div>
                            <p className="text-xs text-slate-500 mt-1">Rekap, Ae.31, Me.39/40 (00&amp;12z), Ae.39 (00&amp;12z)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* PIBAL Records Table Card */}
                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Daftar Pengamatan PIBAL ({NAMA_BULAN[bulan - 1]} {tahun})
                            </CardTitle>

                            {/* Sort & Filter Control Bar */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {/* Filter Observer */}
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                        <Filter className="h-3.5 w-3.5 text-blue-600" /> Observer:
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

                                {/* Filter Alasan Penghentian */}
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-600 whitespace-nowrap">Alasan:</span>
                                    <Select
                                        value={reasonFilter}
                                        onValueChange={(val) => handleFilterChange({ newReason: val })}
                                    >
                                        <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-slate-200">
                                            <SelectValue placeholder="Semua Alasan" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white max-h-60">
                                            <SelectItem value="ALL">Semua Alasan</SelectItem>
                                            {availableReasons.map((rsn) => (
                                                <SelectItem key={rsn} value={rsn}>
                                                    {rsn}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sort Order Dropdown (Timestamp Ascending / Descending) */}
                                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                    <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                        <ArrowDownUp className="h-3.5 w-3.5 text-indigo-600" /> Urutan:
                                    </span>
                                    <Select
                                        value={sortOrder}
                                        onValueChange={(val) => handleFilterChange({ newSortOrder: val })}
                                    >
                                        <SelectTrigger className="w-[125px] h-8 text-xs bg-white border-slate-200">
                                            <SelectValue placeholder="Descending" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="desc">Descending</SelectItem>
                                            <SelectItem value="asc">Ascending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Per Page Selector */}
                                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                    <span className="text-slate-500 whitespace-nowrap">Tampilkan:</span>
                                    <Select
                                        value={String(pibalRecords.per_page || 10)}
                                        onValueChange={(val) => handleFilterChange({ newPerPage: Number(val) })}
                                    >
                                        <SelectTrigger className="w-[70px] h-8 text-xs bg-white border-slate-200">
                                            <SelectValue placeholder="10" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {[10, 25, 50, 100].map((num) => (
                                                <SelectItem key={num} value={String(num)}>
                                                    {num}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="w-full text-xs">
                            <TableHeader>
                                <TableRow className="bg-slate-100/80">
                                    <TableHead className="w-12 text-center font-bold text-slate-700">No</TableHead>
                                    <TableHead className="font-bold text-slate-700">Waktu Pengamatan</TableHead>
                                    <TableHead className="font-bold text-slate-700">Observer (Pengamat)</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">Angin Permukaan</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700">Alasan Penghentian</TableHead>
                                    <TableHead className="font-bold text-slate-700">Ringkasan Sandi Pibal</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700 w-24">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recordsList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                                            Belum ada data PIBAL yang sesuai dengan filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recordsList.map((item, idx) => {
                                        const { topUtc, bottomWit } = formatDateTimeDisplay(item.data_timestamp);
                                        const itemNumber = (pibalRecords.from || 1) + idx;

                                        return (
                                            <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="text-center font-medium text-slate-500">
                                                    {itemNumber}
                                                </TableCell>

                                                <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                                                    <div className="text-blue-900 font-bold">{topUtc}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        {bottomWit}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                                                        {item.observer_name || item.pegawai?.nama || 'Unassigned'}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center font-mono font-semibold text-slate-700">
                                                    {item.wind_dir_surface !== null && item.wind_speed_surface !== null ? (
                                                        <span>{item.wind_dir_surface}° / {item.wind_speed_surface} kt</span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    {item.penghentian_pengamatan ? (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px]">
                                                            {item.penghentian_pengamatan}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px]">
                                                            Normal
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell className="max-w-md truncate font-mono text-[11px] text-slate-600">
                                                    {item.sandi_pibal ? (
                                                        item.sandi_pibal.split('\n')[0]
                                                    ) : (
                                                        <span className="text-slate-400 font-normal">Tidak ada sandi</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedPibal(item)}
                                                        className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> Detail
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    {/* Pagination Bar */}
                    {pibalRecords.total > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t text-xs text-slate-600">
                            <div>
                                Menampilkan <strong className="text-slate-900">{pibalRecords.from || 0}</strong> - <strong className="text-slate-900">{pibalRecords.to || 0}</strong> dari <strong className="text-slate-900">{pibalRecords.total}</strong> data PIBAL
                            </div>

                            <div className="flex items-center gap-1.5">
                                {pibalRecords.links.map((link, idx) => {
                                    const isPrev = link.label.includes('Previous') || link.label.includes('&laquo;');
                                    const isNext = link.label.includes('Next') || link.label.includes('&raquo;');

                                    let labelContent: React.ReactNode = link.label
                                        .replace('&laquo; Previous', '')
                                        .replace('Next &raquo;', '');

                                    if (isPrev) labelContent = <ChevronLeft className="h-4 w-4" />;
                                    if (isNext) labelContent = <ChevronRight className="h-4 w-4" />;

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={idx}
                                                className="px-2.5 py-1 rounded-md text-slate-300 border border-slate-200 cursor-not-allowed text-xs"
                                            >
                                                {labelContent}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={idx}
                                            href={link.url}
                                            preserveScroll
                                            preserveState
                                            className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
                                                link.active
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {labelContent}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Sync Result Response Dialog Modal */}
            {(syncResult || flashError || flashSuccess) && (
                <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-cyan-600" />
                                Response Hasil Sinkronisasi BMKGSoft
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 text-xs">
                            {/* API Error Connection Banner */}
                            {flashError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
                                    <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-sm text-rose-900">Sinkronisasi Gagal</h4>
                                        <p className="mt-1 text-xs">{flashError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Response Result Summary Cards */}
                            {syncResult && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                                            <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total Data Diterima</span>
                                            <span className="text-xl font-extrabold text-slate-900">{syncResult.total_fetched} Records</span>
                                        </div>

                                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                            <span className="text-emerald-700 font-semibold uppercase text-[10px] block flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Status Berhasil
                                            </span>
                                            <span className="text-xl font-extrabold text-emerald-800">{syncResult.synced_count} Records</span>
                                        </div>

                                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                                            <span className="text-rose-700 font-semibold uppercase text-[10px] block flex items-center gap-1">
                                                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Status Gagal / Kendala
                                            </span>
                                            <span className="text-xl font-extrabold text-rose-800">{syncResult.failed_count} Records</span>
                                        </div>
                                    </div>

                                    {/* Overall Message Banner */}
                                    <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                                        syncResult.failed_count > 0 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    }`}>
                                        <Info className="h-4 w-4 flex-shrink-0" />
                                        <span>{syncResult.message}</span>
                                    </div>

                                    {/* Sync Details Table with Filter */}
                                    {syncResult.details && syncResult.details.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                                    <Activity className="h-4 w-4 text-blue-600" /> Rincian Status Per Data:
                                                </h4>

                                                {/* Filter buttons */}
                                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                                    <button
                                                        onClick={() => setSyncFilter('ALL')}
                                                        className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                                                            syncFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                    >
                                                        Semua ({syncResult.details.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setSyncFilter('BERHASIL')}
                                                        className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                                                            syncFilter === 'BERHASIL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-900'
                                                        }`}
                                                    >
                                                        Berhasil ({syncResult.synced_count})
                                                    </button>
                                                    <button
                                                        onClick={() => setSyncFilter('GAGAL')}
                                                        className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors ${
                                                            syncFilter === 'GAGAL' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:text-rose-900'
                                                        }`}
                                                    >
                                                        Gagal ({syncResult.failed_count})
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="border rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                                                <Table className="text-xs">
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-100">
                                                            <TableHead className="font-bold text-slate-700">Waktu (UTC)</TableHead>
                                                            <TableHead className="font-bold text-slate-700">Observer</TableHead>
                                                            <TableHead className="text-center font-bold text-slate-700 w-28">Status</TableHead>
                                                            <TableHead className="font-bold text-slate-700">Alasan Gagal / Catatan</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredDetails.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                                                                    Tidak ada item rincian pada kategori ini.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            filteredDetails.map((item, idx) => (
                                                                <TableRow key={idx} className="hover:bg-slate-50">
                                                                    <TableCell className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                                                                        {formatDateTimeDisplay(item.timestamp).topUtc}
                                                                    </TableCell>
                                                                    <TableCell className="font-medium text-slate-700">
                                                                        {item.observer || 'Unassigned'}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        {item.status === 'berhasil' ? (
                                                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-[10px]">
                                                                                <CheckCircle2 className="h-3 w-3" /> Berhasil
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[10px]">
                                                                                <XCircle className="h-3 w-3" /> Gagal
                                                                            </Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-slate-600 font-medium">
                                                                        {item.reason ? (
                                                                            <span className="text-rose-700 font-semibold flex items-center gap-1">
                                                                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {item.reason}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-emerald-600 font-medium">Data tersinkron sempurna</span>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-end pt-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSyncModal(false)}
                                    className="bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                                >
                                    Tutup Response
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Detail Modal Dialog */}
            {selectedPibal && (
                <Dialog open={Boolean(selectedPibal)} onOpenChange={() => setSelectedPibal(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wind className="h-5 w-5 text-blue-600" />
                                Detail Pengamatan PIBAL - {formatDateTimeDisplay(selectedPibal.data_timestamp).topUtc}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 text-xs">
                            {/* Summary Metadata */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Observer</span>
                                    <span className="font-bold text-slate-900">{selectedPibal.observer_name || 'Unassigned'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Angin Permukaan</span>
                                    <span className="font-bold text-slate-900">{selectedPibal.wind_dir_surface}° / {selectedPibal.wind_speed_surface} kt</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Penghentian</span>
                                    <span className="font-bold text-amber-700">{selectedPibal.penghentian_pengamatan || 'Selesai Normal'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Waktu WIT</span>
                                    <span className="font-bold text-slate-900">{formatDateTimeDisplay(selectedPibal.data_timestamp).bottomWit}</span>
                                </div>
                            </div>

                            {/* Raw Sandi Pibal */}
                            <div>
                                <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                                    <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Teks Sandi Pibal GTS
                                </h4>
                                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-slate-800">
                                    {selectedPibal.sandi_pibal || 'NIL'}
                                </pre>
                            </div>

                            {/* Hasil Lapisan Wind Direction & Speed */}
                            {selectedPibal.hasil_lapisan_wd_ws_dddff && (
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                                        <Wind className="h-4 w-4 text-emerald-600" /> Hasil Lapisan Ketinggian (Wind Direction &amp; Speed)
                                    </h4>
                                    <div className="border rounded-xl overflow-hidden bg-white">
                                        <Table className="text-xs">
                                            <TableHeader>
                                                <TableRow className="bg-slate-100">
                                                    <TableHead className="font-bold text-slate-700">Ketinggian (ft)</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-700">Arah Angin (WD)</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-700">Kecepatan (WS)</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-700">Sandi dddff</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.values(selectedPibal.hasil_lapisan_wd_ws_dddff).map((row, i) => (
                                                    <TableRow key={i} className="hover:bg-slate-50">
                                                        <TableCell className="font-bold text-slate-900">
                                                            {row.lapisan === -1 ? 'Permukaan' : `${row.lapisan} ft`}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono">{row.wd === -1 ? '-' : `${row.wd}°`}</TableCell>
                                                        <TableCell className="text-center font-mono">{row.ws === -1 ? '-' : `${row.ws} kt`}</TableCell>
                                                        <TableCell className="text-center font-mono font-bold text-blue-700">{row.dddff}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}

                            {/* Pembacaan Azimuth & Elevasi Per Menit */}
                            {selectedPibal.pembacaan_azimuth_elevasi && (
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                                        <Compass className="h-4 w-4 text-indigo-600" /> Pembacaan Azimuth &amp; Elevasi Per Menit
                                    </h4>
                                    <div className="border rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                                        <Table className="text-xs">
                                            <TableHeader>
                                                <TableRow className="bg-slate-100">
                                                    <TableHead className="font-bold text-slate-700 w-24">Menit Ke</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-700">Azimuth (°)</TableHead>
                                                    <TableHead className="text-center font-bold text-slate-700">Elevasi (°)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(selectedPibal.pembacaan_azimuth_elevasi).map(([min, val]) => (
                                                    <TableRow key={min} className="hover:bg-slate-50">
                                                        <TableCell className="font-bold text-slate-800">Menit-{min}</TableCell>
                                                        <TableCell className="text-center font-mono">{val.azimuth}°</TableCell>
                                                        <TableCell className="text-center font-mono">{val.elevasi}°</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

PibalIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/pibal' },
            { title: 'Data PIBAL', href: '/laporan/pibal' },
        ]}
    >
        {page}
    </AppLayout>
);
