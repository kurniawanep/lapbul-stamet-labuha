import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    UserCheck,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Trophy,
    Award,
    Sun,
    Wind,
    Radio,
    Share2,
    FileText,
    TrendingUp,
    Compass,
    Sparkles,
    ShieldAlert,
    Filter,
} from 'lucide-react';
import Performance12MonthChart, { Trend12MonthsData } from './Performance12MonthChart';

export interface StaffDetailItem {
    type: string;
    slot_time: string;
    sent_at: string;
    status: 'Terlambat' | 'Missing Data' | 'Lebih Awal' | string;
    delay_minutes: number;
    note: string;
}

export interface ParameterMetrics {
    total: number;
    timely: number;
    late: number;
    missing: number;
    timely_pct: number;
    avg_delay: number;
    total_delay?: number;
}

export interface StaffPerformance {
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
    dissemination_count?: number;
    breakdown: {
        sinop: ParameterMetrics;
        metar: ParameterMetrics;
        pibal_ppaa: ParameterMetrics;
        pibal_ppbb: ParameterMetrics;
        tafor: ParameterMetrics;
    };
    details: StaffDetailItem[];
}

interface Props {
    staffList: StaffPerformance[];
    selectedStaffId: number;
    onSelectStaff: (id: number) => void;
    trend12Months?: Trend12MonthsData;
    monthName: string;
    year: number;
    initialParameter?: string;
}

