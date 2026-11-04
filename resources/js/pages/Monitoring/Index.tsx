import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    Radio,
    Share2,
    Filter,
    Layers,
    User,
    ArrowRight,
    Search,
    Award
} from 'lucide-react';
import Performance12MonthChart, { Trend12MonthsData } from '@/components/monitoring/Performance12MonthChart';
import IndividualStaffPerformance, { StaffPerformance, StaffDetailItem } from '@/components/monitoring/IndividualStaffPerformance';

interface Props {
    filters: {
        bulan: number;
        tahun: number;
        parameter?: string;
        staff_id?: number | null;
        tab?: string;
    };
    summary: {
        total_slots: number;
        total_timely: number;
        total_late: number;
        total_missing: number;
        overall_compliance_pct: number;
        top_observer: string;
        breakdown?: Record<string, { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay: number }>;
    };
    dissemination_summary?: {
        total: number;
        daily_avg: number;
    };
    awos_summary?: {
        total_slots: number;
        timely: number;
        late: number;
        missing: number;
        availability_pct: number;
    };
    hourly_delays: number[];
    hourly_delays_by_param?: Record<string, number[]>;
    staff_rankings: StaffPerformance[];
    trend_12_months?: Trend12MonthsData;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Monitoring Performa', href: '/monitoring' },
];

const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const PARAMETERS = [
    { id: 'all', label: 'Semua Parameter', icon: Layers, desc: 'Sinop, METAR, PPAA, PPBB, TAFOR' },
    { id: 'sinop', label: 'Sinoptik (SYNOP)', icon: Sun, desc: '24 slot / hari' },
    { id: 'metar', label: 'METAR Manual', icon: Wind, desc: '06-18 WIT (13 slot)' },
    { id: 'pibal_ppaa', label: 'PIBAL PPAA', icon: Radio, desc: '00 & 12 UTC (2 slot)' },
    { id: 'pibal_ppbb', label: 'PIBAL PPBB', icon: Radio, desc: '00 & 12 UTC (2 slot)' },
    { id: 'tafor', label: 'TAFOR', icon: TrendingUp, desc: '05, 11, 17, 23 UTC (4 slot)' },
];

