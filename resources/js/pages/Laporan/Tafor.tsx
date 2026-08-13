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
    Calendar,
    CheckCircle2,
    CloudRain,
    Compass,
    Eye,
    FileSpreadsheet,
    Filter,
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

interface Props {
    taforRecords: PaginatedResponse<DataTaforItem>;
    bulan: number;
    tahun: number;
    totalRecords: number;
    sortOrder?: string;
    observerFilter?: string;
    availableObservers?: string[];
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
    totalRecords,
    sortOrder = 'desc',
    observerFilter = 'ALL',
    availableObservers = [],
}: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
            sync_result?: SyncResultPayload;
        }
    }>().props;

    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedTafor, setSelectedTafor] = useState<DataTaforItem | null>(null);
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

    const recordsList = taforRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
        newBulan?: number;
        newTahun?: number;
    }) => {
        const activeObserver = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const activeSortOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const activePerPage = params.newPerPage !== undefined ? params.newPerPage : taforRecords.per_page;
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

        router.get('/laporan/tafor', queryData, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post('/laporan/tafor/sync', { bulan, tahun }, {
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
            <Head title="Laporan Bulanan - Data TAFOR BMKG" />

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
                            <CloudRain className="h-7 w-7 text-cyan-400 animate-pulse" />
                            Data Pengamatan TAFOR (Terminal Aerodrome Forecast)
                        </h1>
                        <p className="text-blue-200/80 text-sm">
                            Integrasi Otomatis BMKGSoft API &amp; Rekap Prakiraan Cuaca Bandara (ICAO: WAEL)
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

                        {/* Export Verifikasi TAFOR (.xlsx) Button */}
                        <a
                            href={`/laporan/tafor/export-verifikasi?bulan=${bulan}&tahun=${tahun}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/30"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Verifikasi TAF (.xlsx)
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
                                Total Record TAFOR
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
                                Stasiun &amp; Kode ICAO
                            </CardTitle>
                            <Compass className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900">WAEL / 97460</div>
                            <p className="text-xs text-slate-500 mt-1">Stamet Oesman Sadik Labuha</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Header Berita GTS
                            </CardTitle>
                            <Radio className="h-4 w-4 text-cyan-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-cyan-700">FTID40 WAEL</div>
                            <p className="text-xs text-slate-500 mt-1">Prakiraan TAF Bandara Oesman Sadik</p>
                        </CardContent>
                    </Card>
                </div>

                {/* TAFOR Records Table Card */}
                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Daftar Pengamatan TAFOR ({NAMA_BULAN[bulan - 1]} {tahun})
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

                                {/* Sort Order Dropdown */}
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

                                {/* Per Page Dropdown */}
                                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                                    <span className="font-semibold text-slate-600 whitespace-nowrap">Baris:</span>
                                    <Select
                                        value={String(taforRecords.per_page)}
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
                                        <TableHead className="w-32 text-center text-xs font-extrabold text-slate-700">Header GTS</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">BBB</TableHead>
                                        <TableHead className="text-xs font-extrabold text-slate-700">Raw Sandi TAFOR</TableHead>
                                        <TableHead className="w-44 text-xs font-extrabold text-slate-700">Observer / Sender</TableHead>
                                        <TableHead className="w-28 text-center text-xs font-extrabold text-slate-700">Status</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {recordsList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Info className="h-8 w-8 text-slate-300" />
                                                    <p className="font-semibold text-slate-700">Tidak Ada Data TAFOR</p>
                                                    <p className="text-xs text-slate-400">
                                                        Belum ada data TAFOR terdata untuk periode bulan {NAMA_BULAN[bulan - 1]} {tahun}.
                                                    </p>
                                                    <Button
                                                        onClick={handleSync}
                                                        disabled={isSyncing}
                                                        size="sm"
                                                        className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white gap-2"
                                                    >
                                                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                                        Sinkronkan dari BMKGSoft
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recordsList.map((item, idx) => {
                                            const recordIndex = ((taforRecords.current_page || 1) - 1) * (taforRecords.per_page || 10) + idx + 1;
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

                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-mono text-xs bg-cyan-50 text-cyan-700 border-cyan-200">
                                                            {item.ttaaii || 'TAF'} {item.cccc || 'WAEL'}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {item.bbb ? (
                                                            <Badge variant="secondary" className="font-mono text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                {item.bbb}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="font-mono text-xs max-w-[350px]">
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
                                                                <span className="font-bold text-slate-900">{item.observer_name || item.sender_username || '-'}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Badge
                                                            className={
                                                                item.status === 'sent'
                                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                                            }
                                                        >
                                                            {item.status || 'saved'}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedTafor(item)}
                                                            className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" /> Detail
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
                        {taforRecords.total > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50/50">
                                <div className="text-xs text-slate-500">
                                    Menampilkan <span className="font-semibold text-slate-700">{taforRecords.from || 0}</span> sampai{' '}
                                    <span className="font-semibold text-slate-700">{taforRecords.to || 0}</span> dari{' '}
                                    <span className="font-semibold text-slate-700">{taforRecords.total}</span> data pengamatan
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {taforRecords.links.map((link, key) => {
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
                                                className={`h-8 min-w-[32px] text-xs px-2.5 ${
                                                    link.active
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
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
            </div>

            {/* Modal Detail Sandi TAFOR */}
            <Dialog open={!!selectedTafor} onOpenChange={() => setSelectedTafor(null)}>
                <DialogContent className="max-w-2xl bg-white border-slate-200">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <CloudRain className="h-5 w-5 text-blue-600" />
                            Detail Raw Sandi TAFOR GTS
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTafor && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-slate-500 font-medium">Waktu Pengamatan (UTC &amp; WIT)</p>
                                    <p className="font-bold text-slate-900 mt-0.5">{formatDateTimeDisplay(selectedTafor.data_timestamp).topUtc}</p>
                                    <p className="text-[11px] text-slate-600">{formatDateTimeDisplay(selectedTafor.data_timestamp).bottomWit}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Header GTS &amp; ICAO</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedTafor.ttaaii || 'TAF'} {selectedTafor.cccc || 'WAEL'} {selectedTafor.bbb ? `(${selectedTafor.bbb})` : ''}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Observer / Sender</p>
                                    <p className="font-bold text-slate-900 mt-0.5">
                                        {selectedTafor.pegawai?.nama || selectedTafor.observer_name || selectedTafor.sender_username || '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Status Pengiriman</p>
                                    <p className="font-bold text-slate-900 mt-0.5">{selectedTafor.status || 'saved'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-700 mb-1.5">Isi Teks Sandi TAFOR (Raw GTS):</p>
                                <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                                    {selectedTafor.sandi || 'Sandi tidak tersedia'}
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
                            <RefreshCw className="h-5 w-5 text-cyan-600" />
                            Rincian Response Sinkronisasi BMKGSoft
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
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                                syncFilter === 'ALL'
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Semua ({syncResult.details.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSyncFilter('BERHASIL')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                                syncFilter === 'BERHASIL'
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Sukses ({syncResult.synced_count})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSyncFilter('GAGAL')}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                                syncFilter === 'GAGAL'
                                                    ? 'bg-rose-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            Gagal ({syncResult.failed_count})
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-100 sticky top-0 z-10 border-b">
                                            <TableRow>
                                                <TableHead className="py-2 text-[11px] font-bold text-slate-700">Timestamp Data (UTC)</TableHead>
                                                <TableHead className="py-2 text-[11px] font-bold text-slate-700">Observer</TableHead>
                                                <TableHead className="py-2 text-[11px] font-bold text-slate-700 text-center">Status</TableHead>
                                                <TableHead className="py-2 text-[11px] font-bold text-slate-700">Alasan / Catatan</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="divide-y divide-slate-100">
                                            {filteredDetails.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                                                        Tidak ada item log dengan filter ini.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredDetails.map((detail, i) => (
                                                    <TableRow key={i} className="hover:bg-slate-50/80">
                                                        <TableCell className="py-2 font-mono text-[11px] text-slate-900">
                                                            {detail.timestamp}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-[11px] font-medium text-slate-800">
                                                            {detail.observer || 'Unassigned'}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-center">
                                                            {detail.status === 'berhasil' ? (
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Sukses
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                                                    <XCircle className="h-3 w-3 mr-1 text-rose-600" /> Gagal
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-[11px] text-slate-600 max-w-[200px] truncate" title={detail.reason || ''}>
                                                            {detail.reason || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50 flex justify-end">
                        <Button
                            variant="default"
                            onClick={() => setShowSyncModal(false)}
                            className="bg-slate-900 text-white hover:bg-slate-800 px-6"
                        >
                            Tutup Rincian
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

TaforIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/tafor' },
            { title: 'Data TAFOR', href: '/laporan/tafor' },
        ]}
    >
        {page}
    </AppLayout>
);
