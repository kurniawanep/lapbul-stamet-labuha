import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Download, 
    FileSpreadsheet, 
    Plane, 
    CloudRain, 
    Gauge, 
    MessageSquare, 
    Calendar,
    Layers,
    ChevronRight,
    Sparkles,
    CheckCircle2,
    CalendarDays
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Produk Bulanan - ${bulanLabel} ${selectedTahun}`} />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 md:p-8 text-white shadow-lg">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-white/20">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Laporan Produk Pelayanan Meteorologi Penerbangan</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                                Produk Bulanan ({bulanLabel} {selectedTahun})
                            </h1>
                            <p className="text-sm text-emerald-100 max-w-2xl">
                                Rekapitulasi lengkap pelayanan informasi meteorologi penerbangan (Flight Document, TAFOR, METAR, MET REPORT) dan frekuensi penerbangan Stasiun Meteorologi Oesman Sadik.
                            </p>
                        </div>

                        {/* Export Action Button */}
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleDownloadExcel}
                                disabled={isDownloading}
                                size="lg"
                                className="bg-white text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 font-semibold shadow-md gap-2 transition-all duration-200"
                            >
                                <Download className={`h-4 w-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                                {isDownloading ? 'Menyiapkan Excel...' : 'Download Laporan Excel'}
                            </Button>
                        </div>
                    </div>

                    {/* Subtle decorative background circles */}
                    <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                    <div className="absolute -left-12 -bottom-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-xl pointer-events-none" />
                </div>

                {/* Filter and Period Selection Bar */}
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-4 md:p-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Pilih Periode:</span>
                            </div>

                            {/* Month Select */}
                            <select
                                value={selectedBulan}
                                onChange={(e) => handleFilterChange(Number(e.target.value), selectedTahun)}
                                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                            >
                                {listBulan.map((b) => (
                                    <option key={b.value} value={b.value}>
                                        {b.label}
                                    </option>
                                ))}
                            </select>

                            {/* Year Select */}
                            <select
                                value={selectedTahun}
                                onChange={(e) => handleFilterChange(selectedBulan, Number(e.target.value))}
                                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                            >
                                {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                                    <option key={yr} value={yr}>
                                        {yr}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Active Tab Switcher */}
                        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/50 text-xs md:text-sm font-medium">
                            <button
                                type="button"
                                onClick={() => setActiveTab('harian')}
                                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'harian'
                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Produk Data A (Harian)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('bulanan')}
                                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'bulanan'
                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Produk Data B (Bulanan)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('frekuensi')}
                                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'frekuensi'
                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Frekuensi Penerbangan
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Key Metric Highlights Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-border/60 hover:border-emerald-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Flight Document (FF)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_ff_dn}</h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Dalam Negeri</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Plane className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-emerald-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Produk TAFOR (TAF)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_taf}</h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Prakiraan Bandara</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                <CloudRain className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-emerald-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">METAR / SPECI</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                    {stats.total_metar} {stats.total_speci > 0 && <span className="text-xs font-normal text-muted-foreground">(+{stats.total_speci} SPECI)</span>}
                                </h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Laporan Rutin 1/2 Jam</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Gauge className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-emerald-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">MET REPORT (QAM)</p>
                                <h3 className="text-2xl font-bold tracking-tight text-foreground">{stats.total_met_report}</h3>
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Lokal Rutin Bandara</p>
                            </div>
                            <div className="h-11 w-11 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* TAB 1: Produk Data A (Harian) */}
                {activeTab === 'harian' && (
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Layers className="h-5 w-5 text-emerald-600" />
                                        <span>II. A PRODUK PELAYANAN HARIAN ({bulanLabel.toUpperCase()} {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Daftar jumlah pelayanan dan laporan meteorologi penerbangan harian tanggal 1 s.d. {daysInMonth}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                    Total {daysInMonth} Hari
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="w-16 text-center font-bold">TGL</TableHead>
                                            <TableHead className="font-bold">HARI</TableHead>
                                            <TableHead className="text-center font-bold">FF LN</TableHead>
                                            <TableHead className="text-center font-bold text-blue-600 dark:text-blue-400">FF DN</TableHead>
                                            <TableHead className="text-center font-bold text-amber-600 dark:text-amber-400">TAF</TableHead>
                                            <TableHead className="text-center font-bold">ROFOR</TableHead>
                                            <TableHead className="text-center font-bold">SIGMET</TableHead>
                                            <TableHead className="text-center font-bold text-purple-600 dark:text-purple-400">METAR</TableHead>
                                            <TableHead className="text-center font-bold">SPECI</TableHead>
                                            <TableHead className="text-center font-bold text-teal-600 dark:text-teal-400">MET REPORT</TableHead>
                                            <TableHead className="text-center font-bold">SPECIAL</TableHead>
                                            <TableHead className="text-center font-bold">KETERANGAN</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {harianData.map((row) => (
                                            <TableRow key={row.day} className="hover:bg-muted/40 transition-colors">
                                                <TableCell className="text-center font-semibold text-muted-foreground">{row.day}</TableCell>
                                                <TableCell className="font-medium text-foreground">{row.day_name}</TableCell>
                                                <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                <TableCell className="text-center font-semibold text-blue-600 dark:text-blue-400">
                                                    {row.ff_dn > 0 ? row.ff_dn : 0}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-amber-600 dark:text-amber-400">
                                                    {row.taf > 0 ? row.taf : 0}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                <TableCell className="text-center font-semibold text-purple-600 dark:text-purple-400">
                                                    {row.metar > 0 ? row.metar : 0}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">
                                                    {row.speci > 0 ? row.speci : '-'}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-teal-600 dark:text-teal-400">
                                                    {row.met_report > 0 ? row.met_report : 0}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                <TableCell className="text-center text-xs text-muted-foreground">-</TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Total Summary Row */}
                                        <TableRow className="bg-muted/80 hover:bg-muted/80 font-bold border-t-2 border-border">
                                            <TableCell colSpan={2} className="text-center uppercase tracking-wider text-xs">
                                                JUMLAH
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-blue-600 dark:text-blue-400 text-base">
                                                {sumHarian.ff_dn}
                                            </TableCell>
                                            <TableCell className="text-center text-amber-600 dark:text-amber-400 text-base">
                                                {sumHarian.taf}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-purple-600 dark:text-purple-400 text-base">
                                                {sumHarian.metar}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {sumHarian.speci > 0 ? sumHarian.speci : '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-teal-600 dark:text-teal-400 text-base">
                                                {sumHarian.met_report}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 2: Produk Data B (Bulanan) */}
                {activeTab === 'bulanan' && (
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <CalendarDays className="h-5 w-5 text-emerald-600" />
                                        <span>II. B PRODUK PELAYANAN BULANAN (TAHUN {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Rekapitulasi tahunan per bulan untuk seluruh pelayanan produk meteorologi penerbangan
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                    Tahun {selectedTahun}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="w-16 text-center font-bold">NO</TableHead>
                                            <TableHead className="font-bold">BULAN</TableHead>
                                            <TableHead className="text-center font-bold">FF LN</TableHead>
                                            <TableHead className="text-center font-bold text-blue-600 dark:text-blue-400">FF DN</TableHead>
                                            <TableHead className="text-center font-bold text-amber-600 dark:text-amber-400">TAF</TableHead>
                                            <TableHead className="text-center font-bold">ROFOR</TableHead>
                                            <TableHead className="text-center font-bold">SIGMET</TableHead>
                                            <TableHead className="text-center font-bold text-purple-600 dark:text-purple-400">METAR</TableHead>
                                            <TableHead className="text-center font-bold">SPECI</TableHead>
                                            <TableHead className="text-center font-bold text-teal-600 dark:text-teal-400">MET REPORT</TableHead>
                                            <TableHead className="text-center font-bold">SPECIAL</TableHead>
                                            <TableHead className="text-center font-bold text-emerald-600 dark:text-emerald-400">FREQ PENERBANGAN</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bulananData.map((row) => {
                                            const isCurrentMonth = row.month === selectedBulan;
                                            return (
                                                <TableRow 
                                                    key={row.month} 
                                                    className={`hover:bg-muted/40 transition-colors ${
                                                        isCurrentMonth ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-medium' : ''
                                                    }`}
                                                >
                                                    <TableCell className="text-center font-semibold text-muted-foreground">{row.month}</TableCell>
                                                    <TableCell className="font-medium text-foreground flex items-center gap-2">
                                                        {row.month_name}
                                                        {isCurrentMonth && (
                                                            <Badge className="bg-emerald-600 text-[10px] py-0 px-1.5 h-4">Aktif</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                    <TableCell className="text-center font-semibold text-blue-600 dark:text-blue-400">
                                                        {row.ff_dn}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-amber-600 dark:text-amber-400">
                                                        {row.taf}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                    <TableCell className="text-center font-semibold text-purple-600 dark:text-purple-400">
                                                        {row.metar}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">
                                                        {row.speci > 0 ? row.speci : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-teal-600 dark:text-teal-400">
                                                        {row.met_report}
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                                                    <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {row.frekuensi_penerbangan}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}

                                        {/* Total Summary Row */}
                                        <TableRow className="bg-muted/80 hover:bg-muted/80 font-bold border-t-2 border-border">
                                            <TableCell colSpan={2} className="text-center uppercase tracking-wider text-xs">
                                                JUMLAH TAHUNAN
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-blue-600 dark:text-blue-400 text-base">
                                                {sumBulanan.ff_dn}
                                            </TableCell>
                                            <TableCell className="text-center text-amber-600 dark:text-amber-400 text-base">
                                                {sumBulanan.taf}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-purple-600 dark:text-purple-400 text-base">
                                                {sumBulanan.metar}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {sumBulanan.speci > 0 ? sumBulanan.speci : '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-teal-600 dark:text-teal-400 text-base">
                                                {sumBulanan.met_report}
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">-</TableCell>
                                            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 text-base">
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
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Plane className="h-5 w-5 text-emerald-600" />
                                        <span>FREKUENSI PENERBANGAN & JADWAL PESAWAT ({bulanLabel.toUpperCase()} {selectedTahun})</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Rincian jadwal dan frekuensi penerbangan maskapai harian untuk bulan {bulanLabel} {selectedTahun}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                                    Total {sumHarian.ff_dn} Penerbangan
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4 md:col-span-2">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        Distribusi Penerbangan Harian
                                    </h4>
                                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                        {harianData.map((d) => (
                                            <div
                                                key={d.day}
                                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                                    d.ff_dn > 0
                                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                                                        : 'bg-muted/20 border-border/40 text-muted-foreground'
                                                }`}
                                            >
                                                <span className="text-[11px] font-medium text-muted-foreground">{d.day_name.substring(0, 3)}</span>
                                                <span className="text-sm font-bold text-foreground">{d.day}</span>
                                                <span className={`text-xs font-semibold mt-1 px-1.5 py-0.5 rounded-md ${
                                                    d.ff_dn > 0
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}>
                                                    {d.ff_dn} flt
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-teal-600" />
                                        Informasi Template Excel
                                    </h4>
                                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 text-xs text-muted-foreground leading-relaxed">
                                        <p>
                                            Template Excel mencakup 4 lembar kerja (worksheet):
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 text-foreground font-medium">
                                            <li><span className="text-emerald-600 dark:text-emerald-400">Produk Data A</span>: Laporan harian pelayanan meteorologi</li>
                                            <li><span className="text-emerald-600 dark:text-emerald-400">Produk Data B</span>: Rekapitulasi bulanan sepanjang tahun</li>
                                            <li><span className="text-emerald-600 dark:text-emerald-400">Freq Penerbangan</span>: Jadwal & frekuensi penerbangan maskapai</li>
                                            <li><span className="text-emerald-600 dark:text-emerald-400">WXREV</span>: Kumpulan berita sandi observasi sinoptik</li>
                                        </ul>
                                        <div className="pt-2">
                                            <Button
                                                onClick={handleDownloadExcel}
                                                disabled={isDownloading}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
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
            </div>
        </AppLayout>
    );
}
