import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Activity,
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    HelpCircle,
    Layers,
    MessageSquare,
    RefreshCw,
    Share2,
    TrendingUp,
    Users,
    XCircle,
    Instagram,
    Facebook,
    AtSign,
    Phone,
    Image as ImageIcon,
    Video,
    FileCode,
} from 'lucide-react';

interface StaffRecapItem {
    pegawai_id: number;
    nama: string;
    nip: string;
    role: string;
    total_count: number;
    pct_of_total: number;
    breakdown_shift: {
        pagi: number;
        siang: number;
        malam: number;
        lainnya: number;
    };
    breakdown_media: {
        image: number;
        video: number;
        document: number;
        text: number;
    };
}

interface DailyTrendItem {
    day: number;
    date: string;
    day_name: string;
    total: number;
    image: number;
    video: number;
}

interface DisseminationRecord {
    id: number;
    simpan_mkg_id: number;
    dissemination_timestamp: string;
    formatted_time: string;
    pegawai_id: number | null;
    pegawai?: {
        id: number;
        nama: string;
        nip: string | null;
    } | null;
    shift_id: number | null;
    shift_kode: string | null;
    shift_nama: string | null;
    media_type: string;
    message: string | null;
    platforms: string[] | null;
    status: string;
    sender_wa: string | null;
    sender_name: string | null;
    is_registered: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedRecords {
    data: DisseminationRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface SyncDetailItem {
    id: number;
    waktu_wit: string;
    pegawai: string;
    shift: string;
    media_type: string;
    status: string;
}

interface SyncResultPayload {
    success: boolean;
    synced_count: number;
    new_count: number;
    total_fetched: number;
    message: string;
    details?: SyncDetailItem[];
}

interface Props {
    records: PaginatedRecords;
    bulan: number;
    tahun: number;
    filters: {
        pegawai_id: string;
        media_type: string;
        status: string;
        sort_order: string;
        per_page: number;
    };
    availableStaff: Array<{ id: number; nama: string; nip: string | null }>;
    stats: {
        summary: {
            total_disseminations: number;
            success_rate: number;
            daily_avg: number;
            top_contributor_nama: string;
            top_contributor_count: number;
            unassigned_count: number;
        };
        media_counts: {
            image: number;
            video: number;
            document: number;
            text: number;
        };
        platform_counts: {
            instagram: number;
            facebook: number;
            threads: number;
            wa_group: number;
        };
        staff_recap: StaffRecapItem[];
        daily_trends: DailyTrendItem[];
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/pibal' },
    { title: 'SIMPAN-MKG (Diseminasi)', href: '/laporan/simpan-mkg' },
];

const listBulan = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
];

export default function SimpanMkgIndex({
    records,
    bulan,
    tahun,
    filters,
    availableStaff,
    stats,
}: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
            sync_result?: SyncResultPayload;
        };
    }>().props;

    const [selectedBulan, setSelectedBulan] = useState(bulan);
    const [selectedTahun, setSelectedTahun] = useState(tahun);
    const [activeTab, setActiveTab] = useState<'rekap' | 'tren' | 'logs'>('rekap');
    const [isSyncing, setIsSyncing] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<DisseminationRecord | null>(null);

    const syncResult = flash?.sync_result;
    const flashSuccess = flash?.success;
    const flashError = flash?.error;

    useEffect(() => {
        if (syncResult || flashError) {
            setShowSyncModal(true);
        }
    }, [syncResult, flashError]);

    const handleFilterChange = (params: Partial<typeof filters> & { newBulan?: number; newTahun?: number }) => {
        const queryData: Record<string, any> = {
            bulan: params.newBulan !== undefined ? params.newBulan : selectedBulan,
            tahun: params.newTahun !== undefined ? params.newTahun : selectedTahun,
            pegawai_id: params.pegawai_id !== undefined ? params.pegawai_id : filters.pegawai_id,
            media_type: params.media_type !== undefined ? params.media_type : filters.media_type,
            status: params.status !== undefined ? params.status : filters.status,
            sort_order: params.sort_order !== undefined ? params.sort_order : filters.sort_order,
            per_page: params.per_page !== undefined ? params.per_page : filters.per_page,
        };

        router.get('/laporan/simpan-mkg', queryData, { preserveState: true });
    };

