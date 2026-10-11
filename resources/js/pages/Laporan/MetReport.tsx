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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Activity,
    AlertCircle,
    ArrowDownUp,
    Calendar,
    CheckCircle2,
    Compass,
    Eye,
    Filter,
    Info,
    MessageSquare,
    Plus,
    Radio,
    Send,
    Sparkles,
    UserCheck,
    XCircle,
} from 'lucide-react';

interface Pegawai {
    id: number;
    nama: string;
}

interface DataMetReportItem {
    id: number;
    station_code: string;
    station_name: string;
    data_timestamp: string;
    wind: string | null;
    visibility: string | null;
    weather: string | null;
    cloud: string | null;
    temp_drybulb: number | null;
    temp_dewpoint: number | null;
    qnh_hpa: number | null;
    qnh_inhg: number | null;
    qfe_hpa: number | null;
    qfe_inhg: number | null;
    remarks: string | null;
    trend: string | null;
    raw_message: string | null;
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

interface Props {
    metReportRecords: PaginatedResponse<DataMetReportItem>;
    bulan: number;
    tahun: number;
    totalRecords: number;
    sortOrder?: string;
    observerFilter?: string;
    availableObservers?: string[];
    waConfigured?: boolean;
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

export default function MetReportIndex({
    metReportRecords,
    bulan,
    tahun,
    totalRecords,
    sortOrder = 'desc',
    observerFilter = 'ALL',
    availableObservers = [],
    waConfigured = false,
}: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
        }
    }>().props;

    const [selectedReport, setSelectedReport] = useState<DataMetReportItem | null>(null);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [showSendWaModal, setShowSendWaModal] = useState(false);
    const [rawInput, setRawInput] = useState('');
    const [waRecipient, setWaRecipient] = useState('');
    const [waMessageText, setWaMessageText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    const recordsList = metReportRecords.data || [];

    const handleFilterChange = (params: {
        newObserver?: string;
        newSortOrder?: string;
        newPerPage?: number;
        newBulan?: number;
        newTahun?: number;
    }) => {
        const activeObserver = params.newObserver !== undefined ? params.newObserver : observerFilter;
        const activeSortOrder = params.newSortOrder !== undefined ? params.newSortOrder : sortOrder;
        const activePerPage = params.newPerPage !== undefined ? params.newPerPage : metReportRecords.per_page;
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

        router.get('/laporan/met-report', queryData, { preserveState: true });
    };

    const handleManualStore = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawInput.trim()) return;