export default function IndividualStaffPerformance({
    staffList,
    selectedStaffId,
    onSelectStaff,
    trend12Months,
    monthName,
    year,
    initialParameter = 'all',
}: Props) {
    const [filterParam, setFilterParam] = useState<string>(initialParameter);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Active staff data
    const currentIndex = staffList.findIndex((s) => s.pegawai.id === selectedStaffId);
    const activeStaff = staffList[currentIndex >= 0 ? currentIndex : 0];

    const handlePrev = () => {
        if (staffList.length === 0) return;
        const prevIndex = (currentIndex - 1 + staffList.length) % staffList.length;
        onSelectStaff(staffList[prevIndex].pegawai.id);
    };

    const handleNext = () => {
        if (staffList.length === 0) return;
        const nextIndex = (currentIndex + 1) % staffList.length;
        onSelectStaff(staffList[nextIndex].pegawai.id);
    };

    // Calculate hourly pattern of delays/missing for this specific staff
    const staffHourlyIssues = useMemo(() => {
        const hours = array_fill_zero(24);
        if (!activeStaff) return hours;

        activeStaff.details.forEach((det) => {
            // Extract hour from slot_time "YYYY-MM-DD HH:mm UTC"
            const match = det.slot_time.match(/\s(\d{2}):/);
            if (match && match[1]) {
                const h = parseInt(match[1], 10);
                if (h >= 0 && h < 24) {
                    hours[h]++;
                }
            }
        });
        return hours;
    }, [activeStaff]);

    // Filtered details
    const filteredDetails = useMemo(() => {
        if (!activeStaff) return [];

        return activeStaff.details.filter((item) => {
            // Parameter filter
            if (filterParam !== 'all') {
                const typeUpper = item.type.toUpperCase();
                if (filterParam === 'sinop' && !typeUpper.includes('SINOP')) return false;
                if (filterParam === 'metar' && !typeUpper.includes('METAR')) return false;
                if (filterParam === 'pibal_ppaa' && !typeUpper.includes('PPAA')) return false;
                if (filterParam === 'pibal_ppbb' && !typeUpper.includes('PPBB')) return false;
                if (filterParam === 'tafor' && !typeUpper.includes('TAFOR')) return false;
            }

            // Status filter
            if (filterStatus !== 'all') {
                if (filterStatus === 'late' && item.status !== 'Terlambat') return false;
                if (filterStatus === 'missing' && item.status !== 'Missing Data') return false;
                if (filterStatus === 'early' && item.status !== 'Lebih Awal') return false;
            }

            // Search query
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const matched =
                    item.type.toLowerCase().includes(query) ||
                    item.slot_time.toLowerCase().includes(query) ||
                    item.sent_at.toLowerCase().includes(query) ||
                    item.note.toLowerCase().includes(query) ||
                    item.status.toLowerCase().includes(query);
                if (!matched) return false;
            }

            return true;
        });
    }, [activeStaff, filterParam, filterStatus, searchQuery]);

    if (!activeStaff) {
        return (
            <Card className="p-8 text-center text-slate-500">
                <p>Belum ada data staf pengamatan untuk ditampilkan.</p>
            </Card>
        );
    }

    const rank = currentIndex + 1;
    const isTopRank = rank === 1;
    const timelyPct = activeStaff.timely_rate_pct;

    return (
        <div className="space-y-6">
            {/* Staff Selector Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Pilih Staf:
                    </Label>
                    <div className="w-72">
                        <Select
                            value={String(activeStaff.pegawai.id)}
                            onValueChange={(val) => onSelectStaff(Number(val))}
                        >
                            <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 border-slate-300">
                                <SelectValue placeholder="Pilih Pegawai" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                                {staffList.map((s, idx) => (
                                    <SelectItem key={s.pegawai.id} value={String(s.pegawai.id)}>
                                        <div className="flex items-center justify-between gap-3 text-xs w-full">
                                            <span className="font-semibold">{s.pegawai.nama}</span>
                                            <span className="text-[11px] text-emerald-600 font-mono font-bold">
                                                #{idx + 1} ({s.timely_rate_pct}%)
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrev}
                        className="h-8.5 px-3 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                        title="Staf Sebelumnya"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Sebelumnya
                    </Button>
                    <span className="text-xs font-medium text-slate-500 px-1">
                        {rank} dari {staffList.length}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                        className="h-8.5 px-3 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                        title="Staf Berikutnya"
                    >
                        Berikutnya
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Profile Hero Card */}
            <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        {/* Avatar & Info */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-indigo-100">
                                    {getInitials(activeStaff.pegawai.nama)}
                                </div>
                                {isTopRank && (
                                    <div
                                        className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 p-1 rounded-full shadow-sm"
                                        title="Peringkat 1 Stasiun"
                                    >
                                        <Trophy className="h-4 w-4" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {activeStaff.pegawai.nama}
                                    </h2>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs font-semibold ${
                                            isTopRank
                                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                        }`}
                                    >
                                        <Award className="h-3 w-3 mr-1" />
                                        Peringkat #{rank} Stasiun
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                                    <span>NIP: {activeStaff.pegawai.nip || '-'}</span>
                                    <span>•</span>
                                    <span>Jabatan: {activeStaff.pegawai.jabatan || 'Observer & Forecaster'}</span>
                                    <span>•</span>
                                    <span>Periode: {monthName} {year}</span>
                                </p>
                            </div>
                        </div>

                        {/* Circular Score Gauge & Status */}
                        <div className="flex items-center gap-6 bg-white p-3.5 px-5 rounded-2xl border border-indigo-100 shadow-xs self-stretch lg:self-auto justify-between lg:justify-start">
                            <div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Ketepatan Waktu Keseluruhan
                                </div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span
                                        className={`text-3xl font-extrabold ${
                                            timelyPct >= 90
                                                ? 'text-emerald-600'
                                                : timelyPct >= 75
                                                ? 'text-amber-600'
                                                : 'text-rose-600'
                                        }`}
                                    >
                                        {timelyPct}%
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        ({activeStaff.timely_count}/{activeStaff.total_assigned} slot)
                                    </span>
                                </div>
                                <div className="mt-1">
                                    {timelyPct >= 90 ? (
                                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Standar BMKG Terpenuhi
                                        </span>
                                    ) : timelyPct >= 75 ? (
                                        <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                            <AlertTriangle className="h-3 w-3 mr-1" /> Perlu Peningkatan
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                            <ShieldAlert className="h-3 w-3 mr-1" /> Perlu Evaluasi Supervisi
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Mini SVG Ring Gauge */}
                            <div className="relative w-16 h-16 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className="text-slate-100"
                                        strokeWidth="3.5"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    <path
                                        className={
                                            timelyPct >= 90
                                                ? 'text-emerald-500'
                                                : timelyPct >= 75
                                                ? 'text-amber-500'
                                                : 'text-rose-500'
                                        }
                                        strokeDasharray={`${Math.max(0, Math.min(100, timelyPct))}, 100`}
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                                    {Math.round(timelyPct)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Quick Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-indigo-100/70">
                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Slot Tugas</span>
                            <div className="text-xl font-bold text-slate-900 mt-0.5">{activeStaff.total_assigned}</div>
                            <span className="text-[10px] text-slate-400">Sinop, METAR, Pibal, TAFOR</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-emerald-600 uppercase">Tepat Waktu</span>
                            <div className="text-xl font-bold text-emerald-600 mt-0.5">{activeStaff.timely_count}</div>
                            <span className="text-[10px] text-emerald-700 font-semibold">{activeStaff.timely_rate_pct}% dari total</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-amber-600 uppercase">Terlambat</span>
                            <div className="text-xl font-bold text-amber-600 mt-0.5">{activeStaff.late_count}</div>
                            <span className="text-[10px] text-amber-700 font-semibold">{activeStaff.late_rate_pct}% dari total</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-rose-600 uppercase">Missing Data</span>
                            <div className="text-xl font-bold text-rose-600 mt-0.5">{activeStaff.missing_count}</div>
                            <span className="text-[10px] text-rose-700 font-semibold">{activeStaff.missing_rate_pct}% dari total</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase">Rerata Keterlambatan</span>
                            <div className="text-xl font-bold text-slate-900 mt-0.5">
                                {activeStaff.avg_delay_minutes > 0 ? `${activeStaff.avg_delay_minutes} mnt` : '-'}
                            </div>
                            <span className="text-[10px] text-slate-400">Pada slot terlambat</span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-[11px] font-semibold text-cyan-600 uppercase flex items-center gap-1">
                                <Share2 className="h-3 w-3" /> Diseminasi Cuaca
                            </span>
                            <div className="text-xl font-bold text-cyan-700 mt-0.5">
                                {activeStaff.dissemination_count ?? 0} kali
                            </div>
                            <span className="text-[10px] text-cyan-600 font-medium">Rilis SIMPAN-MKG</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Parameter Cards Grid: Sinop / METAR / PPAA / PPBB / TAFOR */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Compass className="h-5 w-5 text-indigo-600" />
                        Rincian Performa per Jenis Sandi / Pengiriman
                    </h3>
                    <span className="text-xs text-slate-500">
                        Klik pada kartu untuk memfilter riwayat pengamatan di bawah
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Sinoptik Card */}
                    <ParameterCard
                        title="Sinoptik (SYNOP)"
                        icon={<Sun className="h-4 w-4 text-amber-500" />}
                        metrics={activeStaff.breakdown.sinop}
                        isActive={filterParam === 'sinop'}
                        onSelect={() => setFilterParam(filterParam === 'sinop' ? 'all' : 'sinop')}
                    />

                    {/* 2. METAR Manual Card */}
                    <ParameterCard
                        title="METAR Manual"
                        icon={<Wind className="h-4 w-4 text-sky-500" />}
                        metrics={activeStaff.breakdown.metar}
                        isActive={filterParam === 'metar'}
                        onSelect={() => setFilterParam(filterParam === 'metar' ? 'all' : 'metar')}
                    />

                    {/* 3. PIBAL PPAA Card */}
                    <ParameterCard
                        title="PIBAL Sandi PPAA"
                        icon={<Radio className="h-4 w-4 text-purple-500" />}
                        metrics={activeStaff.breakdown.pibal_ppaa}
                        isActive={filterParam === 'pibal_ppaa'}
                        onSelect={() => setFilterParam(filterParam === 'pibal_ppaa' ? 'all' : 'pibal_ppaa')}
                    />

                    {/* 4. PIBAL PPBB Card */}
                    <ParameterCard
                        title="PIBAL Sandi PPBB"
                        icon={<Radio className="h-4 w-4 text-indigo-500" />}
                        metrics={activeStaff.breakdown.pibal_ppbb}
                        isActive={filterParam === 'pibal_ppbb'}
                        onSelect={() => setFilterParam(filterParam === 'pibal_ppbb' ? 'all' : 'pibal_ppbb')}
                    />

                    {/* 5. TAFOR Card */}
                    <ParameterCard
                        title="Prakiraan TAFOR"
                        icon={<Sparkles className="h-4 w-4 text-blue-500" />}
                        metrics={activeStaff.breakdown.tafor}
                        isActive={filterParam === 'tafor'}
                        onSelect={() => setFilterParam(filterParam === 'tafor' ? 'all' : 'tafor')}
                    />

                    {/* 6. Diseminasi Cuaca Summary Card */}
                    <Card
                        className={`transition-all border ${
                            filterParam === 'all'
                                ? 'border-cyan-200 bg-cyan-50/30'
                                : 'border-slate-200 hover:border-cyan-300'
                        }`}
                    >
                        <CardContent className="p-4 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
                                    <Share2 className="h-4 w-4 text-cyan-600" />
                                    Diseminasi SIMPAN-MKG
                                </div>

                                <div className="mt-3 flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-cyan-700">
                                        {activeStaff.dissemination_count ?? 0}
                                    </span>
                                    <span className="text-xs text-slate-500">kali rilis informasi</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Kontribusi Diseminasi:</span>
                                <span className="font-semibold text-slate-700">
                                    {activeStaff.dissemination_count ? 'Aktif' : 'Tidak Ada'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Komposisi Status Pengiriman (Donut / Proportion) */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Komposisi Status Pengiriman
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Proporsi tepat waktu, keterlambatan, dan missing data periode ini
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center justify-center">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-center">
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                            <div className="text-xs font-semibold text-emerald-700">Tepat Waktu</div>
                            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                                {activeStaff.timely_count}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium">
                                {activeStaff.timely_rate_pct}%
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                            <div className="text-xs font-semibold text-amber-700">Terlambat</div>
                            <div className="text-2xl font-extrabold text-amber-600 mt-1">
                                {activeStaff.late_count}
                            </div>
                            <div className="text-[11px] text-amber-700 font-medium">
                                {activeStaff.late_rate_pct}%
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                            <div className="text-xs font-semibold text-rose-700">Missing Data</div>
                            <div className="text-2xl font-extrabold text-rose-600 mt-1">
                                {activeStaff.missing_count}
                            </div>
                            <div className="text-[11px] text-rose-700 font-medium">
                                {activeStaff.missing_rate_pct}%
                            </div>
                        </div>
                    </div>

                    {/* Stacked Proportional Bar */}
                    <div className="w-full mt-5">
                        <div className="text-xs text-slate-500 mb-1.5 flex justify-between">
                            <span>Distribusi Persentase:</span>
                            <span className="font-semibold text-slate-700">{activeStaff.total_assigned} Total Slot</span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            {activeStaff.total_assigned > 0 ? (
                                <>
                                    <div
                                        className="bg-emerald-500 h-full transition-all"
                                        style={{ width: `${activeStaff.timely_rate_pct}%` }}
                                        title={`Tepat Waktu: ${activeStaff.timely_count} (${activeStaff.timely_rate_pct}%)`}
                                    />
                                    <div
                                        className="bg-amber-500 h-full transition-all"
                                        style={{ width: `${activeStaff.late_rate_pct}%` }}
                                        title={`Terlambat: ${activeStaff.late_count} (${activeStaff.late_rate_pct}%)`}
                                    />
                                    <div
                                        className="bg-rose-500 h-full transition-all"
                                        style={{ width: `${activeStaff.missing_rate_pct}%` }}
                                        title={`Missing: ${activeStaff.missing_count} (${activeStaff.missing_rate_pct}%)`}
                                    />
                                </>
                            ) : (
                                <div className="bg-slate-200 h-full w-full" />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Chart 3: 12-Month Performance Trend for This Person */}
            {trend12Months && (
                <div>
                    <Performance12MonthChart
                        data={trend12Months}
                        initialStaffId={activeStaff.pegawai.id}
                        activeParameter={filterParam}
                        onParameterChange={setFilterParam}
                        title={`Tren Performa 12 Bulan — ${activeStaff.pegawai.nama}`}
                        hideStaffSelect={true}
                    />
                </div>
            )}

            {/* Chart 4: Hourly Delay & Missing Heatmap for this Person */}
            <Card className="p-4 border-slate-200 shadow-sm">
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        Pola Jam Terjadinya Keterlambatan / Missing ({activeStaff.pegawai.nama})
                    </h4>
                    <span className="text-xs text-slate-500">24 Jam UTC</span>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5">
                    {staffHourlyIssues.map((count, hr) => (
                        <div
                            key={hr}
                            title={`Jam ${hr.toString().padStart(2, '0')}:00 UTC - ${count} Keterlambatan/Missing`}
                            className={`p-2 rounded text-center border transition-all ${
                                count === 0
                                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                                    : count === 1
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

            {/* Detailed Observation History & Audit Log */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/70 border-b border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-600" />
                                Riwayat Detail Keterlambatan & Missing Data ({filteredDetails.length} Catatan)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Log detail seluruh observasi yang mengalami keterlambatan atau tidak dikirimkan
                            </CardDescription>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Parameter Filter */}
                            <Select value={filterParam} onValueChange={setFilterParam}>
                                <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 w-36">
                                    <SelectValue placeholder="Parameter" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Parameter</SelectItem>
                                    <SelectItem value="sinop">Sinoptik</SelectItem>
                                    <SelectItem value="metar">METAR Manual</SelectItem>
                                    <SelectItem value="pibal_ppaa">PIBAL PPAA</SelectItem>
                                    <SelectItem value="pibal_ppbb">PIBAL PPBB</SelectItem>
                                    <SelectItem value="tafor">TAFOR</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 w-32">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Status</SelectItem>
                                    <SelectItem value="late">Terlambat</SelectItem>
                                    <SelectItem value="missing">Missing Data</SelectItem>
                                    <SelectItem value="early">Lebih Awal</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Search Box */}
                            <div className="relative w-40 sm:w-48">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari waktu / note..."
                                    className="h-8.5 pl-8 text-xs bg-white border-slate-200"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <Table className="text-xs">
                    <TableHeader className="bg-slate-100/70">
                        <TableRow>
                            <TableHead className="w-[120px]">Jenis Data</TableHead>
                            <TableHead>Waktu Slot (UTC)</TableHead>
                            <TableHead>Waktu Kirim (UTC)</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Delay</TableHead>
                            <TableHead>Keterangan & Catatan Supervisi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDetails.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                                        <p className="font-semibold text-slate-700 text-sm">
                                            Tidak Ada Catatan Keterlambatan / Missing Data!
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {filterParam !== 'all' || filterStatus !== 'all' || searchQuery
                                                ? 'Tidak ada data yang sesuai dengan filter yang dipilih.'
                                                : 'Seluruh slot tugas pada periode ini diselesaikan dengan tepat waktu.'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDetails.map((det, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50/50">
                                    <TableCell className="font-semibold text-slate-800">
                                        <Badge variant="outline" className="text-[11px] font-mono">
                                            {det.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-600">
                                        {det.slot_time}
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-600">
                                        {det.sent_at}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {det.status === 'Terlambat' ? (
                                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                Terlambat
                                            </Badge>
                                        ) : det.status === 'Missing Data' ? (
                                            <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                                                Missing Data
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                {det.status}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center font-bold font-mono text-amber-700">
                                        {det.delay_minutes > 0 ? `+${det.delay_minutes} mnt` : '-'}
                                    </TableCell>
                                    <TableCell className="text-slate-600 max-w-md">
                                        {det.note}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

interface ParameterCardProps {
    title: string;
    icon: React.ReactNode;
    metrics: ParameterMetrics;
    isActive: boolean;
    onSelect: () => void;
}

function ParameterCard({
    title,
    icon,
    metrics,
    isActive,
    onSelect,
}: ParameterCardProps) {
    const total = metrics?.total ?? 0;
    const timely = metrics?.timely ?? 0;
    const late = metrics?.late ?? 0;
    const missing = metrics?.missing ?? 0;
    const pct = metrics?.timely_pct ?? 0;
    const avgDelay = metrics?.avg_delay ?? 0;

    return (
        <Card
            onClick={onSelect}
            className={`cursor-pointer transition-all duration-200 border ${
                isActive
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
            }`}
        >
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                        {icon}
                        {title}
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <span
                                className={`text-2xl font-black ${
                                    pct >= 90
                                        ? 'text-emerald-600'
                                        : pct >= 75
                                        ? 'text-amber-600'
                                        : 'text-rose-600'
                                }`}
                            >
                                {pct}%
                            </span>
                            <span className="text-xs text-slate-400">tepat waktu</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">
                            {timely} / {total} slot
                        </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                            className={`h-2 rounded-full transition-all ${
                                pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <span className="text-slate-400 text-[10px] block">Terlambat</span>
                        <span className="font-bold text-amber-600">{late}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 text-[10px] block">Rerata Delay</span>
                        <span className="font-bold text-slate-700">{avgDelay > 0 ? `${avgDelay}m` : '-'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 text-[10px] block">Missing</span>
                        <span className="font-bold text-rose-600">{missing}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
}

function array_fill_zero(size: number): number[] {
    const arr: number[] = [];
    for (let i = 0; i < size; i++) arr.push(0);
    return arr;
}