export default function MonitoringIndex({
    filters,
    summary,
    dissemination_summary,
    awos_summary,
    hourly_delays,
    hourly_delays_by_param,
    staff_rankings,
    trend_12_months,
}: Props) {
    const [selectedBulan, setSelectedBulan] = useState(filters.bulan);
    const [selectedTahun, setSelectedTahun] = useState(filters.tahun);
    const [activeTab, setActiveTab] = useState<'overview' | 'individual'>(
        (filters.tab as 'overview' | 'individual') || 'overview'
    );
    const [selectedParam, setSelectedParam] = useState<string>(filters.parameter || 'all');
    const [selectedStaffId, setSelectedStaffId] = useState<number>(
        filters.staff_id || (staff_rankings[0]?.pegawai.id ?? 0)
    );
    const [detailModalStaff, setDetailModalStaff] = useState<StaffPerformance | null>(null);
    const [searchTableQuery, setSearchTableQuery] = useState<string>('');

    const handleFilterChange = (b = selectedBulan, y = selectedTahun, param = selectedParam, tab = activeTab, sId = selectedStaffId) => {
        router.get('/monitoring', {
            bulan: b,
            tahun: y,
            parameter: param,
            tab: tab,
            staff_id: sId,
        }, { preserveState: true, replace: true });
    };

    // Calculate dynamic KPI card stats depending on selected parameter
    const currentKPI = useMemo(() => {
        if (selectedParam === 'all' || !summary.breakdown?.[selectedParam]) {
            return {
                titleSlot: 'Total Slot Manual Staf',
                subtitleSlot: 'Sinop, METAR (06-18 WIT), Pibal, TAFOR',
                totalSlots: summary.total_slots,
                compliancePct: summary.overall_compliance_pct,
                timelySlots: summary.total_timely,
                totalLate: summary.total_late,
                subtitleLate: 'Pengiriman melebihi batas',
                totalMissing: summary.total_missing,
                subtitleMissing: 'Slot data tidak diisi',
            };
        }

        const b = summary.breakdown[selectedParam];
        const paramInfo = PARAMETERS.find((p) => p.id === selectedParam);

        return {
            titleSlot: `Total Slot ${paramInfo?.label ?? ''}`,
            subtitleSlot: paramInfo?.desc ?? '',
            totalSlots: b.total,
            compliancePct: b.timely_pct,
            timelySlots: b.timely,
            totalLate: b.late,
            subtitleLate: b.avg_delay > 0 ? `Rerata keterlambatan: ${b.avg_delay} mnt` : 'Pengiriman melebihi batas',
            totalMissing: b.missing,
            subtitleMissing: 'Slot tidak dikirim / nihil',
        };
    }, [selectedParam, summary]);

    // Active hourly delays array based on selected parameter
    const currentHourlyDelays = useMemo(() => {
        if (selectedParam !== 'all' && hourly_delays_by_param?.[selectedParam]) {
            return hourly_delays_by_param[selectedParam];
        }
        return hourly_delays;
    }, [selectedParam, hourly_delays, hourly_delays_by_param]);

    // Sorted and filtered staff list for Leaderboard
    const displayedStaffList = useMemo(() => {
        let list = [...staff_rankings];

        // Search filter
        if (searchTableQuery.trim() !== '') {
            const q = searchTableQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.pegawai.nama.toLowerCase().includes(q) ||
                    (s.pegawai.nip && s.pegawai.nip.toLowerCase().includes(q)) ||
                    (s.pegawai.jabatan && s.pegawai.jabatan.toLowerCase().includes(q))
            );
        }

        // Sort by parameter if a specific parameter is selected
        if (selectedParam !== 'all') {
            list.sort((a, b) => {
                const pctA = (a.breakdown as any)?.[selectedParam]?.timely_pct ?? 0;
                const pctB = (b.breakdown as any)?.[selectedParam]?.timely_pct ?? 0;
                return pctB - pctA;
            });
        } else {
            list.sort((a, b) => b.timely_rate_pct - a.timely_rate_pct);
        }

        return list;
    }, [staff_rankings, selectedParam, searchTableQuery]);

    const activeParamInfo = PARAMETERS.find((p) => p.id === selectedParam);

    const handleSwitchToIndividual = (staffId: number) => {
        setSelectedStaffId(staffId);
        setActiveTab('individual');
        handleFilterChange(selectedBulan, selectedTahun, selectedParam, 'individual', staffId);
    };

    return (
        <>
            <Head title="Monitoring Performa Pengamatan - Kepala Stasiun" />

            <div className="space-y-6 p-6">
                {/* Title & Date Period Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="h-7 w-7 text-indigo-600" />
                            Monitoring Performa Pengamatan & Forecaster
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Evaluasi ketepatan waktu pengiriman, durasi keterlambatan, dan missing data untuk Sinoptik, METAR Manual, PIBAL, dan TAFOR per pegawai.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-slate-500 font-medium">Bulan:</Label>
                            <select
                                value={selectedBulan}
                                onChange={(e) => {
                                    const b = Number(e.target.value);
                                    setSelectedBulan(b);
                                    handleFilterChange(b, selectedTahun);
                                }}
                                className="h-9 px-3 py-1 bg-slate-50 border border-slate-300 rounded-md text-sm font-medium"
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
                                className="h-9 px-3 py-1 bg-slate-50 border border-slate-300 rounded-md text-sm font-medium"
                            >
                                {[2024, 2025, 2026, 2027].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Dashboard Mode Tabs (Station Overview vs Individual Staff) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('overview');
                                handleFilterChange(selectedBulan, selectedTahun, selectedParam, 'overview', selectedStaffId);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'overview'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="h-4 w-4" />
                            Ringkasan Stasiun (Semua Staf)
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('individual');
                                handleFilterChange(selectedBulan, selectedTahun, selectedParam, 'individual', selectedStaffId);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'individual'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <User className="h-4 w-4" />
                            Performa Individu Pegawai (Deep Dive)
                        </button>
                    </div>

                    {/* Parameter Filter Pills (Visible when in overview) */}
                    {activeTab === 'overview' && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                                <Filter className="h-3 w-3" /> Filter Parameter:
                            </span>
                            {PARAMETERS.map((p) => {
                                const isSelected = selectedParam === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedParam(p.id);
                                            handleFilterChange(selectedBulan, selectedTahun, p.id, activeTab, selectedStaffId);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Selected Parameter Alert/Banner if not 'all' */}
                        {selectedParam !== 'all' && (
                            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 px-4 flex items-center justify-between text-xs text-indigo-900">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-indigo-600" />
                                    <span>
                                        Menampilkan data khusus parameter <strong>{activeParamInfo?.label}</strong> ({activeParamInfo?.desc}).
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedParam('all');
                                        handleFilterChange(selectedBulan, selectedTahun, 'all', activeTab, selectedStaffId);
                                    }}
                                    className="font-bold underline hover:text-indigo-700"
                                >
                                    Reset ke Semua Parameter
                                </button>
                            </div>
                        )}

                        {/* Station KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 truncate">
                                        {currentKPI.titleSlot}
                                    </p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{currentKPI.totalSlots}</h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{currentKPI.subtitleSlot}</p>
                                </CardContent>
                            </Card>

                            <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                                        % Ketepatan Waktu
                                    </p>
                                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                                        {currentKPI.compliancePct}%
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {currentKPI.timelySlots} slot tepat waktu
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                                        Total Keterlambatan
                                    </p>
                                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{currentKPI.totalLate}</h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{currentKPI.subtitleLate}</p>
                                </CardContent>
                            </Card>

                            <Card className="border-red-100 bg-gradient-to-br from-red-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                                        Missing Data
                                    </p>
                                    <h3 className="text-2xl font-bold text-red-600 mt-1">{currentKPI.totalMissing}</h3>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{currentKPI.subtitleMissing}</p>
                                </CardContent>
                            </Card>

                            <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                                        <Radio className="h-3.5 w-3.5" /> AWOS Auto Availability
                                    </p>
                                    <h3 className="text-2xl font-bold text-sky-600 mt-1">
                                        {awos_summary ? `${awos_summary.availability_pct}%` : '100%'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Status Sensor Otomatis</p>
                                </CardContent>
                            </Card>

                            <Card className="border-cyan-100 bg-gradient-to-br from-cyan-50/50 to-white">
                                <CardContent className="p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600 flex items-center gap-1">
                                        <Share2 className="h-3.5 w-3.5" /> Diseminasi Cuaca
                                    </p>
                                    <h3 className="text-2xl font-bold text-cyan-700 mt-1">
                                        {dissemination_summary ? `${dissemination_summary.total} Kali` : '0 Kali'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {dissemination_summary?.daily_avg ?? 0} rilis / hari (SIMPAN-MKG)
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* 12-Month Performance Trend Chart */}
                        {trend_12_months && (
                            <Performance12MonthChart
                                data={trend_12_months}
                                initialStaffId={selectedStaffId}
                                activeParameter={selectedParam}
                                onParameterChange={(param) => {
                                    setSelectedParam(param);
                                    handleFilterChange(selectedBulan, selectedTahun, param, activeTab, selectedStaffId);
                                }}
                            />
                        )}

                        {/* Hourly Delay Heatmap */}
                        <Card className="p-4 border-slate-200">
                            <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-indigo-500" />
                                    Analisis Jam Rawan Keterlambatan / Missing Data{' '}
                                    {selectedParam !== 'all' ? `(${activeParamInfo?.label})` : '(Semua Parameter)'} (24 Jam UTC)
                                </h4>
                                <span className="text-xs text-slate-500">
                                    Keterlambatan/missing per slot jam UTC
                                </span>
                            </div>

                            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5">
                                {currentHourlyDelays.map((count, hr) => (
                                    <div
                                        key={hr}
                                        title={`Jam ${hr.toString().padStart(2, '0')}:00 UTC - ${count} Keterlambatan/Missing`}
                                        className={`p-2 rounded text-center border transition-all ${
                                            count === 0
                                                ? 'bg-slate-50 border-slate-200 text-slate-400'
                                                : count <= 2
                                                ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                                                : 'bg-red-100 border-red-300 text-red-800 font-bold'
                                        }`}
                                    >
                                        <div className="text-[11px] font-mono font-semibold">{hr.toString().padStart(2, '0')}</div>
                                        <div className="text-[10px] mt-0.5">{count > 0 ? count : '-'}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Main Leaderboard Table */}
                        <Card className="border-slate-200 overflow-hidden shadow-sm">
                            <CardHeader className="bg-slate-50/70 border-b border-slate-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                            <UserCheck className="h-5 w-5 text-indigo-600" />
                                            Leaderboard Performa Pengamatan Staf - {namaBulan[selectedBulan - 1]} {selectedTahun}
                                        </CardTitle>
                                        <CardDescription>
                                            {selectedParam === 'all'
                                                ? 'Daftar staf diurutkan berdasarkan ketepatan waktu pengiriman observasi manual keseluruhan.'
                                                : `Diurutkan berdasarkan performa ketepatan waktu pada parameter: ${activeParamInfo?.label}.`}
                                        </CardDescription>
                                    </div>

                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                        <Input
                                            value={searchTableQuery}
                                            onChange={(e) => setSearchTableQuery(e.target.value)}
                                            placeholder="Cari nama / NIP pegawai..."
                                            className="h-8.5 pl-8 text-xs bg-white border-slate-200"
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            <Table>
                                <TableHeader className="bg-slate-100/70">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center">Rank</TableHead>
                                        <TableHead>Nama Pegawai & NIP</TableHead>
                                        <TableHead className="text-center">
                                            {selectedParam === 'all' ? 'Total Slot' : `Slot ${activeParamInfo?.label}`}
                                        </TableHead>
                                        <TableHead className="w-[180px]">
                                            {selectedParam === 'all' ? 'Ketepatan Waktu (%)' : `% Tepat (${activeParamInfo?.label})`}
                                        </TableHead>
                                        <TableHead className="text-center">Breakdown (Sinop / METAR / PPAA / PPBB / TAFOR)</TableHead>
                                        <TableHead className="text-center">Diseminasi</TableHead>
                                        <TableHead className="text-center">Terlambat</TableHead>
                                        <TableHead className="text-center">Rata-rata Delay</TableHead>
                                        <TableHead className="text-center">Missing</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {displayedStaffList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                                                Belum ada data pengamatan untuk kriteria ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        displayedStaffList.map((item, index) => {
                                            // Determine display metric based on param
                                            let displayTotal = item.total_assigned;
                                            let displayTimelyCount = item.timely_count;
                                            let displayTimelyPct = item.timely_rate_pct;
                                            let displayLate = item.late_count;
                                            let displayAvgDelay = item.avg_delay_minutes;
                                            let displayMissing = item.missing_count;

                                            if (selectedParam !== 'all' && (item.breakdown as any)?.[selectedParam]) {
                                                const p = (item.breakdown as any)[selectedParam];
                                                displayTotal = p.total;
                                                displayTimelyCount = p.timely;
                                                displayTimelyPct = p.timely_pct;
                                                displayLate = p.late;
                                                displayAvgDelay = p.avg_delay;
                                                displayMissing = p.missing;
                                            }

                                            return (
                                                <TableRow key={item.pegawai.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-bold text-center text-slate-500">
                                                        #{index + 1}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="font-semibold text-slate-900">{item.pegawai.nama}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {item.pegawai.nip || item.pegawai.jabatan || 'Observer & Forecaster'}
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center font-semibold">
                                                        {displayTotal}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-xs font-bold">
                                                                <span className={displayTimelyPct >= 90 ? 'text-emerald-600' : 'text-amber-600'}>
                                                                    {displayTimelyPct}%
                                                                </span>
                                                                <span className="text-slate-400 font-normal">
                                                                    ({displayTimelyCount}/{displayTotal})
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all ${
                                                                        displayTimelyPct >= 90
                                                                            ? 'bg-emerald-500'
                                                                            : displayTimelyPct >= 75
                                                                            ? 'bg-amber-500'
                                                                            : 'bg-red-500'
                                                                    }`}
                                                                    style={{ width: `${Math.min(100, displayTimelyPct)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] ${
                                                                    selectedParam === 'sinop'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                                        : 'bg-slate-50'
                                                                }`}
                                                            >
                                                                Sinop: {item.breakdown?.sinop?.timely_pct ?? 0}%
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] ${
                                                                    selectedParam === 'metar'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                                        : 'bg-slate-50'
                                                                }`}
                                                            >
                                                                METAR: {item.breakdown?.metar?.timely_pct ?? 0}%
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] ${
                                                                    selectedParam === 'pibal_ppaa'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                                        : 'bg-slate-50'
                                                                }`}
                                                            >
                                                                PPAA: {item.breakdown?.pibal_ppaa?.timely_pct ?? 0}%
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] ${
                                                                    selectedParam === 'pibal_ppbb'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                                        : 'bg-slate-50'
                                                                }`}
                                                            >
                                                                PPBB: {item.breakdown?.pibal_ppbb?.timely_pct ?? 0}%
                                                            </Badge>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[11px] ${
                                                                    selectedParam === 'tafor'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                                        : 'bg-blue-50 text-blue-700'
                                                                }`}
                                                            >
                                                                TAFOR: {item.breakdown?.tafor?.timely_pct ?? 0}%
                                                            </Badge>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold">
                                                            {item.dissemination_count ?? 0}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {displayLate > 0 ? (
                                                            <Badge className="bg-amber-100 text-amber-800">
                                                                {displayLate}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">0</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center font-medium text-xs">
                                                        {displayAvgDelay > 0 ? `${displayAvgDelay} mnt` : '-'}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {displayMissing > 0 ? (
                                                            <Badge className="bg-red-100 text-red-800">
                                                                {displayMissing}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">0</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSwitchToIndividual(item.pegawai.id)}
                                                                className="h-8 text-xs font-semibold bg-indigo-50/50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                                                title="Buka Section Khusus Analisis Staf Ini"
                                                            >
                                                                <User className="h-3.5 w-3.5 mr-1" />
                                                                Lihat Analisis
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDetailModalStaff(item)}
                                                                className="h-8 text-xs text-slate-600 hover:bg-slate-100"
                                                                title="Detail Riwayat"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1" />
                                                                Log
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}

                {/* TAB 2: INDIVIDUAL STAFF DEEP-DIVE */}
                {activeTab === 'individual' && (
                    <IndividualStaffPerformance
                        staffList={staff_rankings}
                        selectedStaffId={selectedStaffId}
                        onSelectStaff={(id) => {
                            setSelectedStaffId(id);
                            handleFilterChange(selectedBulan, selectedTahun, selectedParam, 'individual', id);
                        }}
                        trend12Months={trend_12_months}
                        monthName={namaBulan[selectedBulan - 1]}
                        year={selectedTahun}
                        initialParameter={selectedParam}
                    />
                )}

                {/* Quick Individual Staff Log Modal */}
                {detailModalStaff && (
                    <Dialog open={!!detailModalStaff} onOpenChange={() => setDetailModalStaff(null)}>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center justify-between text-indigo-600">
                                    <span className="flex items-center gap-2">
                                        <UserCheck className="h-5 w-5" />
                                        Detail Riwayat Pengamatan - {detailModalStaff.pegawai.nama}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const sId = detailModalStaff.pegawai.id;
                                            setDetailModalStaff(null);
                                            handleSwitchToIndividual(sId);
                                        }}
                                        className="text-xs text-indigo-700 border-indigo-200"
                                    >
                                        Buka Dashboard Penuh Pegawai
                                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                    </Button>
                                </DialogTitle>
                                <DialogDescription>
                                    Rincian daftar keterlambatan dan missing data pada periode {namaBulan[selectedBulan - 1]} {selectedTahun}.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-3 space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border text-xs">
                                    <div>
                                        <span className="text-slate-500">Total Slot Manual:</span>
                                        <div className="font-bold text-sm text-slate-800">{detailModalStaff.total_assigned}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Diseminasi Cuaca:</span>
                                        <div className="font-bold text-sm text-cyan-700">{detailModalStaff.dissemination_count ?? 0} kali</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Total Terlambat:</span>
                                        <div className="font-bold text-sm text-amber-600">
                                            {detailModalStaff.late_count} ({detailModalStaff.avg_delay_minutes} mnt avg)
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Missing Data:</span>
                                        <div className="font-bold text-sm text-red-600">{detailModalStaff.missing_count}</div>
                                    </div>
                                </div>

                                <Table className="border rounded-md text-xs">
                                    <TableHeader className="bg-slate-100">
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
                                        {detailModalStaff.details.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6 text-emerald-600 font-semibold">
                                                    Sempurna! Tidak ada keterlambatan maupun missing data pada periode ini.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            detailModalStaff.details.map((det, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-bold">{det.type}</TableCell>
                                                    <TableCell className="font-mono">{det.slot_time}</TableCell>
                                                    <TableCell className="font-mono">{det.sent_at}</TableCell>
                                                    <TableCell>
                                                        {det.status === 'Terlambat' ? (
                                                            <Badge className="bg-amber-100 text-amber-800">
                                                                Terlambat
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-red-100 text-red-800">
                                                                Missing
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-amber-700">
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
