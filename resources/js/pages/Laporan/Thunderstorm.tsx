import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
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
    AlertTriangle,
    Calendar,
    CloudLightning,
    Download,
    Eye,
    FileText,
    Filter,
    Info,
    Sparkles,
    Sun,
    Zap,
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
    temp_dewpoint: number | null;
    humidity: number | null;
    wind_dir: number | null;
    wind_speed: number | null;
    visibility: number | null;
    rainfall: number | null;
    present_weather_ww: string | null;
    past_weather_w1: string | null;
    past_weather_w2: string | null;
    observer_name: string | null;
    pegawai: Pegawai | null;
    category_label: string;
    slot_time_utc: string;
    slot_time_wit: string;
    sent_timestamp_display: string;
}

interface MatrixDayItem {
    valid: boolean;
    code: string; // 'x' or '-'
    slots_count: number;
    has_ts: boolean;
}

interface MatrixMonthRow {
    month_num: number;
    month_name: string;
    days: Record<number, MatrixDayItem>;
    total_ts_days: number;
    days_in_month: number;
}

interface YearlyMatrixInfo {
    matrix: Record<number, MatrixMonthRow>;
    monthly_totals: Record<number, number>;
    yearly_total_days: number;
    yearly_total_slots: number;
}

interface DashboardStats {
    yearly_total_days: number;
    yearly_total_slots: number;
    monthly_ts_days: number;
    monthly_ts_slots: number;
    active_ts_count: number;
    past_ts_count: number;
    most_active_month: string;
    most_active_month_days: number;
}

interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface ThunderstormProps {
    thunderstormRecords: PaginatedResponse<DataSinoptikItem>;
    bulan: number;
    tahun: number;
    yearlyMatrixInfo: YearlyMatrixInfo;
    dashboardStats: DashboardStats;
}

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ThunderstormIndex({
    thunderstormRecords,
    bulan,
    tahun,
    yearlyMatrixInfo,
    dashboardStats,
}: ThunderstormProps) {
    const [selectedItem, setSelectedItem] = useState<DataSinoptikItem | null>(null);

    const handleFilterChange = (newBulan?: number, newTahun?: number) => {
        router.get(
            '/laporan/thunderstorm',
            {
                bulan: newBulan !== undefined ? newBulan : bulan,
                tahun: newTahun !== undefined ? newTahun : tahun,
            },
            { preserveState: true }
        );
    };

    const handleExportDocx = () => {
        window.open(`/laporan/thunderstorm/export-docx?tahun=${tahun}&bulan=${bulan}`, '_blank');
    };

    const recordsList = thunderstormRecords.data || [];
    const matrix = yearlyMatrixInfo.matrix || {};

    return (
        <>
            <Head title="Laporan & Frekuensi Thunderstorm" />

            <div className="space-y-6 pb-12 w-full max-w-full overflow-hidden">
                {/* Header Title & Controls */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-amber-900/90 via-slate-900 to-amber-950 p-6 rounded-2xl text-white shadow-xl border border-amber-800/40">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                                <Zap className="w-6 h-6 animate-pulse" />
                            </span>
                            <h1 className="text-2xl font-black tracking-tight text-white">
                                Dashboard Frekuensi Thunderstorm
                            </h1>
                        </div>
                        <p className="text-sm text-amber-200/80 font-medium pl-10">
                            Analisis & Rekapitulasi Kejadian Badai Guntur (Sandi WWW1W2) • Stasiun Meteorologi Oesman Sadik
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Filter Bulan */}
                        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-amber-700/30">
                            <Filter className="w-4 h-4 text-amber-400 ml-2" />
                            <Select
                                value={String(bulan)}
                                onValueChange={(val) => handleFilterChange(Number(val), tahun)}
                            >
                                <SelectTrigger className="w-[130px] bg-slate-900/90 border-slate-700 text-white text-xs h-9">
                                    <SelectValue placeholder="Bulan" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                                    {NAMA_BULAN.map((name, idx) => (
                                        <SelectItem key={idx + 1} value={String(idx + 1)}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Filter Tahun */}
                            <Select
                                value={String(tahun)}
                                onValueChange={(val) => handleFilterChange(bulan, Number(val))}
                            >
                                <SelectTrigger className="w-[95px] bg-slate-900/90 border-slate-700 text-white text-xs h-9">
                                    <SelectValue placeholder="Tahun" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Export DOCX Button */}
                        <Button
                            onClick={handleExportDocx}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 gap-2 h-10 px-4 rounded-xl border border-amber-400/50"
                        >
                            <Download className="w-4 h-4" />
                            Unduh Laporan (.docx)
                        </Button>
                    </div>
                </div>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600">Total Hari TS ({tahun})</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-amber-600">
                                        {dashboardStats.yearly_total_days}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">Hari</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Total frekuensi hari thunderstorm tahunan</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
                                <Calendar className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600">Slot TS ({NAMA_BULAN[bulan - 1]})</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-amber-600">
                                        {dashboardStats.monthly_ts_slots}
                                    </span>
                                    <span className="text-xs font-medium text-slate-500">Slot Jam</span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {dashboardStats.monthly_ts_days} Hari TS di bulan ini
                                </p>
                            </div>
                            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
                                <Zap className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600">Tipe TS ({NAMA_BULAN[bulan - 1]})</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-amber-700">
                                        {dashboardStats.active_ts_count}
                                    </span>
                                    <span className="text-xs text-slate-500">Aktif</span>
                                    <span className="text-xs text-slate-300">/</span>
                                    <span className="text-2xl font-black text-indigo-600">
                                        {dashboardStats.past_ts_count}
                                    </span>
                                    <span className="text-xs text-slate-500">ReTS</span>
                                </div>
                                <p className="text-[11px] text-slate-500">Berdasarkan sandi ww vs w1/w2</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
                                <CloudLightning className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-slate-600">Bulan Paling Aktif ({tahun})</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-amber-600">
                                        {dashboardStats.most_active_month}
                                    </span>
                                </div>
                                <p className="text-[11px] font-semibold text-amber-700">
                                    {dashboardStats.most_active_month_days} Hari Thunderstorm
                                </p>
                            </div>
                            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
                                <Activity className="w-6 h-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Yearly Matrix Card (Format Sesuai Template docx) */}
                <Card className="border-slate-200 shadow-md">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    Matriks Frekuensi Thunderstorm Dalam Sandi WWW1W2 (Tahun {tahun})
                                </CardTitle>
                                <p className="text-xs text-slate-600 mt-1">
                                    Format rekapitulasi standar BMKG (Bulan 1–12 vs Tanggal 1–31)
                                </p>
                            </div>
                            <Badge variant="outline" className="w-fit bg-amber-50 text-amber-800 border-amber-300 font-bold text-xs">
                                Total Tahun {tahun}: {yearlyMatrixInfo.yearly_total_days} Hari TS
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto max-w-full">
                        <Table className="text-xs min-w-[960px] w-full border-collapse">
                            <TableHeader>
                                <TableRow className="bg-slate-100/80 text-center font-bold">
                                    <TableHead className="w-[110px] text-center font-bold text-slate-900 sticky left-0 z-10 bg-slate-100 border-r border-slate-200 shadow-sm">
                                        BULAN / TGL
                                    </TableHead>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                        <TableHead key={d} className="w-[26px] min-w-[26px] p-0.5 text-center font-semibold text-slate-700 border-r border-slate-200/50 text-[11px]">
                                            {d}
                                        </TableHead>
                                    ))}
                                    <TableHead className="w-[60px] text-center font-bold text-amber-900 bg-amber-100/50 text-[11px]">
                                        TOTAL
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.values(matrix).map((mRow) => {
                                    const isSelectedMonth = mRow.month_num === bulan;
                                    return (
                                        <TableRow
                                            key={mRow.month_num}
                                            className={
                                                isSelectedMonth
                                                    ? 'bg-amber-50/70 font-semibold'
                                                    : 'hover:bg-slate-50'
                                            }
                                        >
                                            <TableCell className="font-bold text-slate-900 sticky left-0 z-10 bg-white border-r border-slate-200 text-center py-1.5 text-xs shadow-sm">
                                                {mRow.month_name}
                                            </TableCell>
                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                                                const dayData = mRow.days[d];
                                                if (!dayData || !dayData.valid) {
                                                    return (
                                                        <TableCell
                                                            key={d}
                                                            className="p-1 text-center bg-slate-100/40 text-slate-300 border-r border-slate-200/40"
                                                        />
                                                    );
                                                }

                                                return (
                                                    <TableCell
                                                        key={d}
                                                        className={`p-1 text-center font-mono border-r border-slate-200/50 ${
                                                            dayData.has_ts
                                                                ? 'bg-amber-400/20 text-amber-950 font-extrabold'
                                                                : 'text-slate-400'
                                                        }`}
                                                        title={
                                                            dayData.has_ts
                                                                ? `${mRow.month_name} tgl ${d}: ${dayData.slots_count} slot TS`
                                                                : `${mRow.month_name} tgl ${d}: Tidak ada TS`
                                                        }
                                                    >
                                                        {dayData.code}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center font-black text-amber-700 bg-amber-50/40 py-2">
                                                {mRow.total_ts_days}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Legend Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-4">
                                <span className="font-semibold text-slate-800">Keterangan:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-amber-400/30 border border-amber-400/60 text-amber-900 font-extrabold flex items-center justify-center text-xs">
                                        x
                                    </span>
                                    <span>Ada 1 atau lebih kilat / thunderstorm dalam sandi WWW1W2</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs">
                                        -
                                    </span>
                                    <span>Tidak ada kilat / thunderstorm dalam sandi WWW1W2</span>
                                </div>
                            </div>

                            <span className="text-[11px] italic text-slate-500">
                                Diperbarui otomatis dari database data_sinoptik
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Table Card (Rincian Slot Pengamatan TS per Bulan) */}
                <Card className="border-slate-200 shadow-md">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-amber-600" />
                                    Rincian Slot Kejadian Thunderstorm ({NAMA_BULAN[bulan - 1]} {tahun})
                                </CardTitle>
                                <p className="text-xs text-slate-600 mt-1">
                                    Daftar pengamatan Sinoptik yang memenuhi kriteria Thunderstorm (ww=17,29,91-96,98-99 atau w1/w2=9)
                                </p>
                            </div>
                            <Badge variant="secondary" className="w-fit">
                                {thunderstormRecords.total} Data Slot Ditemukan
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recordsList.length === 0 ? (
                            <div className="py-12 text-center space-y-3">
                                <div className="p-4 bg-slate-100 w-fit rounded-full mx-auto text-slate-400">
                                    <Sun className="w-8 h-8" />
                                </div>
                                <p className="font-semibold text-slate-700 text-sm">
                                    Tidak Ada Kejadian Thunderstorm
                                </p>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Tidak terdeteksi adanya slot pengamatan Thunderstorm untuk periode {NAMA_BULAN[bulan - 1]} {tahun}.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow className="bg-slate-100/70">
                                            <TableHead className="w-[50px] text-center">No</TableHead>
                                            <TableHead className="w-[180px]">Waktu Pengamatan</TableHead>
                                            <TableHead className="w-[240px]">Kategori Thunderstorm</TableHead>
                                            <TableHead className="w-[120px] text-center">ww / w1 / w2</TableHead>
                                            <TableHead className="w-[140px]">Suhu / Td</TableHead>
                                            <TableHead className="w-[140px]">Angin & Visibility</TableHead>
                                            <TableHead className="w-[160px]">Pengamat</TableHead>
                                            <TableHead className="w-[80px] text-center">Sandi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recordsList.map((item, idx) => {
                                            const recIndex =
                                                ((thunderstormRecords.current_page || 1) - 1) *
                                                    (thunderstormRecords.per_page || 15) +
                                                idx +
                                                1;

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50">
                                                    <TableCell className="text-center font-medium text-slate-500">
                                                        {recIndex}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-bold text-slate-900">
                                                            {item.slot_time_utc}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {item.slot_time_wit}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-slate-800">
                                                            {item.category_label}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1 font-mono font-bold">
                                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                                                                {item.present_weather_ww ?? '-'}
                                                            </span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                                {item.past_weather_w1 ?? '-'}
                                                            </span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                                                {item.past_weather_w2 ?? '-'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>{item.temp_drybulb ?? '-'} °C</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            Td: {item.temp_dewpoint ?? '-'} °C ({item.humidity ?? '-'}%)
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>{item.wind_dir ?? '-'}° / {item.wind_speed ?? '-'} kt</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            Vis: {item.visibility ?? '-'} km
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium text-slate-700">
                                                            {item.pegawai?.nama || item.observer_name || '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() => setSelectedItem(item)}
                                                            title="Lihat Sandi AAXX"
                                                        >
                                                            <Eye className="w-4 h-4 text-amber-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        {thunderstormRecords.total > 0 && (
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                                <span className="text-slate-500">
                                    Menampilkan {thunderstormRecords.from || 0}–{thunderstormRecords.to || 0} dari {thunderstormRecords.total} slot kejadian
                                </span>
                                <div className="flex items-center gap-1">
                                    {thunderstormRecords.links.map((link, k) => (
                                        <Button
                                            key={k}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal Detail Sandi AAXX */}
            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-600" />
                            Detail Slot Thunderstorm
                        </DialogTitle>
                    </DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4 text-xs">
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                                <p className="font-bold text-amber-900 text-sm">
                                    {selectedItem.slot_time_utc}
                                </p>
                                <p className="text-slate-600">
                                    Kategori: <strong className="text-slate-900">{selectedItem.category_label}</strong>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <p className="font-bold text-slate-700">Teks Sandi AAXX Sinoptik (GTS):</p>
                                <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto">
                                    {selectedItem.sandi || 'Sandi tidak tersedia'}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

ThunderstormIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/sinoptik' },
            { title: 'Thunderstorm', href: '/laporan/thunderstorm' },
        ]}
    >
        {page}
    </AppLayout>
);
