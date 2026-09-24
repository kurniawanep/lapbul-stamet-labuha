import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Plus,
    RotateCcw,
    Save,
    Sparkles,
    Trash2,
    Wrench,
    Briefcase,
    Calendar,
} from 'lucide-react';
import SyncingScheduleModal from '@/components/Jadwal/SyncingScheduleModal';

interface MasterShift {
    id: number;
    category?: string;
    kode_shift: string;
    nama_shift: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
    is_tidak_masuk_kerja?: boolean;
}

interface Props {
    shifts: MasterShift[];
    allMasterShifts?: MasterShift[];
    category?: 'operasional' | 'teknisi' | 'ppnpn';
    bulan?: number;
    tahun?: number;
    jadwalBulanan?: {
        id: number;
        bulan: number;
        tahun: number;
        stasiun: string;
    };
}

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MasterShiftPage({
    shifts: serverShifts = [],
    category = 'operasional',
    bulan = 8,
    tahun = 2026,
    jadwalBulanan,
}: Props) {
    const [localShifts, setLocalShifts] = useState<MasterShift[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [newShift, setNewShift] = useState({
        kode_shift: '',
        nama_shift: '',
        jam_masuk: '',
        jam_keluar: '',
        is_tidak_masuk_kerja: false,
    });
    const [addError, setAddError] = useState<string | null>(null);

    useEffect(() => {
        setLocalShifts(
            serverShifts.map((s) => ({
                ...s,
                jam_masuk: s.jam_masuk ? s.jam_masuk.slice(0, 8) : '',
                jam_keluar: s.jam_keluar ? s.jam_keluar.slice(0, 8) : '',
                is_tidak_masuk_kerja: Boolean(s.is_tidak_masuk_kerja),
            }))
        );
        setIsAddMode(false);
        setAddError(null);
    }, [serverShifts]);

    const handleCategoryChange = (newCategory: string) => {
        if (hasChanges()) {
            if (!confirm('Terdapat perubahan yang belum disimpan. Yakin ingin berganti kategori?')) {
                return;
            }
        }
        router.get('/jadwal/shifts', { category: newCategory, bulan, tahun }, { preserveState: true });
    };

    const handleMonthYearChange = (newBulan: number, newTahun: number) => {
        if (hasChanges()) {
            if (!confirm('Terdapat perubahan yang belum disimpan. Yakin ingin berganti periode?')) {
                return;
            }
        }
        router.get('/jadwal/shifts', { category, bulan: newBulan, tahun: newTahun }, { preserveState: true });
    };

    const handleFieldChange = (id: number, field: keyof MasterShift, value: any) => {
        setLocalShifts((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const handleResetToDefault = () => {
        setLocalShifts(
            serverShifts.map((s) => ({
                ...s,
                jam_masuk: s.jam_masuk ? s.jam_masuk.slice(0, 8) : '',
                jam_keluar: s.jam_keluar ? s.jam_keluar.slice(0, 8) : '',
                is_tidak_masuk_kerja: Boolean(s.is_tidak_masuk_kerja),
            }))
        );
    };

    const hasChanges = () => {
        if (localShifts.length !== serverShifts.length) return true;
        return localShifts.some((local) => {
            const server = serverShifts.find((s) => s.id === local.id);
            if (!server) return true;
            const sMasuk = (server.jam_masuk || '').slice(0, 5);
            const lMasuk = (local.jam_masuk || '').slice(0, 5);
            const sKeluar = (server.jam_keluar || '').slice(0, 5);
            const lKeluar = (local.jam_keluar || '').slice(0, 5);

            return (
                server.kode_shift !== local.kode_shift ||
                server.nama_shift !== local.nama_shift ||
                sMasuk !== lMasuk ||
                sKeluar !== lKeluar ||
                Boolean(server.is_tidak_masuk_kerja) !== Boolean(local.is_tidak_masuk_kerja)
            );
        });
    };

    const handleSaveAll = () => {
        setIsSaving(true);
        router.post(
            '/jadwal/shifts/batch-update',
            {
                category,
                jadwal_bulanan_id: jadwalBulanan?.id,
                bulan,
                tahun,
                shifts: localShifts.map((s) => ({
                    id: s.id,
                    kode_shift: s.kode_shift.trim().toUpperCase(),
                    nama_shift: s.nama_shift.trim(),
                    jam_masuk: s.jam_masuk || null,
                    jam_keluar: s.jam_keluar || null,
                    is_tidak_masuk_kerja: Boolean(s.is_tidak_masuk_kerja),
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const handleCreateNewShift = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newShift.kode_shift.trim()) {
            setAddError('Kode shift wajib diisi.');
            return;
        }
        if (!newShift.nama_shift.trim()) {
            setAddError('Nama shift wajib diisi.');
            return;
        }

        setIsSaving(true);
        router.post(
            '/jadwal/shifts',
            {
                category,
                jadwal_bulanan_id: jadwalBulanan?.id,
                bulan,
                tahun,
                kode_shift: newShift.kode_shift.trim().toUpperCase(),
                nama_shift: newShift.nama_shift.trim(),
                jam_masuk: newShift.jam_masuk || null,
                jam_keluar: newShift.jam_keluar || null,
                is_tidak_masuk_kerja: newShift.is_tidak_masuk_kerja,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                    setIsAddMode(false);
                    setNewShift({
                        kode_shift: '',
                        nama_shift: '',
                        jam_masuk: '',
                        jam_keluar: '',
                        is_tidak_masuk_kerja: false,
                    });
                    setAddError(null);
                },
                onError: (err) => {
                    setIsSaving(false);
                    setAddError(Object.values(err)[0] as string);
                },
            }
        );
    };

    const handleDelete = (shift: MasterShift) => {
        if (confirm(`Yakin ingin menghapus shift ${shift.kode_shift} (${shift.nama_shift})? Semua data operasional bulan ${NAMA_BULAN[bulan - 1]} ${tahun} yang terkait akan diselaraskan.`)) {
            setIsSaving(true);
            router.delete(`/jadwal/shifts/${shift.id}`, {
                data: {
                    bulan,
                    tahun,
                    jadwal_bulanan_id: jadwalBulanan?.id,
                },
                preserveScroll: true,
                onSuccess: () => {
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            });
        }
    };

    const isDirty = hasChanges();

    return (
        <>
            <Head title="Master Shift & Konfigurasi Jam Kerja - BMKG" />

            <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px] mx-auto w-full bg-slate-50 min-h-screen pb-24">
                {/* Header Card */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1 text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Master Konfigurasi Shift
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                Periode: {NAMA_BULAN[bulan - 1]} {tahun}
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                            <Clock className="h-7 w-7 text-blue-400" />
                            Master Shift Dinas
                        </h1>
                        <p className="text-blue-200/80 text-sm">
                            Kelola kode shift, jam masuk/keluar kerja (WIT), dan konfigurasi shift dinas.
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

                        {/* Save Button in Header */}
                        <Button
                            onClick={handleSaveAll}
                            disabled={isSaving || localShifts.length === 0}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2 shadow-lg shadow-blue-900/30"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Master Shift'}
                        </Button>
                    </div>
                </div>

                {/* Category Navigation Tabs */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                    <Button
                        variant={category === 'operasional' ? 'default' : 'ghost'}
                        onClick={() => handleCategoryChange('operasional')}
                        className={`text-xs font-semibold gap-1.5 ${category === 'operasional' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                    >
                        <Calendar className="h-4 w-4" /> Shift Operasional & TU
                    </Button>
                    <Button
                        variant={category === 'teknisi' ? 'default' : 'ghost'}
                        onClick={() => handleCategoryChange('teknisi')}
                        className={`text-xs font-semibold gap-1.5 ${category === 'teknisi' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                    >
                        <Wrench className="h-4 w-4" /> Shift Teknisi
                    </Button>
                    <Button
                        variant={category === 'ppnpn' ? 'default' : 'ghost'}
                        onClick={() => handleCategoryChange('ppnpn')}
                        className={`text-xs font-semibold gap-1.5 ${category === 'ppnpn' ? 'bg-purple-600 text-white' : 'text-slate-600'}`}
                    >
                        <Briefcase className="h-4 w-4" /> Shift PPNPN
                    </Button>
                </div>

                {/* Add Shift Form */}
                {isAddMode ? (
                    <Card className="border border-slate-300 shadow-md bg-slate-50">
                        <CardHeader className="border-b pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-emerald-600" /> Tambah Shift Baru
                                </CardTitle>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsAddMode(false);
                                        setAddError(null);
                                    }}
                                    className="h-7 text-xs"
                                >
                                    Batal
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form onSubmit={handleCreateNewShift} className="space-y-4">
                                {addError && (
                                    <div className="bg-red-50 text-red-700 text-xs p-2 rounded border border-red-200 flex items-center gap-1.5">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <span>{addError}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold">
                                            Kode Shift <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            value={newShift.kode_shift}
                                            onChange={(e) => setNewShift({ ...newShift, kode_shift: e.target.value.toUpperCase() })}
                                            placeholder="mis. P1, S, M"
                                            className="h-9 text-xs uppercase font-bold"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">
                                            Nama Shift <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            value={newShift.nama_shift}
                                            onChange={(e) => setNewShift({ ...newShift, nama_shift: e.target.value })}
                                            placeholder="mis. PAGI OBS 1"
                                            className="h-9 text-xs"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Jam Masuk (WIT)</Label>
                                        <Input
                                            type="time"
                                            step="1"
                                            value={newShift.jam_masuk}
                                            onChange={(e) => setNewShift({ ...newShift, jam_masuk: e.target.value })}
                                            className="h-9 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold">Jam Keluar (WIT)</Label>
                                        <Input
                                            type="time"
                                            step="1"
                                            value={newShift.jam_keluar}
                                            onChange={(e) => setNewShift({ ...newShift, jam_keluar: e.target.value })}
                                            className="h-9 text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            checked={newShift.is_tidak_masuk_kerja}
                                            onChange={(e) => setNewShift({ ...newShift, is_tidak_masuk_kerja: e.target.checked })}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-semibold text-slate-800">
                                            Shift Tidak Masuk Kerja (Libur / Cuti / Lepas Tugas)
                                        </span>
                                    </label>

                                    <Button
                                        type="submit"
                                        disabled={isSaving}
                                        size="sm"
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Simpan Shift Baru
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Table Card */}
                <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                    <CardHeader className="border-b bg-slate-50/70 p-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                            Daftar Kode & Jam Kerja Shift ({localShifts.length} Shift)
                        </CardTitle>
                        {!isAddMode && (
                            <Button
                                onClick={() => setIsAddMode(true)}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> Tambah Shift Baru
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="w-full text-xs">
                            <TableHeader>
                                <TableRow className="bg-slate-100/90 hover:bg-slate-100">
                                    <TableHead className="w-12 text-center font-bold text-slate-700">No</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700">Kode Shift</TableHead>
                                    <TableHead className="min-w-[200px] font-bold text-slate-700">Nama Shift</TableHead>
                                    <TableHead className="w-36 font-bold text-slate-700 text-center">Jam Masuk (WIT)</TableHead>
                                    <TableHead className="w-36 font-bold text-slate-700 text-center">Jam Keluar (WIT)</TableHead>
                                    <TableHead className="w-44 font-bold text-slate-700 text-center">Jenis Shift</TableHead>
                                    <TableHead className="w-20 font-bold text-slate-700 text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {localShifts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                                            Belum ada master shift untuk kategori ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    localShifts.map((shift, idx) => (
                                        <TableRow key={shift.id} className="hover:bg-blue-50/40 transition-colors">
                                            <TableCell className="text-center text-slate-500 font-medium">
                                                {idx + 1}
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={shift.kode_shift}
                                                    onChange={(e) => handleFieldChange(shift.id, 'kode_shift', e.target.value.toUpperCase())}
                                                    className="h-8 text-xs uppercase font-extrabold text-blue-900 bg-slate-50 focus:bg-white"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={shift.nama_shift}
                                                    onChange={(e) => handleFieldChange(shift.id, 'nama_shift', e.target.value)}
                                                    className="h-8 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="time"
                                                    step="1"
                                                    value={shift.jam_masuk || ''}
                                                    onChange={(e) => handleFieldChange(shift.id, 'jam_masuk', e.target.value)}
                                                    className="h-8 text-xs font-mono text-center bg-slate-50 focus:bg-white"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="time"
                                                    step="1"
                                                    value={shift.jam_keluar || ''}
                                                    onChange={(e) => handleFieldChange(shift.id, 'jam_keluar', e.target.value)}
                                                    className="h-8 text-xs font-mono text-center bg-slate-50 focus:bg-white"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={shift.is_tidak_masuk_kerja}
                                                        onChange={(e) => handleFieldChange(shift.id, 'is_tidak_masuk_kerja', e.target.checked)}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                    <span className={`text-[11px] font-semibold ${shift.is_tidak_masuk_kerja ? 'text-red-600' : 'text-emerald-700'}`}>
                                                        {shift.is_tidak_masuk_kerja ? 'Libur/Off' : 'Hari Kerja'}
                                                    </span>
                                                </label>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(shift)}
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Hapus Shift"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Floating Save Action Bar when edits exist */}
                {isDirty && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-center gap-2 text-sm font-medium pr-2 border-r border-slate-700">
                            <AlertCircle className="h-4 w-4 text-amber-400 animate-pulse" />
                            <span>Perubahan master shift belum disimpan</span>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetToDefault}
                            disabled={isSaving}
                            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 text-xs"
                        >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold h-8 text-xs px-4 rounded-full shadow-lg shadow-blue-500/30 gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Syncing Progress Card Modal */}
            <SyncingScheduleModal open={isSaving} bulan={bulan} tahun={tahun} />
        </>
    );
}

MasterShiftPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Jadwal Dinas', href: '/jadwal/operasional' },
            { title: 'Master Shift', href: '/jadwal/shifts' },
        ]}
    >
        {page}
    </AppLayout>
);