    const handleSync = () => {
        setIsSyncing(true);
        router.post(
            '/laporan/simpan-mkg/sync',
            { bulan: selectedBulan, tahun: selectedTahun },
            {
                preserveScroll: true,
                onSuccess: () => setShowSyncModal(true),
                onError: () => setShowSyncModal(true),
                onFinish: () => setIsSyncing(false),
            }
        );
    };

    const renderShiftBadge = (kode: string | null) => {
        if (!kode) return <Badge variant="outline" className="text-slate-400">Non-Shift</Badge>;
        const kUpper = kode.toUpperCase();
        if (kUpper === 'P' || kUpper === 'PF') {
            return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono">Pagi ({kUpper})</Badge>;
        }
        if (kUpper === 'S') {
            return <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-mono">Siang (S)</Badge>;
        }
        if (kUpper === 'M' || kUpper === 'M1' || kUpper === 'M2') {
            return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-mono">Malam ({kUpper})</Badge>;
        }
        return <Badge variant="secondary" className="font-mono">{kUpper}</Badge>;
    };

    const renderMediaTypeBadge = (type: string) => {
        switch (type.toLowerCase()) {
            case 'image':
                return (
                    <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
                        <ImageIcon className="h-3 w-3" /> Infografis
                    </Badge>
                );
            case 'video':
                return (
                    <Badge variant="outline" className="gap-1 border-purple-200 bg-purple-50 text-purple-700">
                        <Video className="h-3 w-3" /> Video
                    </Badge>
                );
            case 'document':
                return (
                    <Badge variant="outline" className="gap-1 border-orange-200 bg-orange-50 text-orange-700">
                        <FileCode className="h-3 w-3" /> Dokumen
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1 border-slate-200 bg-slate-50 text-slate-700">
                        <FileText className="h-3 w-3" /> Teks
                    </Badge>
                );
        }
    };

    const renderPlatformsList = (platforms: string[] | null) => {
        if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return <span className="text-xs text-slate-400">-</span>;
        }

