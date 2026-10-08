import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Download,
    FileSpreadsheet,
    Plane,
    CloudRain,
    Radio,
    MessageSquare,
    Layers,
    Sparkles,
    CheckCircle2,
    CalendarDays,
    Activity,
    FileText,
    TrendingUp,
} from 'lucide-react';

interface HarianItem {
    day: number;
    day_name: string;
    ff_ln: number;
    ff_dn: number;
    taf: number;
    rofor: number;
    arfor: number;
    sigmet: number;
    aerodrome_warning: number;
    publik: number;
    metar: number;
    speci: number;
    met_report: number;
    special: number;
    keterangan: string;
}

interface BulananItem {
    month: number;
    month_name: string;
    ff_ln: number;
    ff_dn: number;
    taf: number;
    rofor: number;
    arfor: number;
    sigmet: number;
    aerodrome_warning: number;
    publik: number;
    metar: number;
    speci: number;
    met_report: number;
    special: number;
    frekuensi_penerbangan: number;
}

interface Stats {
    total_ff_dn: number;
    total_taf: number;
    total_metar: number;
    total_speci: number;
    total_met_report: number;
    total_frekuensi: number;
}

interface Props {
    bulan: number;
    tahun: number;
    daysInMonth: number;
    harianData: HarianItem[];
    bulananData: BulananItem[];
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/pibal' },
    { title: 'Produk Bulanan', href: '/laporan/produk-bulanan' },
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

export default function ProdukBulanan({
    bulan,
    tahun,
    daysInMonth,
    harianData,
    bulananData,
    stats,
}: Props) {
    const [selectedBulan, setSelectedBulan] = useState(bulan);
    const [selectedTahun, setSelectedTahun] = useState(tahun);
    const [activeTab, setActiveTab] = useState<'harian' | 'bulanan' | 'frekuensi'>('harian');
    const [isDownloading, setIsDownloading] = useState(false);

    const handleFilterChange = (newBulan: number, newTahun: number) => {
        setSelectedBulan(newBulan);
        setSelectedTahun(newTahun);
        router.get(
            '/laporan/produk-bulanan',
            { bulan: newBulan, tahun: newTahun },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleDownloadExcel = () => {
        setIsDownloading(true);
        const url = `/laporan/produk-bulanan/export-excel?bulan=${selectedBulan}&tahun=${selectedTahun}`;
        window.location.href = url;
        setTimeout(() => {
            setIsDownloading(false);
        }, 2500);
    };

    const bulanLabel = listBulan.find((b) => b.value === selectedBulan)?.label || 'Bulan';

    // Summary totals for Harian
    const sumHarian = harianData.reduce(
        (acc, row) => ({
            ff_dn: acc.ff_dn + row.ff_dn,
            taf: acc.taf + row.taf,
            metar: acc.metar + row.metar,
            speci: acc.speci + row.speci,
            met_report: acc.met_report + row.met_report,
        }),
        { ff_dn: 0, taf: 0, metar: 0, speci: 0, met_report: 0 }
    );

    // Summary totals for Bulanan
    const sumBulanan = bulananData.reduce(
        (acc, row) => ({
            ff_dn: acc.ff_dn + row.ff_dn,
            taf: acc.taf + row.taf,
            metar: acc.metar + row.metar,
            speci: acc.speci + row.speci,
            met_report: acc.met_report + row.met_report,
            frekuensi: acc.frekuensi + row.frekuensi_penerbangan,
        }),
        { ff_dn: 0, taf: 0, metar: 0, speci: 0, met_report: 0, frekuensi: 0 }
    );

    return (
        <>
            <Head title={`Produk Bulanan - ${bulanLabel} ${selectedTahun}`} />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* TOP HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 transform -translate-x-12 translate-y-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        {/* <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold px-3 py-1 text-xs shadow-md">
                                <Sparkles className="h-3 w-3 mr-1 inline" />
                                Sandi &amp; Pelayanan MET Penerbangan
                            </Badge>
                            <span className="text-xs text-emerald-300 font-mono tracking-widest uppercase">
                                Stasiun Meteorologi Kelas III Oesman Sadik (WAEL / 97460)
                            </span>
                        </div> */}

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Layers className="h-7 w-7 text-emerald-400" />
                            Laporan Produk Bulanan ({bulanLabel} {selectedTahun})
                        </h1>

                        {/* <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Rekapitulasi lengkap pelayanan informasi meteorologi penerbangan (Flight Document, TAFOR, METAR, MET REPORT) serta frekuensi penerbangan maskapai.
                        </p> */}
                    </div>

                    {/* ACTION & FILTER CONTROLS */}
                    <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
                            <Select
                                value={String(selectedBulan)}
                                onValueChange={(val) => handleFilterChange(Number(val), selectedTahun)}
                            >
                                <SelectTrigger className="w-[125px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                    {listBulan.map((b) => (
                                        <SelectItem key={b.value} value={String(b.value)}>
                                            {b.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(selectedTahun)}
                                onValueChange={(val) => handleFilterChange(selectedBulan, Number(val))}
                            >
                                <SelectTrigger className="w-[90px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                                        <SelectItem key={yr} value={String(yr)}>
                                            {yr}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleDownloadExcel}
                            disabled={isDownloading}
                            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 text-xs"
                        >
                            <Download className={`h-4 w-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                            {isDownloading ? 'Menyiapkan Excel...' : 'Download Excel'}
                        </Button>
                    </div>
                </div>

                {/* KPI SUMMARY STATS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <Card className="border-border/60 hover:border-blue-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Flight Document (FF)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_ff_dn}</h3>
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Dalam Negeri</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Plane className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-amber-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Produk TAFOR (TAF)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_taf}</h3>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Prakiraan Bandara</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <CloudRain className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-purple-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">METAR / SPECI</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                    {stats.total_metar} {stats.total_speci > 0 && <span className="text-xs font-normal text-muted-foreground">(+{stats.total_speci} SPECI)</span>}
                                </h3>
                                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Rutin &amp; Khusus</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Radio className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-teal-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">MET REPORT (QAM)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_met_report}</h3>
                                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Lokal Rutin Bandara</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-emerald-500/40 transition-all shadow-sm col-span-2 md:col-span-4 lg:col-span-1">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Frekuensi Penerbangan</p>
                                <h3 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.total_frekuensi}</h3>
                                <p className="text-[11px] text-muted-foreground font-medium">Pesawat Mendarat/Berangkat</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TAB NAVIGATION SELECTOR */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
                    <div className="flex items-center bg-muted/60 p-1.5 rounded-2xl border border-border/50 text-xs md:text-sm font-medium gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab('harian')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'harian'
                                ? 'bg-background text-foreground shadow-sm font-bold border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Layers className="h-4 w-4 text-emerald-600" />
                            <span>Produk Data A (Harian)</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {daysInMonth} Hari
                            </Badge>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('bulanan')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'bulanan'
                                ? 'bg-background text-foreground shadow-sm font-bold border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <CalendarDays className="h-4 w-4 text-blue-600" />
                            <span>Produk Data B (Bulanan)</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                12 Bulan
                            </Badge>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('frekuensi')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'frekuensi'
                                ? 'bg-background text-foreground shadow-sm font-bold border border-border/60'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Activity className="h-4 w-4 text-indigo-600" />
                            <span>Frekuensi Penerbangan</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {stats.total_frekuensi} Flt
                            </Badge>
                        </button>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Data tersinkronisasi otomatis dari modul laporan bulanan</span>
                    </div>
                </div>

                {/* TAB 1: Produk Data A (Harian) */}
                {activeTab === 'harian' && (
                    <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                        <Layers className="h-5 w-5 text-emerald-600" />
                                        <span>II. A PRODUK PELAYANAN HARIAN ({bulanLabel.toUpperCase()} {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        Daftar jumlah pelayanan dan laporan meteorologi penerbangan harian tanggal 1 s.d. {daysInMonth} {bulanLabel} {selectedTahun}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                                    Total {daysInMonth} Hari
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/60 hover:bg-muted/60 text-xs">
                                            <TableHead className="w-14 text-center font-bold">TGL</TableHead>
                                            <TableHead className="w-24 font-bold">HARI</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">FF LN</TableHead>
                                            <TableHead className="text-center font-bold text-blue-600 dark:text-blue-400">FF DN</TableHead>
                                            <TableHead className="text-center font-bold text-amber-600 dark:text-amber-400">TAF</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">ROFOR</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">SIGMET</TableHead>
                                            <TableHead className="text-center font-bold text-purple-600 dark:text-purple-400">METAR</TableHead>
                                            <TableHead className="text-center font-bold text-sky-600 dark:text-sky-400">SPECI</TableHead>
                                            <TableHead className="text-center font-bold text-teal-600 dark:text-teal-400">MET REPORT</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">SPECIAL</TableHead>
                                            <TableHead className="text-center font-bold">KETERANGAN</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {harianData.map((row) => (
                                            <TableRow key={row.day} className="hover:bg-muted/40 transition-colors text-xs">
                                                <TableCell className="text-center font-bold text-muted-foreground">{row.day}</TableCell>
                                                <TableCell className="font-semibold text-foreground">{row.day_name}</TableCell>
                                                <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                                                    {row.ff_dn > 0 ? (
                                                        <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                                            {row.ff_dn}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-amber-600 dark:text-amber-400">
                                                    {row.taf > 0 ? (
                                                        <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                                            {row.taf}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                <TableCell className="text-center font-bold text-purple-600 dark:text-purple-400">
                                                    {row.metar > 0 ? (
                                                        <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                                                            {row.metar}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-sky-600 dark:text-sky-400">
                                                    {row.speci > 0 ? (
                                                        <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md">
                                                            {row.speci}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-teal-600 dark:text-teal-400">
                                                    {row.met_report > 0 ? (
                                                        <span className="bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md">
                                                            {row.met_report}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground/60">0</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground/60">-</TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Total Summary Row */}
                                        <TableRow className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold border-t-2 border-border text-xs">
                                            <TableCell colSpan={2} className="text-center uppercase tracking-wider font-extrabold text-foreground">
                                                JUMLAH
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-blue-700 dark:text-blue-300 font-extrabold text-sm">
                                                {sumHarian.ff_dn}
                                            </TableCell>
                                            <TableCell className="text-center text-amber-700 dark:text-amber-300 font-extrabold text-sm">
                                                {sumHarian.taf}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-purple-700 dark:text-purple-300 font-extrabold text-sm">
                                                {sumHarian.metar}
                                            </TableCell>
                                            <TableCell className="text-center text-sky-700 dark:text-sky-300 font-extrabold text-sm">
                                                {sumHarian.speci > 0 ? sumHarian.speci : '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-teal-700 dark:text-teal-300 font-extrabold text-sm">
                                                {sumHarian.met_report}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 2: Produk Data B (Bulanan) */}
                {activeTab === 'bulanan' && (
                    <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                        <CalendarDays className="h-5 w-5 text-blue-600" />
                                        <span>II. B PRODUK PELAYANAN BULANAN (TAHUN {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        Rekapitulasi tahunan per bulan untuk seluruh pelayanan produk meteorologi penerbangan tahun {selectedTahun}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-semibold">
                                    Tahun {selectedTahun}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/60 hover:bg-muted/60 text-xs">
                                            <TableHead className="w-14 text-center font-bold">NO</TableHead>
                                            <TableHead className="w-32 font-bold">BULAN</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">FF LN</TableHead>
                                            <TableHead className="text-center font-bold text-blue-600 dark:text-blue-400">FF DN</TableHead>
                                            <TableHead className="text-center font-bold text-amber-600 dark:text-amber-400">TAF</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">ROFOR</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">SIGMET</TableHead>
                                            <TableHead className="text-center font-bold text-purple-600 dark:text-purple-400">METAR</TableHead>
                                            <TableHead className="text-center font-bold text-sky-600 dark:text-sky-400">SPECI</TableHead>
                                            <TableHead className="text-center font-bold text-teal-600 dark:text-teal-400">MET REPORT</TableHead>
                                            <TableHead className="text-center font-bold text-muted-foreground">SPECIAL</TableHead>
                                            <TableHead className="text-center font-bold text-emerald-600 dark:text-emerald-400">FREQ PENERBANGAN</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bulananData.map((row) => {
                                            const isCurrentMonth = row.month === selectedBulan;
                                            return (
                                                <TableRow
                                                    key={row.month}
                                                    className={`hover:bg-muted/40 transition-colors text-xs ${isCurrentMonth ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-medium' : ''
                                                        }`}
                                                >
                                                    <TableCell className="text-center font-bold text-muted-foreground">{row.month}</TableCell>
                                                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                                                        {row.month_name}
                                                        {isCurrentMonth && (
                                                            <Badge className="bg-emerald-600 text-[10px] py-0 px-1.5 h-4 text-white">Bulan Ini</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                    <TableCell className="text-center font-bold text-blue-600 dark:text-blue-400">
                                                        {row.ff_dn > 0 ? (
                                                            <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                                                                {row.ff_dn}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">0</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-amber-600 dark:text-amber-400">
                                                        {row.taf > 0 ? (
                                                            <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                                                                {row.taf}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">0</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                    <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                    <TableCell className="text-center font-bold text-purple-600 dark:text-purple-400">
                                                        {row.metar > 0 ? (
                                                            <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                                                                {row.metar}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">0</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-sky-600 dark:text-sky-400">
                                                        {row.speci > 0 ? (
                                                            <span className="bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-md">
                                                                {row.speci}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-teal-600 dark:text-teal-400">
                                                        {row.met_report > 0 ? (
                                                            <span className="bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md">
                                                                {row.met_report}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">0</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">
                                                        {row.frekuensi_penerbangan > 0 ? (
                                                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                                                                {row.frekuensi_penerbangan}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/60">0</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {/* Total Summary Row */}
                                        <TableRow className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold border-t-2 border-border text-xs">
                                            <TableCell colSpan={2} className="text-center uppercase tracking-wider font-extrabold text-foreground">
                                                JUMLAH TAHUNAN
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-blue-700 dark:text-blue-300 font-extrabold text-sm">
                                                {sumBulanan.ff_dn}
                                            </TableCell>
                                            <TableCell className="text-center text-amber-700 dark:text-amber-300 font-extrabold text-sm">
                                                {sumBulanan.taf}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-purple-700 dark:text-purple-300 font-extrabold text-sm">
                                                {sumBulanan.metar}
                                            </TableCell>
                                            <TableCell className="text-center text-sky-700 dark:text-sky-300 font-extrabold text-sm">
                                                {sumBulanan.speci > 0 ? sumBulanan.speci : '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-teal-700 dark:text-teal-300 font-extrabold text-sm">
                                                {sumBulanan.met_report}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground/60">-</TableCell>
                                            <TableCell className="text-center text-emerald-700 dark:text-emerald-300 font-extrabold text-sm">
                                                {sumBulanan.frekuensi}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 3: Frekuensi Penerbangan Overview */}
                {activeTab === 'frekuensi' && (
                    <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                                        <Plane className="h-5 w-5 text-indigo-600" />
                                        <span>FREKUENSI PENERBANGAN &amp; JADWAL PESAWAT ({bulanLabel.toUpperCase()} {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        Rincian frekuensi penerbangan harian dan jadwal maskapai Stasiun Meteorologi Oesman Sadik untuk bulan {bulanLabel} {selectedTahun}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
                                    Total {sumHarian.ff_dn} Penerbangan
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-4 lg:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-emerald-600" />
                                            Distribusi Frekuensi Penerbangan Harian
                                        </h4>
                                        <span className="text-xs text-muted-foreground">Bulan {bulanLabel} {selectedTahun}</span>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                                        {harianData.map((d) => (
                                            <div
                                                key={d.day}
                                                className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${d.ff_dn > 0
                                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-sm'
                                                    : 'bg-muted/30 border-border/40 text-muted-foreground'
                                                    }`}
                                            >
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d.day_name.substring(0, 3)}</span>
                                                <span className="text-base font-extrabold text-foreground mt-0.5">{d.day}</span>
                                                <span className={`text-[11px] font-bold mt-1 px-2 py-0.5 rounded-lg ${d.ff_dn > 0
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-muted/80 text-muted-foreground/70'
                                                    }`}>
                                                    {d.ff_dn} flt
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                                        Informasi Template Laporan Excel
                                    </h4>
                                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-4 text-xs text-muted-foreground leading-relaxed">
                                        <p className="font-medium text-foreground">
                                            File Excel yang diunduh mencakup 4 lembar kerja (worksheet) resmi:
                                        </p>
                                        <ul className="space-y-2 text-foreground text-xs">
                                            <li className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                                <span><strong className="text-emerald-600 dark:text-emerald-400">Produk Data A</strong>: Tabel harian pelayanan seluruh produk meteorologi tanggal 1–{daysInMonth}.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                                <span><strong className="text-blue-600 dark:text-blue-400">Produk Data B</strong>: Rekapitulasi bulanan sepanjang 12 bulan pada tahun {selectedTahun}.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                                                <span><strong className="text-indigo-600 dark:text-indigo-400">Freq Penerbangan</strong>: Rincian jadwal &amp; frekuensi penerbangan per maskapai.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                                <span><strong className="text-amber-600 dark:text-amber-400">WXREV</strong>: Rekapitulasi sandi observasi sinoptik bulanan.</span>
                                            </li>
                                        </ul>
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleDownloadExcel}
                                                disabled={isDownloading}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold rounded-xl shadow-md"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download Template Lengkap
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div >
        </>
    );
}

ProdukBulanan.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>
        {page}
    </AppLayout>
);
