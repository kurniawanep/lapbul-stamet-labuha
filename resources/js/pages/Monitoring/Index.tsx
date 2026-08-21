import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    Eye, 
    FileText, 
    Gauge, 
    ShieldCheck, 
    Sun, 
    TrendingUp, 
    UserCheck, 
    Wind,
    Radio
} from 'lucide-react';

interface StaffDetailItem {
    type: string;
    slot_time: string;
    sent_at: string;
    status: 'Terlambat' | 'Missing Data';
    delay_minutes: number;
    note: string;
}

interface StaffPerformance {
    pegawai: {
        id: number;
        nama: string;
        nip: string | null;
        jabatan: string | null;
    };
    total_assigned: number;
    timely_count: number;
    timely_rate_pct: number;
    late_count: number;
    late_rate_pct: number;
    avg_delay_minutes: number;
    missing_count: number;
    missing_rate_pct: number;
    breakdown: {
        sinop: { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number };
        metar: { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number };
        pibal_ppaa: { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number };
        pibal_ppbb: { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number };
        tafor: { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number };
    };
    details: StaffDetailItem[];
}

interface Props {
    filters: {
        bulan: number;
        tahun: number;
    };
    summary: {
        total_slots: number;
        total_timely: number;
        total_late: number;
        total_missing: number;
        overall_compliance_pct: number;
        top_observer: string;
    };
    awos_summary?: {
        total_slots: number;
        timely: number;
        late: number;
        missing: number;
        availability_pct: number;
    };
    hourly_delays: number[];
    staff_rankings: StaffPerformance[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Monitoring Performa', href: '/monitoring' },
];

const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MonitoringIndex({ filters, summary, awos_summary, hourly_delays, staff_rankings }: Props) {
    const [selectedBulan, setSelectedBulan] = useState(filters.bulan);
    const [selectedTahun, setSelectedTahun] = useState(filters.tahun);
    const [selectedStaff, setSelectedStaff] = useState<StaffPerformance | null>(null);

    const handleFilterChange = (b = selectedBulan, y = selectedTahun) => {
        router.get('/monitoring', { bulan: b, tahun: y }, { preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Monitoring Performa Pengamatan - Kepala Stasiun" />

            <div className="space-y-6 p-6">
                {/* Title & Filter Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                            Monitoring Performa Pengamatan (Kepala Stasiun)
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Evaluasi ketepatan waktu pengiriman, durasi keterlambatan, dan missing data untuk Sinoptik, METAR Manual (06-18 WIT), dan PIBAL per pegawai.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-500 font-medium">Bulan:</Label>
                            <select
                                value={selectedBulan}
                                onChange={(e) => {
                                    const b = Number(e.target.value);
                                    setSelectedBulan(b);
                                    handleFilterChange(b, selectedTahun);
                                }}
                                className="h-9 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium"
                            >
                                {namaBulan.map((name, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-500 font-medium">Tahun:</Label>
                            <select
                                value={selectedTahun}
                                onChange={(e) => {
                                    const y = Number(e.target.value);
                                    setSelectedTahun(y);
                                    handleFilterChange(selectedBulan, y);
                                }}
                                className="h-9 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium"
                            >
                                {[2024, 2025, 2026, 2027].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Station KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Slot Manual Staf</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.total_slots}</h3>
                            <p className="text-xs text-slate-500 mt-1">Sinop, METAR (06-18 WIT), Pibal</p>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">% Ketepatan Waktu Staf</p>
                            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.overall_compliance_pct}%</h3>
                            <p className="text-xs text-slate-500 mt-1">{summary.total_timely} slot tepat waktu</p>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-100 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Total Keterlambatan</p>
                            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{summary.total_late}</h3>
                            <p className="text-xs text-slate-500 mt-1">Pengiriman melebihi batas</p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 dark:border-red-900/50 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-slate-900">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Missing Data Staf</p>
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.total_missing}</h3>
                            <p className="text-xs text-slate-500 mt-1">Slot data tidak diisi</p>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/50 to-white dark:from-sky-950/20 dark:to-slate-900">
                        <CardContent className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
                                <Radio className="h-3.5 w-3.5" /> AWOS Auto Availability
                            </p>
                            <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
                                {awos_summary ? `${awos_summary.availability_pct}%` : '100%'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Status Sensor Otomatis (18:30-05:30 WIT)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Hourly Delay Heatmap */}
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            Analisis Jam Rawan Keterlambatan / Missing Data (24 Jam UTC)
                        </h4>
                        <span className="text-xs text-slate-500">Keterlambatan per slot jam UTC</span>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5">
                        {hourly_delays.map((count, hr) => (
                            <div
                                key={hr}
                                title={`Jam ${hr.toString().padStart(2, '0')}:00 UTC - ${count} Keterlambatan/Missing`}
                                className={`p-2 rounded text-center border transition-all ${
                                    count === 0
                                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                        : count <= 2
                                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 text-amber-800 dark:text-amber-300 font-bold'
                                        : 'bg-red-100 dark:bg-red-950/60 border-red-300 text-red-800 dark:text-red-300 font-bold'
                                }`}
                            >
                                <div className="text-[11px] font-mono font-semibold">{hr.toString().padStart(2, '0')}</div>
                                <div className="text-[10px] mt-0.5">{count > 0 ? count : '-'}</div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Main Leaderboard Table */}
                <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <CardHeader className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            Performa Pengamatan per Pegawai - {namaBulan[selectedBulan - 1]} {selectedTahun}
                        </CardTitle>
                        <CardDescription>
                            Daftar staf operasional diurutkan berdasarkan ketepatan waktu pengiriman observasi manual.
                        </CardDescription>
                    </CardHeader>

                    <Table>
                        <TableHeader className="bg-slate-100/70 dark:bg-slate-900/80">
                            <TableRow>
                                <TableHead className="w-[50px]">Rank</TableHead>
                                <TableHead>Nama Pegawai & NIP</TableHead>
                                <TableHead className="text-center">Total Slot</TableHead>
                                <TableHead className="w-[180px]">Ketepatan Waktu (%)</TableHead>
                                <TableHead className="text-center">Breakdown (Sinop / METAR / PPAA / PPBB / TAFOR)</TableHead>
                                <TableHead className="text-center">Terlambat</TableHead>
                                <TableHead className="text-center">Rata-rata Delay</TableHead>
                                <TableHead className="text-center">Missing Data</TableHead>
                                <TableHead className="text-right">Detail</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {staff_rankings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                                        Belum ada data pengamatan untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staff_rankings.map((item, index) => (
                                    <TableRow key={item.pegawai.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                        <TableCell className="font-bold text-center text-slate-500">
                                            #{index + 1}
                                        </TableCell>

                                        <TableCell>
                                            <div className="font-semibold text-slate-900 dark:text-white">{item.pegawai.nama}</div>
                                            <div className="text-xs text-slate-500">{item.pegawai.nip || item.pegawai.jabatan || 'Staf Operasional'}</div>
                                        </TableCell>

                                        <TableCell className="text-center font-semibold">
                                            {item.total_assigned}
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs font-bold">
                                                    <span className={item.timely_rate_pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                        {item.timely_rate_pct}%
                                                    </span>
                                                    <span className="text-slate-400 font-normal">({item.timely_count}/{item.total_assigned})</span>
                                                </div>
                                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full transition-all ${
                                                            item.timely_rate_pct >= 90 ? 'bg-emerald-500' : item.timely_rate_pct >= 75 ? 'bg-amber-500' : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${Math.min(100, item.timely_rate_pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-900">
                                                    Sinop: {item.breakdown?.sinop?.timely_pct ?? 0}%
                                                </Badge>
                                                <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-900">
                                                    METAR: {item.breakdown?.metar?.timely_pct ?? 0}%
                                                </Badge>
                                                <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-900">
                                                    PPAA: {item.breakdown?.pibal_ppaa?.timely_pct ?? (item.breakdown as any)?.pibal?.timely_pct ?? 0}%
                                                </Badge>
                                                <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-900">
                                                    PPBB: {item.breakdown?.pibal_ppbb?.timely_pct ?? (item.breakdown as any)?.pibal?.timely_pct ?? 0}%
                                                </Badge>
                                                <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                    TAFOR: {item.breakdown?.tafor?.timely_pct ?? 0}%
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {item.late_count > 0 ? (
                                                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                    {item.late_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-center font-medium text-xs">
                                            {item.avg_delay_minutes > 0 ? `${item.avg_delay_minutes} mnt` : '-'}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {item.missing_count > 0 ? (
                                                <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                                    {item.missing_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">0</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedStaff(item)}
                                                className="h-8 text-xs border text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
                                            >
                                                <Eye className="h-3.5 w-3.5 mr-1" />
                                                Detail Riwayat
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Individual Staff Detail Log Modal */}
                {selectedStaff && (
                    <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                    <UserCheck className="h-5 w-5" />
                                    Detail Riwayat Pengamatan - {selectedStaff.pegawai.nama}
                                </DialogTitle>
                                <DialogDescription>
                                    Rincian daftar keterlambatan dan missing data pada periode {namaBulan[selectedBulan - 1]} {selectedTahun}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-3 space-y-4">
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-xs">
                                    <div>
                                        <span className="text-slate-500">Total Slot Manual:</span>
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{selectedStaff.total_assigned}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Total Terlambat:</span>
                                        <div className="font-bold text-sm text-amber-600">{selectedStaff.late_count} ({selectedStaff.avg_delay_minutes} mnt avg)</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Missing Data:</span>
                                        <div className="font-bold text-sm text-red-600">{selectedStaff.missing_count}</div>
                                    </div>
                                </div>

                                <Table className="border rounded-md text-xs">
                                    <TableHeader className="bg-slate-100 dark:bg-slate-800">
                                        <TableRow>
                                            <TableHead>Jenis Data</TableHead>
                                            <TableHead>Waktu Slot (UTC)</TableHead>
                                            <TableHead>Waktu Dikirim (UTC)</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Durasi Delay</TableHead>
                                            <TableHead>Keterangan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedStaff.details.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6 text-emerald-600 font-semibold">
                                                    Sempurna! Tidak ada keterlambatan maupun missing data pada periode ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            selectedStaff.details.map((det, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-bold">{det.type}</TableCell>
                                                    <TableCell className="font-mono">{det.slot_time}</TableCell>
                                                    <TableCell className="font-mono">{det.sent_at}</TableCell>
                                                    <TableCell>
                                                        {det.status === 'Terlambat' ? (
                                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                                Terlambat
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                                                Missing
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-amber-700 dark:text-amber-400">
                                                        {det.delay_minutes > 0 ? `+${det.delay_minutes} mnt` : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500">{det.note}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </>
    );
}

MonitoringIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Monitoring Performa', href: '/monitoring' },
        ]}
    >
        {page}
    </AppLayout>
);