        return (
            <div className="flex flex-wrap gap-1">
                {platforms.map((p, idx) => {
                    const pLower = p.toLowerCase();
                    if (pLower.includes('instagram') || pLower.includes('ig')) {
                        return (
                            <span key={idx} className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-pink-500/10 to-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-pink-700 border border-pink-200">
                                <Instagram className="h-2.5 w-2.5" /> IG Story
                            </span>
                        );
                    }
                    if (pLower.includes('threads')) {
                        return (
                            <span key={idx} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-800 border border-slate-300">
                                <AtSign className="h-2.5 w-2.5" /> Threads
                            </span>
                        );
                    }
                    if (pLower.includes('facebook') || pLower.includes('fb')) {
                        return (
                            <span key={idx} className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                                <Facebook className="h-2.5 w-2.5" /> Facebook
                            </span>
                        );
                    }
                    return (
                        <span key={idx} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                            <Phone className="h-2.5 w-2.5" /> WA Group
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <Head title={`Laporan Bulanan SIMPAN-MKG - ${listBulan.find(b => b.value === selectedBulan)?.label} ${selectedTahun}`} />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* ── Top Header Section ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                                <Share2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                                    Laporan Bulanan SIMPAN-MKG
                                </h1>
                                {/* <p className="text-xs md:text-sm text-slate-500">
                                    Rekapitulasi diseminasi informasi meteorologi berbasis <strong>Jadwal Dinas Operasional</strong>
                                </p> */}
                            </div>
                        </div>
                    </div>

                    {/* Filter & Action Controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
                            <Calendar className="h-4 w-4 ml-1.5 text-slate-500" />
                            <Select
                                value={String(selectedBulan)}
                                onValueChange={(val) => {
                                    const b = parseInt(val, 10);
                                    setSelectedBulan(b);
                                    handleFilterChange({ newBulan: b });
                                }}
                            >
                                <SelectTrigger className="h-8 w-[125px] border-0 bg-transparent shadow-none font-medium text-slate-800 text-xs">
                                    <SelectValue placeholder="Pilih Bulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {listBulan.map((b) => (
                                        <SelectItem key={b.value} value={String(b.value)} className="text-xs">
                                            {b.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(selectedTahun)}
                                onValueChange={(val) => {
                                    const t = parseInt(val, 10);
                                    setSelectedTahun(t);
                                    handleFilterChange({ newTahun: t });
                                }}
                            >
                                <SelectTrigger className="h-8 w-[90px] border-0 bg-transparent shadow-none font-medium text-slate-800 text-xs">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2025, 2026, 2027].map((yr) => (
                                        <SelectItem key={yr} value={String(yr)} className="text-xs">
                                            {yr}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sync Button */}
                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="h-10 gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>{isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi Data'}</span>
                        </Button>

                        {/* Export Buttons */}
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                className="h-10 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 bg-white"
                                asChild
                            >
                                <a href={`/laporan/simpan-mkg/export-excel?bulan=${selectedBulan}&tahun=${selectedTahun}`}>
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                    <span className="hidden sm:inline">Excel</span>
                                </a>
                            </Button>

                            <Button
                                variant="outline"
                                className="h-10 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 bg-white"
                                asChild
                            >
                                <a href={`/laporan/simpan-mkg/export-csv?bulan=${selectedBulan}&tahun=${selectedTahun}`}>
                                    <Download className="h-4 w-4 text-slate-600" />
                                    <span className="hidden sm:inline">CSV</span>
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── KPI Summary Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/80">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Total Diseminasi
                            </CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                                <Share2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {stats.summary.total_disseminations}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                                Periode {listBulan.find(b => b.value === selectedBulan)?.label} {selectedTahun}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 shadow-sm bg-gradient-to-br from-white to-slate-50/80">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Rata-Rata Harian
                            </CardTitle>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                                <Activity className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                {stats.summary.daily_avg}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Rilis produk / hari operasional
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="flex border-b border-slate-200 gap-2">
                    <button
                        onClick={() => setActiveTab('rekap')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'rekap'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        <span>Rekap Pegawai Berdinas</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {stats.staff_recap.length}
                        </Badge>
                    </button>

                    <button
                        onClick={() => setActiveTab('tren')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'tren'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <TrendingUp className="h-4 w-4" />
                        <span>Distribusi & Tren Harian</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'logs'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Layers className="h-4 w-4" />
                        <span>Log Detail Diseminasi</span>
                        <Badge variant="secondary" className="ml-1 text-xs">
                            {records.total}
                        </Badge>
                    </button>
                </div>

                {/* ── TAB 1: REKAP PEGAWAI OPERASIONAL ── */}
                {activeTab === 'rekap' && (
                    <div className="space-y-6">
                        <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base font-bold text-slate-900">
                                            Rekapitulasi Frekuensi Diseminasi per Pegawai Operasional
                                        </CardTitle>
                                        {/* <CardDescription className="text-xs text-slate-500">
                                            Dihitung otomatis berdasarkan kecocokan waktu diseminasi dengan jadwal dinas pegawai piket (Observer/Forecaster).
                                        </CardDescription> */}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400"></span> Pagi</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400"></span> Siang</span>
                                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400"></span> Malam</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-100/60">
                                            <TableRow>
                                                <TableHead className="w-14 text-center font-bold text-slate-700">#</TableHead>
                                                <TableHead className="font-bold text-slate-700">Nama Pegawai</TableHead>
                                                <TableHead className="font-bold text-slate-700">Role / NIP</TableHead>
                                                <TableHead className="text-center font-bold text-slate-700">Shift Pagi</TableHead>
                                                <TableHead className="text-center font-bold text-slate-700">Shift Siang</TableHead>
                                                <TableHead className="text-center font-bold text-slate-700">Shift Malam</TableHead>
                                                <TableHead className="text-center font-bold text-slate-700">Media (Gbr / Vid)</TableHead>
                                                <TableHead className="text-right font-bold text-slate-700">Total Diseminasi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stats.staff_recap.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                                                        Belum ada data diseminasi untuk periode ini. Silakan klik tombol <strong>"Sinkronisasi Data"</strong> di atas.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                stats.staff_recap.map((staff, index) => {
                                                    const isTop3 = index < 3 && staff.total_count > 0;
                                                    return (
                                                        <TableRow key={staff.pegawai_id} className="hover:bg-slate-50/80 transition-colors">
                                                            <TableCell className="text-center font-medium">
                                                                {isTop3 ? (
                                                                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                                                            index === 1 ? 'bg-slate-200 text-slate-800 border border-slate-300' :
                                                                                'bg-orange-100 text-orange-800 border border-orange-300'
                                                                        }`}>
                                                                        {index + 1}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-500 text-xs">{index + 1}</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="font-semibold text-slate-900 text-sm">
                                                                    {staff.nama}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-xs text-slate-600">{staff.role}</div>
                                                                <div className="text-[11px] font-mono text-slate-400">{staff.nip}</div>
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                <span className={staff.breakdown_shift.pagi > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>
                                                                    {staff.breakdown_shift.pagi}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                <span className={staff.breakdown_shift.siang > 0 ? 'text-sky-700 font-semibold' : 'text-slate-400'}>
                                                                    {staff.breakdown_shift.siang}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                <span className={staff.breakdown_shift.malam > 0 ? 'text-indigo-700 font-semibold' : 'text-slate-400'}>
                                                                    {staff.breakdown_shift.malam}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs text-slate-600">
                                                                {staff.breakdown_media.image} / {staff.breakdown_media.video}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                    {staff.total_count} kali
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── TAB 2: DISTRIBUSI & TREN HARIAN ── */}
                {activeTab === 'tren' && (
                    <div className="space-y-6">
                        {/* Channel & Media Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Distribution Platforms */}
                            <Card className="border-slate-200/80 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Share2 className="h-4 w-4 text-blue-600" />
                                        Distribusi Kanal Publikasi
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-pink-50/50 border border-pink-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                                                <Instagram className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">Instagram Stories</div>
                                                <div className="text-xs text-slate-500">Kanal utama grafis cuaca</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-extrabold text-pink-700">{stats.platform_counts.instagram}</div>
                                            <div className="text-[11px] text-slate-400">tayang</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center">
                                                <AtSign className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">Threads</div>
                                                <div className="text-xs text-slate-500">Postingan teks & media</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-extrabold text-slate-800">{stats.platform_counts.threads}</div>
                                            <div className="text-[11px] text-slate-400">tayang</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                                <Facebook className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">Facebook Page Story</div>
                                                <div className="text-xs text-slate-500">Halaman resmi BMKG</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-extrabold text-blue-700">{stats.platform_counts.facebook}</div>
                                            <div className="text-[11px] text-slate-400">tayang</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">WhatsApp Groups / Channels</div>
                                                <div className="text-xs text-slate-500">Stakeholder & publik</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-extrabold text-emerald-700">{stats.platform_counts.wa_group}</div>
                                            <div className="text-[11px] text-slate-400">forward</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Distribution Media Types */}
                            <Card className="border-slate-200/80 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-indigo-600" />
                                        Jenis Konten & Format Media
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className="flex items-center gap-1.5 text-blue-700">
                                                <ImageIcon className="h-3.5 w-3.5" /> Infografis Gambar
                                            </span>
                                            <span className="font-mono text-slate-700">
                                                {stats.media_counts.image} ({stats.summary.total_disseminations > 0 ? Math.round((stats.media_counts.image / stats.summary.total_disseminations) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${stats.summary.total_disseminations > 0 ? (stats.media_counts.image / stats.summary.total_disseminations) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className="flex items-center gap-1.5 text-purple-700">
                                                <Video className="h-3.5 w-3.5" /> Video Animasi Cuaca
                                            </span>
                                            <span className="font-mono text-slate-700">
                                                {stats.media_counts.video} ({stats.summary.total_disseminations > 0 ? Math.round((stats.media_counts.video / stats.summary.total_disseminations) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="bg-purple-600 h-2 rounded-full"
                                                style={{ width: `${stats.summary.total_disseminations > 0 ? (stats.media_counts.video / stats.summary.total_disseminations) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className="flex items-center gap-1.5 text-orange-700">
                                                <FileCode className="h-3.5 w-3.5" /> Dokumen PDF / Flight Doc
                                            </span>
                                            <span className="font-mono text-slate-700">
                                                {stats.media_counts.document} ({stats.summary.total_disseminations > 0 ? Math.round((stats.media_counts.document / stats.summary.total_disseminations) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="bg-orange-600 h-2 rounded-full"
                                                style={{ width: `${stats.summary.total_disseminations > 0 ? (stats.media_counts.document / stats.summary.total_disseminations) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-semibold mb-1">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <FileText className="h-3.5 w-3.5" /> Narasi Teks / Peringatan Dini
                                            </span>
                                            <span className="font-mono text-slate-700">
                                                {stats.media_counts.text} ({stats.summary.total_disseminations > 0 ? Math.round((stats.media_counts.text / stats.summary.total_disseminations) * 100) : 0}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="bg-slate-600 h-2 rounded-full"
                                                style={{ width: `${stats.summary.total_disseminations > 0 ? (stats.media_counts.text / stats.summary.total_disseminations) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Daily Trend Matrix */}
                        <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                                <CardTitle className="text-base font-bold text-slate-900">
                                    Aktivitas Diseminasi Harian (Tanggal 1 – {stats.daily_trends.length})
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    Frekuensi penerbitan informasi cuaca setiap hari dalam bulan berjalan.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-10 gap-2.5">
                                    {stats.daily_trends.map((item) => {
                                        const hasActivity = item.total > 0;
                                        return (
                                            <div
                                                key={item.day}
                                                className={`p-2.5 rounded-xl border text-center transition-all ${hasActivity
                                                        ? 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-xs'
                                                        : 'bg-white border-slate-200/70 text-slate-400'
                                                    }`}
                                            >
                                                <div className="text-[11px] font-semibold text-slate-500">
                                                    Tgl {item.day} ({item.day_name})
                                                </div>
                                                <div className={`text-xl font-extrabold mt-1 ${hasActivity ? 'text-blue-700' : 'text-slate-300'}`}>
                                                    {item.total}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    {hasActivity ? `${item.image} gbr` : 'nihil'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── TAB 3: LOG DETAIL DISEMINASI ── */}
                {activeTab === 'logs' && (
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="flex flex-wrap items-center gap-2.5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <span>Filter:</span>
                            </div>

                            <Select
                                value={filters.pegawai_id}
                                onValueChange={(val) => handleFilterChange({ pegawai_id: val })}
                            >
                                <SelectTrigger className="h-8 w-[190px] text-xs">
                                    <SelectValue placeholder="Semua Pegawai" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">Semua Pegawai</SelectItem>
                                    {availableStaff.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                                            {s.nama}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.media_type}
                                onValueChange={(val) => handleFilterChange({ media_type: val })}
                            >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                    <SelectValue placeholder="Tipe Media" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">Semua Media</SelectItem>
                                    <SelectItem value="image" className="text-xs">Infografis (Image)</SelectItem>
                                    <SelectItem value="video" className="text-xs">Video</SelectItem>
                                    <SelectItem value="document" className="text-xs">Dokumen</SelectItem>
                                    <SelectItem value="text" className="text-xs">Teks</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.status}
                                onValueChange={(val) => handleFilterChange({ status: val })}
                            >
                                <SelectTrigger className="h-8 w-[130px] text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
                                    <SelectItem value="success" className="text-xs">Success</SelectItem>
                                    <SelectItem value="partial" className="text-xs">Partial</SelectItem>
                                    <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="ml-auto text-xs text-slate-500">
                                Menampilkan {records.from ?? 0} - {records.to ?? 0} dari {records.total} data
                            </div>
                        </div>

                        {/* Logs Table */}
                        <Card className="border-slate-200/80 shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-100/60">
                                            <TableRow>
                                                <TableHead className="w-12 text-center font-bold text-slate-700">#</TableHead>
                                                <TableHead className="font-bold text-slate-700">Waktu (WIT)</TableHead>
                                                <TableHead className="font-bold text-slate-700">Petugas Piket Dinas</TableHead>
                                                <TableHead className="font-bold text-slate-700">Shift</TableHead>
                                                <TableHead className="font-bold text-slate-700">Media</TableHead>
                                                <TableHead className="font-bold text-slate-700">Kanal Terbit</TableHead>
                                                <TableHead className="font-bold text-slate-700">Konten / Pesan</TableHead>
                                                <TableHead className="text-center font-bold text-slate-700">Status</TableHead>
                                                <TableHead className="text-right font-bold text-slate-700">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.data.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                                                        Tidak ada log diseminasi yang sesuai dengan filter.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                records.data.map((item, idx) => {
                                                    const rowNum = (records.from ?? 1) + idx;
                                                    return (
                                                        <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                                            <TableCell className="text-center text-xs text-slate-400 font-mono">
                                                                {rowNum}
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap font-mono text-xs text-slate-800">
                                                                {item.formatted_time}
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.pegawai ? (
                                                                    <div className="font-semibold text-slate-900 text-xs">
                                                                        {item.pegawai.nama}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">
                                                                        Luar Jadwal Dinas
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {renderShiftBadge(item.shift_kode)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {renderMediaTypeBadge(item.media_type)}
                                                            </TableCell>
                                                            <TableCell>
                                                                {renderPlatformsList(item.platforms)}
                                                            </TableCell>
                                                            <TableCell className="max-w-[220px]">
                                                                <div className="truncate text-xs text-slate-600" title={item.message || '-'}>
                                                                    {item.message || <span className="text-slate-400 italic">Tanpa caption</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {item.status === 'success' ? (
                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                                                        SUCCESS
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive" className="text-[10px]">
                                                                        {item.status.toUpperCase()}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setSelectedRecord(item)}
                                                                    className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                                                                >
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pagination */}
                        {records.last_page > 1 && (
                            <div className="flex items-center justify-between py-2">
                                <div className="text-xs text-slate-500">
                                    Halaman {records.current_page} dari {records.last_page}
                                </div>
                                <div className="flex items-center gap-1">
                                    {records.links.map((link, lIdx) => {
                                        if (!link.url) {
                                            return (
                                                <span
                                                    key={lIdx}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    className="px-2.5 py-1 text-xs text-slate-300 rounded border border-transparent"
                                                />
                                            );
                                        }
                                        return (
                                            <Button
                                                key={lIdx}
                                                variant={link.active ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => router.get(link.url!, {}, { preserveState: true })}
                                                className={`h-8 px-3 text-xs ${link.active ? 'bg-blue-600 text-white' : ''}`}
                                            >
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Modal Sinkronisasi Data ── */}
                <Dialog open={showSyncModal} onOpenChange={setShowSyncModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold">
                                {syncResult?.success ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                        <span>Sinkronisasi SIMPAN-MKG Selesai</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-5 w-5 text-rose-600" />
                                        <span>Gagal Sinkronisasi</span>
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Laporan status integrasi data dari Supabase SIMPAN-MKG.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-sm">
                            <div className={`p-3 rounded-xl border text-xs leading-relaxed ${syncResult?.success
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                    : 'bg-rose-50 text-rose-900 border-rose-200'
                                }`}>
                                {syncResult?.message || flashError || flashSuccess}
                            </div>

                            {syncResult && (
                                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                        <div className="text-[11px] text-slate-500">Total Ditarik</div>
                                        <div className="text-base font-bold text-slate-800">{syncResult.total_fetched}</div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                                        <div className="text-[11px] text-blue-700">Data Diproses</div>
                                        <div className="text-base font-bold text-blue-800">{syncResult.synced_count}</div>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                                        <div className="text-[11px] text-emerald-700">Data Baru</div>
                                        <div className="text-base font-bold text-emerald-800">+{syncResult.new_count}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button onClick={() => setShowSyncModal(false)} size="sm" className="bg-slate-800 text-white">
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Modal Detail Diseminasi ── */}
                <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-base font-bold flex items-center gap-2">
                                <Share2 className="h-4 w-4 text-blue-600" />
                                Rincian Event Diseminasi
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                ID Rekaman SIMPAN-MKG: #{selectedRecord?.simpan_mkg_id}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRecord && (
                            <div className="space-y-4 py-2 text-xs">
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Waktu Diseminasi:</span>
                                        <span className="font-mono font-bold text-slate-800">{selectedRecord.formatted_time}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Petugas Berdinas:</span>
                                        <span className="font-semibold text-slate-900">{selectedRecord.pegawai?.nama ?? 'Luar Jadwal Dinas'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Shift Dinas:</span>
                                        <span>{renderShiftBadge(selectedRecord.shift_kode)}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[11px]">Tipe Media:</span>
                                        <span>{renderMediaTypeBadge(selectedRecord.media_type)}</span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-slate-500 font-semibold block mb-1.5">Platform Terpublikasi:</span>
                                    {renderPlatformsList(selectedRecord.platforms)}
                                </div>

                                <div>
                                    <span className="text-slate-500 font-semibold block mb-1.5">Isi Pesan / Caption:</span>
                                    <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-lg text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                                        {selectedRecord.message || <span className="text-slate-400 italic">Tidak ada teks caption</span>}
                                    </div>
                                </div>

                                <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                                    <span>Audit Pengirim WhatsApp Bot:</span>
                                    <span className="font-mono font-semibold">{selectedRecord.sender_name} ({selectedRecord.sender_wa})</span>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

SimpanMkgIndex.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>
        {page}
    </AppLayout>
);