        setIsSubmitting(true);
        router.post('/laporan/met-report/manual', { raw_message: rawInput }, {
            onSuccess: () => {
                setShowPasteModal(false);
                setRawInput('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleSendWa = (e: React.FormEvent) => {
        e.preventDefault();
        if (!waRecipient.trim() || !waMessageText.trim()) return;

        setIsSubmitting(true);
        router.post('/laporan/met-report/send-wa', {
            recipient: waRecipient,
            message: waMessageText,
        }, {
            onSuccess: () => {
                setShowSendWaModal(false);
                setWaMessageText('');
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <>
            <Head title="Laporan Bulanan - MET REPORT (QAM)" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* Flash Banner Result Notification if active */}
                {flashSuccess && (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2.5 text-sm font-medium">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            <span>{flashSuccess}</span>
                        </div>
                    </div>
                )}

                {flashError && (
                    <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2.5 text-sm font-medium">
                            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                            <span>{flashError}</span>
                        </div>
                    </div>
                )}

                {/* Header Branding */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <div className="space-y-1.5">
                        {/* <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp Bot Listener &amp; Parser
                            </Badge>
                            <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-400/30 px-3 py-1 text-xs">
                                Oesman Sadik Airport (WAEL)
                            </Badge>
                        </div> */}
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                            <MessageSquare className="h-7 w-7 text-emerald-400 animate-pulse" />
                            MET REPORT (QAM) Recap
                        </h1>
                        {/* <p className="text-emerald-100/80 text-sm">
                            Rekap Otomatis Pesan Informasi Cuaca Bandara
                        </p> */}
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

                        {/* Quick Paste Modal Button */}
                        <Button
                            onClick={() => setShowPasteModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/30"
                        >
                            <Plus className="h-4 w-4" /> Paste Sandi QAM
                        </Button>

                        {/* Send WA Modal Button */}
                        <Button
                            onClick={() => setShowSendWaModal(true)}
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2"
                        >
                            <Send className="h-4 w-4" /> Kirim WhatsApp
                        </Button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Total Record MET REPORT
                            </CardTitle>
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900">{totalRecords} Records</div>
                            <p className="text-xs text-slate-500 mt-1">
                                Data bulan {NAMA_BULAN[bulan - 1]} {tahun}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Bandara &amp; Kode ICAO
                            </CardTitle>
                            <Compass className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900">WAEL / LABUHA</div>
                            <p className="text-xs text-slate-500 mt-1">Oesman Sadik Airport (WAEL)</p>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                WhatsApp Gateway Status
                            </CardTitle>
                            <Radio className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <Badge className={waConfigured ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}>
                                    {waConfigured ? "Active Listener & Outbound" : "Ready for Gateway"}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Webhook API: /api/whatsapp/webhook</p>
                        </CardContent>
                    </Card>
                </div>

                {/* MET REPORT Records Table Card */}
                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-emerald-600" />
                                Daftar Pengamatan MET REPORT QAM ({NAMA_BULAN[bulan - 1]} {tahun})
                            </CardTitle>

                            {/* Sort & Filter Control Bar */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {/* Filter Observer */}
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-600 whitespace-nowrap flex items-center gap-1">
                                        <Filter className="h-3.5 w-3.5 text-emerald-600" /> Observer:
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
                                        value={String(metReportRecords.per_page)}
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
                                        <TableHead className="w-48 text-xs font-extrabold text-slate-700">Waktu (UTC &amp; WIT)</TableHead>
                                        <TableHead className="w-28 text-center text-xs font-extrabold text-slate-700">Angin (WIND)</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Visibilitas</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Weather</TableHead>
                                        <TableHead className="w-32 text-center text-xs font-extrabold text-slate-700">Cloud</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">TT/TD (°C)</TableHead>
                                        <TableHead className="w-32 text-center text-xs font-extrabold text-slate-700">QNH (hPa/inHg)</TableHead>
                                        <TableHead className="w-32 text-center text-xs font-extrabold text-slate-700">QFE (hPa/inHg)</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Trend</TableHead>
                                        <TableHead className="w-40 text-xs font-extrabold text-slate-700">Observer / Sender</TableHead>
                                        <TableHead className="w-24 text-center text-xs font-extrabold text-slate-700">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {recordsList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-12 text-slate-500">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Info className="h-8 w-8 text-slate-300" />
                                                    <p className="font-semibold text-slate-700">Tidak Ada Data MET REPORT</p>
                                                    <p className="text-xs text-slate-400">
                                                        Belum ada data MET REPORT (QAM) terdata untuk periode bulan {NAMA_BULAN[bulan - 1]} {tahun}.
                                                    </p>
                                                    <Button
                                                        onClick={() => setShowPasteModal(true)}
                                                        size="sm"
                                                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Paste Sandi QAM Manual
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recordsList.map((item, idx) => {
                                            const recordIndex = ((metReportRecords.current_page || 1) - 1) * (metReportRecords.per_page || 10) + idx + 1;
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

                                                    <TableCell className="text-center font-mono text-xs font-bold text-slate-800">
                                                        {item.wind || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700">
                                                        {item.visibility || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700">
                                                        {item.weather || 'NIL'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700">
                                                        {item.cloud || '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-bold text-emerald-700">
                                                        {item.temp_drybulb !== null && item.temp_dewpoint !== null
                                                            ? `${item.temp_drybulb}°C / ${item.temp_dewpoint}°C`
                                                            : '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-bold text-blue-700">
                                                        {item.qnh_hpa !== null ? `${item.qnh_hpa} / ${item.qnh_inhg}` : '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-bold text-indigo-700">
                                                        {item.qfe_hpa !== null ? `${item.qfe_hpa} / ${item.qfe_inhg}` : '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs font-semibold text-slate-700">
                                                        {item.trend || '-'}
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
                                                            onClick={() => setSelectedReport(item)}
                                                            className="h-8 px-2 text-xs border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                                                        >
                                                            <Eye className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Detail
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
                        {metReportRecords.total > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50/50">
                                <div className="text-xs text-slate-500">
                                    Menampilkan <span className="font-semibold text-slate-700">{metReportRecords.from || 0}</span> sampai{' '}
                                    <span className="font-semibold text-slate-700">{metReportRecords.to || 0}</span> dari{' '}
                                    <span className="font-semibold text-slate-700">{metReportRecords.total}</span> data pengamatan
                                </div>

                                <div className="flex items-center gap-1.5">
                                    {metReportRecords.links.map((link, key) => {
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
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
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

            {/* Modal Detail Sandi MET REPORT */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-2xl bg-white border-slate-200">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-emerald-600" />
                            Detail Pesan MET REPORT (QAM)
                        </DialogTitle>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-4 pt-2 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <div>
                                    <p className="text-slate-500 font-medium">Waktu Data</p>
                                    <p className="font-bold text-slate-900 mt-0.5">{formatDateTimeDisplay(selectedReport.data_timestamp).topUtc}</p>
                                    <p className="text-[11px] font-semibold text-emerald-700">{formatDateTimeDisplay(selectedReport.data_timestamp).bottomWit}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Suhu TT / TD</p>
                                    <p className="font-bold text-emerald-700 mt-0.5">{selectedReport.temp_drybulb}°C / {selectedReport.temp_dewpoint}°C</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-medium">Tekanan QNH / QFE</p>
                                    <p className="font-bold text-blue-700 mt-0.5">{selectedReport.qnh_hpa} hPa / {selectedReport.qfe_hpa} hPa</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-700 mb-1.5">Teks Pesan Raw WhatsApp:</p>
                                <div className="bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                                    {selectedReport.raw_message || 'Pesan tidak tersedia'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Quick Paste Manual QAM */}
            <Dialog open={showPasteModal} onOpenChange={setShowPasteModal}>
                <DialogContent className="max-w-xl bg-white border-slate-200">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Plus className="h-5 w-5 text-emerald-600" />
                            Input / Paste Pesan MET REPORT (QAM)
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleManualStore} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700">Paste Teks Pesan QAM WhatsApp:</Label>
                            <Textarea
                                rows={8}
                                placeholder="MET REPORT (QAM)&#10;OESMAN SADIK AIRPORT (WAEL)&#10;DATE : 13 / 08 / 2026&#10;TIME : 23.00 UTC&#10;WIND : VRB 02 KT..."
                                value={rawInput}
                                onChange={(e) => setRawInput(e.target.value)}
                                className="font-mono text-xs bg-slate-50 border-slate-200 focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowPasteModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !rawInput.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {isSubmitting ? 'Memproses...' : 'Proses &amp; Rekap'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Outbound Send WhatsApp */}
            <Dialog open={showSendWaModal} onOpenChange={setShowSendWaModal}>
                <DialogContent className="max-w-md bg-white border-slate-200">
                    <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Send className="h-5 w-5 text-emerald-600" />
                            Kirim Pesan WhatsApp Outbound
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSendWa} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700">Nomor Telepon / Group ID:</Label>
                            <Input
                                placeholder="081234567890 atau 1203630123456789@g.us"
                                value={waRecipient}
                                onChange={(e) => setWaRecipient(e.target.value)}
                                className="text-xs bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700">Isi Pesan WhatsApp:</Label>
                            <Textarea
                                rows={4}
                                placeholder="Informasi cuaca atau pengumuman..."
                                value={waMessageText}
                                onChange={(e) => setWaMessageText(e.target.value)}
                                className="text-xs bg-slate-50 border-slate-200"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowSendWaModal(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !waRecipient.trim() || !waMessageText.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                <Send className="h-3.5 w-3.5" />
                                {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

MetReportIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/met-report' },
            { title: 'MET REPORT (QAM)', href: '/laporan/met-report' },
        ]}
    >
        {page}
    </AppLayout>
);
