import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Plus, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import SyncingScheduleModal from '@/components/Jadwal/SyncingScheduleModal';

export interface MasterShift {
    id: number;
    category?: string;
    kode_shift: string;
    nama_shift: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
    is_tidak_masuk_kerja?: boolean;
}

interface MasterShiftModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: 'operasional' | 'teknisi' | 'ppnpn';
    shifts: MasterShift[];
    bulan?: number;
    tahun?: number;
    jadwalBulananId?: number;
}

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MasterShiftModal({
    open,
    onOpenChange,
    category,
    shifts: serverShifts,
    bulan = 8,
    tahun = 2026,
    jadwalBulananId,
}: MasterShiftModalProps) {
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

    // Synchronize local state with server props when modal opens or shifts change
    useEffect(() => {
        if (open) {
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
        }
    }, [open, serverShifts]);

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
                jadwal_bulanan_id: jadwalBulananId,
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
                    onOpenChange(false);
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
                jadwal_bulanan_id: jadwalBulananId,
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
        if (confirm(`Yakin ingin menghapus shift ${shift.kode_shift} (${shift.nama_shift})? Semua data pengamatan yang terkait akan diselaraskan.`)) {
            setIsSaving(true);
            router.delete(`/jadwal/shifts/${shift.id}`, {
                data: {
                    bulan,
                    tahun,
                    jadwal_bulanan_id: jadwalBulananId,
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

    const categoryLabels: Record<string, string> = {
        operasional: 'Operasional & TU',
        teknisi: 'Teknisi',
        ppnpn: 'PPNPN',
    };

    const isDirty = hasChanges();

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    style={{ width: '96vw', maxWidth: '96vw' }}
                    className="w-[96vw] max-w-[96vw] max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-700 shadow-2xl"
                >
                    <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs">
                                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Master Shift {categoryLabels[category]}
                                </Badge>
                                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-xs">
                                    Periode: {NAMA_BULAN[bulan - 1]} {tahun}
                                </Badge>
                            </div>
                        </div>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2.5 text-white mt-2">
                            <Clock className="h-6 w-6 text-blue-400" />
                            Pengaturan Master Shift ({categoryLabels[category]})
                        </DialogTitle>
                        <DialogDescription className="text-xs text-blue-200/80">
                            Kelola kode shift, deskripsi, batasan jam masuk dan keluar operasional kerja.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Header Actions & Title */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-700">
                                Daftar Master Shift ({localShifts.length} Shift Terdaftar)
                            </span>
                            {!isAddMode && (
                                <Button
                                    type="button"
                                    onClick={() => setIsAddMode(true)}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5 shadow-sm font-semibold"
                                >
                                    <Plus className="h-4 w-4" /> Tambah Shift Baru
                                </Button>
                            )}
                        </div>

                        {/* Add New Shift Form */}
                        {isAddMode && (
                            <form onSubmit={handleCreateNewShift} className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <Plus className="h-4 w-4 text-emerald-600" /> Tambah Shift Baru
                                    </h4>
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
                                            placeholder="mis. PAGI 1"
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
                                            Shift Tidak Masuk Kerja (Libur / Cuti / Bebas Tugas)
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
                        )}

                        {/* Full Width Shifts Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <Table className="w-full text-xs">
                                <TableHeader>
                                    <TableRow className="bg-slate-100 hover:bg-slate-100">
                                        <TableHead className="w-14 text-center font-bold text-slate-700">No</TableHead>
                                        <TableHead className="w-36 font-bold text-slate-700">Kode Shift</TableHead>
                                        <TableHead className="min-w-[280px] font-bold text-slate-700">Nama Shift</TableHead>
                                        <TableHead className="w-44 font-bold text-slate-700 text-center">Jam Masuk (WIT)</TableHead>
                                        <TableHead className="w-44 font-bold text-slate-700 text-center">Jam Keluar (WIT)</TableHead>
                                        <TableHead className="w-48 font-bold text-slate-700 text-center">Jenis Shift</TableHead>
                                        <TableHead className="w-20 font-bold text-slate-700 text-center">Hapus</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localShifts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                                                Belum ada master shift untuk kategori {categoryLabels[category]}.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        localShifts.map((shift, idx) => (
                                            <TableRow key={shift.id} className="hover:bg-blue-50/40 transition-colors">
                                                <TableCell className="text-center text-slate-500 font-medium">
                                                    {idx + 1}
                                                </TableCell>

                                                {/* Kode Shift */}
                                                <TableCell>
                                                    <Input
                                                        value={shift.kode_shift}
                                                        onChange={(e) => handleFieldChange(shift.id, 'kode_shift', e.target.value.toUpperCase())}
                                                        className="h-9 text-xs uppercase font-extrabold text-blue-900 bg-slate-50 focus:bg-white"
                                                    />
                                                </TableCell>

                                                {/* Nama Shift */}
                                                <TableCell>
                                                    <Input
                                                        value={shift.nama_shift}
                                                        onChange={(e) => handleFieldChange(shift.id, 'nama_shift', e.target.value)}
                                                        className="h-9 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white"
                                                    />
                                                </TableCell>

                                                {/* Jam Masuk */}
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        step="1"
                                                        value={shift.jam_masuk || ''}
                                                        onChange={(e) => handleFieldChange(shift.id, 'jam_masuk', e.target.value)}
                                                        className="h-9 text-xs font-mono text-center bg-slate-50 focus:bg-white"
                                                    />
                                                </TableCell>

                                                {/* Jam Keluar */}
                                                <TableCell>
                                                    <Input
                                                        type="time"
                                                        step="1"
                                                        value={shift.jam_keluar || ''}
                                                        onChange={(e) => handleFieldChange(shift.id, 'jam_keluar', e.target.value)}
                                                        className="h-9 text-xs font-mono text-center bg-slate-50 focus:bg-white"
                                                    />
                                                </TableCell>

                                                {/* Shift Tidak Masuk Kerja */}
                                                <TableCell className="text-center">
                                                    <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={shift.is_tidak_masuk_kerja}
                                                            onChange={(e) => handleFieldChange(shift.id, 'is_tidak_masuk_kerja', e.target.checked)}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        <span className={`text-xs font-semibold ${shift.is_tidak_masuk_kerja ? 'text-red-600' : 'text-emerald-700'}`}>
                                                            {shift.is_tidak_masuk_kerja ? 'Libur / Lepas' : 'Hari Kerja'}
                                                        </span>
                                                    </label>
                                                </TableCell>

                                                {/* Delete Action */}
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(shift)}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Hapus Shift"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <DialogFooter className="p-4 px-6 border-t bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {isDirty && (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1.5 text-xs py-1 px-3">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    Terdapat perubahan yang belum disimpan
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            {isDirty && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleResetToDefault}
                                    disabled={isSaving}
                                    className="h-9 text-xs"
                                >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving}
                                className="h-9 text-xs px-4"
                            >
                                Tutup
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSaveAll}
                                disabled={isSaving || localShifts.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs px-5 gap-2 shadow-md shadow-blue-900/20"
                            >
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Menyimpan & Menyelaraskan...' : 'Simpan Master Shift & Selaraskan Data'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Syncing Progress Animation Modal */}
            <SyncingScheduleModal open={isSaving} bulan={bulan} tahun={tahun} />
        </>
    );
}
