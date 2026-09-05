import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import BulkUpdateModal from '@/components/Jadwal/BulkUpdateModal';
import MasterShiftModal from '@/components/Jadwal/MasterShiftModal';
import SyncingScheduleModal from '@/components/Jadwal/SyncingScheduleModal';
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
import { Badge } from '@/components/ui/badge';
import {
    AlertCircle,
    Calendar,
    Clock,
    Download,
    FileSpreadsheet,
    Layers,
    RotateCcw,
    Save,
    Sparkles,
    UserCheck,
    Wrench,
    Briefcase,
    Info,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

interface Pegawai {
    id: number;
    nip: string | null;
    nama: string;
    jabatan: string | null;
}

interface MasterShift {
    id: number;
    category?: string;
    kode_shift: string;
    nama_shift: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
    is_tidak_masuk_kerja?: boolean;
}

interface JadwalBulanan {
    id: number;
    bulan: number;
    tahun: number;
    stasiun: string;
    zona_waktu: string;
    kepala_stasiun_nama: string;
    kepala_pokjung_nama: string;
}

interface MatrixCell {
    id?: number;
    shift_id: number;
    kode_shift: string;
}

interface PendingChange {
    pegawai_id: number;
    day: number;
    tanggal: string;
    shift_id: number;
}

interface HolidayInfo {
    name: string;
    is_cuti_bersama: boolean;
}

interface Props {
    jadwalBulanan: JadwalBulanan;
    pegawais: Pegawai[];
    shifts: MasterShift[];
    matrix: Record<number, Record<number, MatrixCell>>;
    bulan: number;
    tahun: number;
    daysInMonth: number;
    holidays?: Record<string, HolidayInfo>;
    category?: 'operasional' | 'teknisi' | 'ppnpn';
    pageTitle?: string;
}

const SHIFT_STYLE_MAP: Record<string, string> = {
    PF: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
    S: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
    M1: 'bg-slate-200 text-slate-900 border-slate-300 font-bold',
    M2: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    M: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    WFH: 'bg-green-300 text-green-900 border-green-400 font-bold',
    LATSAR: 'bg-amber-200 text-amber-900 border-amber-300 font-bold',
    A: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
    P: 'bg-cyan-100 text-cyan-900 border-cyan-300 font-semibold',
    L: 'bg-red-50 text-red-700 border-red-200',
    DL: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    CT: 'bg-pink-100 text-pink-900 border-pink-300',
};

const getShiftBadgeStyle = (kode: string) => {
    return SHIFT_STYLE_MAP[kode] || 'bg-white text-slate-800 border-slate-200';
};

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function Index({
    jadwalBulanan,
    pegawais,
    shifts,
    matrix: serverMatrix,
    bulan,
    tahun,
    daysInMonth,
    holidays = {},
    category = 'operasional',
    pageTitle = 'Jadwal Dinas Operasional & TU',
}: Props) {
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Local matrix state for fast interactive editing without server lag
    const [localMatrix, setLocalMatrix] = useState<Record<number, Record<number, MatrixCell>>>(serverMatrix);
    // Track unsaved changes
    const [pendingChanges, setPendingChanges] = useState<Record<string, PendingChange>>({});

    // Sync local matrix when server matrix updates (e.g. month navigation or after save)
    useEffect(() => {
        setLocalMatrix(serverMatrix);
        setPendingChanges({});
    }, [serverMatrix]);

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        if (Object.keys(pendingChanges).length > 0) {
            if (!confirm('Terdapat perubahan yang belum disimpan. Yakin ingin berpindah bulan?')) {
                return;
            }
        }
        router.get(`/jadwal/${category}`, { bulan: newBulan, tahun: newTahun }, { preserveState: true });
    };

    const handleLocalCellChange = (pegawaiId: number, day: number, shiftId: number) => {
        const targetShift = shifts.find((s) => s.id === shiftId);
        if (!targetShift) return;

        const key = `${pegawaiId}-${day}`;
        const tanggalStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 1. Update local matrix
        setLocalMatrix((prev) => ({
            ...prev,
            [pegawaiId]: {
                ...(prev[pegawaiId] || {}),
                [day]: {
                    ...(prev[pegawaiId]?.[day] || {}),
                    shift_id: shiftId,
                    kode_shift: targetShift.kode_shift,
                },
            },
        }));

        // 2. Track pending change
        const originalShiftId = serverMatrix[pegawaiId]?.[day]?.shift_id;
        if (originalShiftId === shiftId) {
            // Reverted back to original server value
            setPendingChanges((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        } else {
            setPendingChanges((prev) => ({
                ...prev,
                [key]: {
                    pegawai_id: pegawaiId,
                    day,
                    tanggal: tanggalStr,
                    shift_id: shiftId,
                },
            }));
        }
    };

    const handleDiscardChanges = () => {
        setLocalMatrix(serverMatrix);
        setPendingChanges({});
    };

    const handleSaveChanges = () => {
        const changesList = Object.values(pendingChanges);
        if (changesList.length === 0) return;

        setIsSaving(true);
        router.post(
            '/jadwal/batch-update-cells',
            {
                jadwal_bulanan_id: jadwalBulanan.id,
                changes: changesList.map((c) => ({
                    pegawai_id: c.pegawai_id,
                    tanggal: c.tanggal,
                    shift_id: c.shift_id,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    setPendingChanges({});
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handlePdfExport = () => {
        window.open(`/jadwal/pdf?bulan=${bulan}&tahun=${tahun}&category=${category}`, '_blank');
    };

    const getDayInfo = (day: number) => {
        const date = new Date(tahun, bulan - 1, day);
        const dayIndex = date.getDay(); // 0 = Minggu, 5 = Jumat, 6 = Sabtu
        const dayName = NAMA_HARI[dayIndex];
        const isWeekend = dayIndex === 0 || dayIndex === 6;
        const isFriday = dayIndex === 5;
        return { dayName, isWeekend, isFriday };
    };

    // Calculate shift counts per pegawai from localMatrix (updates in real time!)
    const getPegawaiShiftCounts = (pegawaiId: number) => {
        const counts: Record<string, number> = {};
        shifts.forEach((s) => (counts[s.kode_shift] = 0));

        const pMatrix = localMatrix[pegawaiId] || {};
        for (let d = 1; d <= daysInMonth; d++) {
            const cell = pMatrix[d];
            if (cell && cell.kode_shift) {
                counts[cell.kode_shift] = (counts[cell.kode_shift] || 0) + 1;
            }
        }
        return counts;
    };

    const pendingCount = Object.keys(pendingChanges).length;

    const renderHeaderIcon = () => {
        if (category === 'teknisi') return <Wrench className="h-6 w-6 text-indigo-400" />;
        if (category === 'ppnpn') return <Briefcase className="h-6 w-6 text-purple-400" />;
        return <Calendar className="h-6 w-6 text-blue-400" />;
    };

    const monthHolidays = Object.entries(holidays).filter(([dateStr]) =>
        dateStr.startsWith(`${tahun}-${String(bulan).padStart(2, '0')}`)
    );

    const offShiftKodes = new Set(
        shifts.filter((s) => s.is_tidak_masuk_kerja).map((s) => s.kode_shift)
    );

    return (
        <>
            <Head title={`${pageTitle} - BMKG`} />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen pb-24">
                {/* Header Card / Branding */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1 text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> BMKG Halmahera Selatan
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                {jadwalBulanan.zona_waktu} (UTC+9)
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                            {renderHeaderIcon()}
                            {pageTitle}
                        </h1>
                        <p className="text-blue-200/80 text-sm">
                            {jadwalBulanan.stasiun}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Month Selector */}
                        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/10">
                            <Select
                                value={String(bulan)}
                                onValueChange={(val) => handleMonthYearChange(Number(val), tahun)}
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
                                onValueChange={(val) => handleMonthYearChange(bulan, Number(val))}
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

                        {/* Action Buttons */}
                        <Button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-900/30"
                        >
                            <Layers className="h-4 w-4" /> Bulk Update Shift
                        </Button>

                        <Button
                            onClick={handlePdfExport}
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border border-white/20 gap-2 backdrop-blur-md"
                        >
                            <Download className="h-4 w-4" /> Cetak PDF
                        </Button>
                    </div>
                </div>

                {/* Shift Legend & Integrated Master Shift Management */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 mr-2 flex items-center gap-1">
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Legenda Shift:
                        </span>
                        {shifts.map((s) => (
                            <div
                                key={s.id}
                                className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 ${getShiftBadgeStyle(s.kode_shift)}`}
                            >
                                <span>{s.kode_shift}</span>
                                <span className="font-normal opacity-80">({s.nama_shift})</span>
                                {s.is_tidak_masuk_kerja && (
                                    <span className="text-[10px] text-red-500 font-bold" title="Shift Tidak Masuk Kerja">*</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsShiftModalOpen(true)}
                        className="text-xs font-semibold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 gap-1.5"
                    >
                        <Clock className="h-3.5 w-3.5" /> Kelola Master Shift
                    </Button>
                </div>

                {/* National Holidays Breakdown Banner (if any in current month) */}
                {monthHolidays.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-900 shadow-sm">
                        <span className="font-bold flex items-center gap-1 text-red-700 mr-1">
                            <Info className="h-4 w-4 text-red-600" /> Hari Libur Nasional & Cuti Bersama ({NAMA_BULAN[bulan - 1]} {tahun}):
                        </span>
                        {monthHolidays.map(([dateStr, hInfo]) => {
                            const dayNum = parseInt(dateStr.split('-')[2], 10);
                            return (
                                <Badge key={dateStr} className="bg-red-600 text-white font-medium text-[11px] gap-1 shadow-xs">
                                    Tgl {dayNum}: {hInfo.name}
                                </Badge>
                            );
                        })}
                    </div>
                )}

                {/* Matrix Spreadsheet Table */}
                <Card className="border border-slate-200 shadow-md overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Matriks {pageTitle} ({NAMA_BULAN[bulan - 1]} {tahun})
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="w-full text-xs border-collapse">
                            <TableHeader>
                                <TableRow className="bg-slate-100/80 hover:bg-slate-100">
                                    <TableHead className="w-10 text-center font-bold text-slate-700 sticky left-0 bg-slate-100 border-r z-20">
                                        No
                                    </TableHead>
                                    <TableHead className="w-48 font-bold text-slate-700 sticky left-10 bg-slate-100 border-r z-20">
                                        Nama Pegawai
                                    </TableHead>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                        const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const holidayInfo = holidays[dateStr];
                                        const isHoliday = Boolean(holidayInfo);
                                        const { dayName, isWeekend, isFriday } = getDayInfo(d);

                                        let headerBgClass = 'bg-slate-100 text-slate-700';
                                        let tooltipText: string | undefined = undefined;

                                        if (isHoliday) {
                                            // Red background with tooltip (National Holiday or Cuti Bersama)
                                            headerBgClass = 'bg-red-600 text-white font-extrabold shadow-inner';
                                            tooltipText = holidayInfo.name;
                                        } else if (isWeekend) {
                                            // Red background without tooltip
                                            headerBgClass = 'bg-red-100 text-red-800 font-bold';
                                            tooltipText = undefined;
                                        } else if (isFriday) {
                                            headerBgClass = 'bg-emerald-100 text-emerald-900 font-bold';
                                        }

                                        return (
                                            <TableHead
                                                key={d}
                                                title={tooltipText}
                                                className={`w-12 text-center border-r px-1 py-1.5 cursor-default transition-colors ${headerBgClass}`}
                                            >
                                                <div className="text-[10px] font-semibold uppercase tracking-tighter opacity-90 flex items-center justify-center gap-0.5">
                                                    {dayName}
                                                    {isHoliday && <span className="text-[9px] text-amber-300 font-bold">★</span>}
                                                </div>
                                                <div className="text-xs font-extrabold">{d}</div>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pegawais.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={daysInMonth + 2} className="text-center py-8 text-slate-400">
                                            Tidak ada pegawai untuk kategori ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pegawais.map((pegawai, idx) => {
                                        const pLocalMatrix = localMatrix[pegawai.id] || {};
                                        return (
                                            <TableRow key={pegawai.id} className="hover:bg-blue-50/30 transition-colors">
                                                <TableCell className="text-center font-medium text-slate-500 sticky left-0 bg-white border-r z-10">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-900 sticky left-10 bg-white border-r z-10 whitespace-nowrap px-3">
                                                    <div>{pegawai.nama}</div>
                                                    {pegawai.jabatan && (
                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                            {pegawai.jabatan}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                                    const cell = pLocalMatrix[d];
                                                    const currentKode = cell?.kode_shift || 'L';
                                                    const currentShiftId = cell?.shift_id || shifts.find((s) => s.kode_shift === 'L')?.id || shifts[0]?.id;
                                                    const isDirty = Boolean(pendingChanges[`${pegawai.id}-${d}`]);

                                                    return (
                                                        <TableCell
                                                            key={d}
                                                            className={`p-0 border-r text-center relative ${
                                                                isDirty ? 'ring-2 ring-blue-500 ring-inset z-10' : ''
                                                            }`}
                                                        >
                                                            {isDirty && (
                                                                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-blue-600 z-20" title="Perubahan belum disimpan" />
                                                            )}
                                                            <select
                                                                value={currentShiftId}
                                                                onChange={(e) =>
                                                                    handleLocalCellChange(pegawai.id, d, Number(e.target.value))
                                                                }
                                                                className={`w-full h-9 text-center text-xs border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none ${getShiftBadgeStyle(
                                                                    currentKode
                                                                )}`}
                                                            >
                                                                {shifts.map((s) => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.kode_shift}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Real-time Shift Summary Breakdown */}
                {pegawais.length > 0 && (
                    <Card className="border border-slate-200 shadow-md bg-white">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-emerald-600" />
                                Ringkasan Total Shift Pegawai (Real-Time)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table className="w-full text-xs">
                                <TableHeader>
                                    <TableRow className="bg-slate-100/80">
                                        <TableHead className="font-bold text-slate-700">Nama Pegawai</TableHead>
                                        {shifts.map((s) => (
                                            <TableHead key={s.id} className="text-center font-bold text-slate-700">
                                                {s.kode_shift}
                                                {s.is_tidak_masuk_kerja && (
                                                    <span className="text-[10px] text-red-500 font-bold block" title="Tidak Dihitung Hari Kerja">*</span>
                                                )}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center font-bold text-slate-900 bg-slate-200">
                                            Total Hari Kerja
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pegawais.map((pegawai) => {
                                        const counts = getPegawaiShiftCounts(pegawai.id);
                                        const totalWorkDays = Object.entries(counts)
                                            .filter(([kode]) => !offShiftKodes.has(kode))
                                            .reduce((sum, [, qty]) => sum + qty, 0);

                                        return (
                                            <TableRow key={pegawai.id} className="hover:bg-slate-50">
                                                <TableCell className="font-semibold text-slate-800">
                                                    {pegawai.nama}
                                                </TableCell>
                                                {shifts.map((s) => (
                                                    <TableCell key={s.id} className="text-center">
                                                        <span
                                                            className={`inline-block min-w-[20px] px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                                                counts[s.kode_shift] > 0
                                                                    ? 'bg-slate-100 text-slate-900 border border-slate-300'
                                                                    : 'text-slate-300'
                                                            }`}
                                                        >
                                                            {counts[s.kode_shift] || 0}
                                                        </span>
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center font-bold text-slate-900 bg-blue-50/80 text-blue-900 border-l border-slate-300">
                                                    {totalWorkDays} Hari
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Sticky Floating Save Action Bar when changes exist */}
            {pendingCount > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-2 text-sm font-medium pr-2 border-r border-slate-700">
                        <AlertCircle className="h-4 w-4 text-amber-400 animate-pulse" />
                        <span>
                            <strong className="text-amber-300">{pendingCount}</strong> perubahan belum disimpan
                        </span>
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDiscardChanges}
                        disabled={isSaving}
                        className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 text-xs"
                    >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Batal
                    </Button>

                    <Button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-8 text-xs px-4 rounded-full shadow-lg shadow-blue-500/30 gap-1.5"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                </div>
            )}

            {/* Bulk Update Modal */}
            <BulkUpdateModal
                key={`bulk-${jadwalBulanan.id}-${bulan}-${tahun}`}
                open={isBulkModalOpen}
                onOpenChange={setIsBulkModalOpen}
                jadwalBulananId={jadwalBulanan.id}
                pegawais={pegawais}
                shifts={shifts}
                bulan={bulan}
                tahun={tahun}
            />

            {/* Master Shift Modal for current schedule category */}
            <MasterShiftModal
                key={`shift-${category}`}
                open={isShiftModalOpen}
                onOpenChange={setIsShiftModalOpen}
                category={category}
                shifts={shifts}
            />

            {/* Syncing Progress Card Modal */}
            <SyncingScheduleModal open={isSaving} bulan={bulan} tahun={tahun} />
        </>
    );
}

Index.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Jadwal Dinas', href: '/jadwal/operasional' },
            { title: 'Jadwal Dinas Operasional & TU', href: '/jadwal/operasional' },
        ]}
    >
        {page}
    </AppLayout>
);
