import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Clock, Edit2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import InputError from '@/components/input-error';

interface MasterShift {
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
}

export default function MasterShiftModal({
    open,
    onOpenChange,
    category,
    shifts,
}: MasterShiftModalProps) {
    const [editingShift, setEditingShift] = useState<MasterShift | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);

    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        category: category,
        kode_shift: '',
        nama_shift: '',
        jam_masuk: '',
        jam_keluar: '',
        is_tidak_masuk_kerja: false,
    });

    const openAddForm = () => {
        setEditingShift(null);
        reset();
        clearErrors();
        setData({
            category: category,
            kode_shift: '',
            nama_shift: '',
            jam_masuk: '',
            jam_keluar: '',
            is_tidak_masuk_kerja: false,
        });
        setIsAddMode(true);
    };

    const openEditForm = (shift: MasterShift) => {
        setIsAddMode(false);
        setEditingShift(shift);
        clearErrors();
        setData({
            category: category,
            kode_shift: shift.kode_shift,
            nama_shift: shift.nama_shift,
            jam_masuk: shift.jam_masuk || '',
            jam_keluar: shift.jam_keluar || '',
            is_tidak_masuk_kerja: Boolean(shift.is_tidak_masuk_kerja),
        });
    };

    const handleCancelForm = () => {
        setIsAddMode(false);
        setEditingShift(null);
        reset();
        clearErrors();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingShift) {
            patch(`/jadwal/shifts/${editingShift.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancelForm();
                },
            });
        } else {
            post('/jadwal/shifts', {
                preserveScroll: true,
                onSuccess: () => {
                    handleCancelForm();
                },
            });
        }
    };

    const handleDelete = (shift: MasterShift) => {
        if (confirm(`Yakin ingin menghapus shift ${shift.kode_shift} (${shift.nama_shift})?`)) {
            router.delete(`/jadwal/shifts/${shift.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    if (editingShift?.id === shift.id) {
                        handleCancelForm();
                    }
                },
            });
        }
    };

    const categoryLabels: Record<string, string> = {
        operasional: 'Operasional & TU',
        teknisi: 'Teknisi',
        ppnpn: 'PPNPN',
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Sparkles className="h-3 w-3 mr-1" /> Master Shift {categoryLabels[category]}
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-1">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Pengaturan Master Shift ({categoryLabels[category]})
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Kelola kode, nama, jam kerja, dan opsi "Tidak Masuk Kerja" khusus untuk kelompok {categoryLabels[category]}.
                    </DialogDescription>
                </DialogHeader>

                {/* Form Section (Add or Edit) */}
                {(isAddMode || editingShift) && (
                    <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                {editingShift ? <Edit2 className="h-4 w-4 text-blue-600" /> : <Plus className="h-4 w-4 text-emerald-600" />}
                                {editingShift ? `Edit Shift: ${editingShift.kode_shift}` : 'Tambah Shift Baru'}
                            </h4>
                            <Button type="button" variant="ghost" size="sm" onClick={handleCancelForm} className="h-7 w-7 p-0">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <Label htmlFor="kode_shift" className="text-xs font-semibold">
                                    Kode Shift <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="kode_shift"
                                    value={data.kode_shift}
                                    onChange={(e) => setData('kode_shift', e.target.value.toUpperCase())}
                                    placeholder="mis. P1, S, M"
                                    className="h-8 text-xs uppercase"
                                    required
                                />
                                <InputError message={errors.kode_shift} />
                            </div>

                            <div>
                                <Label htmlFor="nama_shift" className="text-xs font-semibold">
                                    Nama Shift <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="nama_shift"
                                    value={data.nama_shift}
                                    onChange={(e) => setData('nama_shift', e.target.value)}
                                    placeholder="mis. PAGI TEKNISI"
                                    className="h-8 text-xs"
                                    required
                                />
                                <InputError message={errors.nama_shift} />
                            </div>

                            <div>
                                <Label htmlFor="jam_masuk" className="text-xs font-semibold">
                                    Jam Masuk
                                </Label>
                                <Input
                                    id="jam_masuk"
                                    type="time"
                                    step="1"
                                    value={data.jam_masuk}
                                    onChange={(e) => setData('jam_masuk', e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <InputError message={errors.jam_masuk} />
                            </div>

                            <div>
                                <Label htmlFor="jam_keluar" className="text-xs font-semibold">
                                    Jam Keluar
                                </Label>
                                <Input
                                    id="jam_keluar"
                                    type="time"
                                    step="1"
                                    value={data.jam_keluar}
                                    onChange={(e) => setData('jam_keluar', e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <InputError message={errors.jam_keluar} />
                            </div>
                        </div>

                        {/* Checkbox Tidak Masuk Kerja */}
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                            <input
                                type="checkbox"
                                id="is_tidak_masuk_kerja"
                                checked={data.is_tidak_masuk_kerja}
                                onChange={(e) => setData('is_tidak_masuk_kerja', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <Label htmlFor="is_tidak_masuk_kerja" className="text-xs font-semibold cursor-pointer text-slate-800">
                                Shift Tidak Masuk Kerja (Libur / Cuti / Tidak Dihitung Hari Kerja)
                            </Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <Button type="button" variant="outline" size="sm" onClick={handleCancelForm} className="h-8 text-xs">
                                Batal
                            </Button>
                            <Button type="submit" disabled={processing} size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
                                <Save className="h-3.5 w-3.5" />
                                {editingShift ? 'Simpan Perubahan' : 'Tambah Shift'}
                            </Button>
                        </div>
                    </form>
                )}

                {/* Header Actions */}
                {!isAddMode && !editingShift && (
                    <div className="flex justify-end mb-2">
                        <Button size="sm" onClick={openAddForm} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5 shadow-sm">
                            <Plus className="h-3.5 w-3.5" /> Tambah Master Shift Baru
                        </Button>
                    </div>
                )}

                {/* Table of Master Shifts */}
                <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow className="bg-slate-100/80">
                                <TableHead className="font-bold text-slate-700 w-12 text-center">No</TableHead>
                                <TableHead className="font-bold text-slate-700 w-24">Kode Shift</TableHead>
                                <TableHead className="font-bold text-slate-700">Nama Shift</TableHead>
                                <TableHead className="font-bold text-slate-700 text-center w-24">Jam Masuk</TableHead>
                                <TableHead className="font-bold text-slate-700 text-center w-24">Jam Keluar</TableHead>
                                <TableHead className="font-bold text-slate-700 text-center w-36">Kategori Kerja</TableHead>
                                <TableHead className="font-bold text-slate-700 text-center w-24">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-6 text-slate-400">
                                        Belum ada master shift untuk kategori {categoryLabels[category]}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shifts.map((shift, idx) => (
                                    <TableRow key={shift.id} className="hover:bg-slate-50">
                                        <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            <Badge variant="outline" className="bg-slate-100 font-mono text-xs">
                                                {shift.kode_shift}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-800">{shift.nama_shift}</TableCell>
                                        <TableCell className="text-center font-mono text-slate-600">
                                            {shift.jam_masuk ? shift.jam_masuk.slice(0, 5) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-slate-600">
                                            {shift.jam_keluar ? shift.jam_keluar.slice(0, 5) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {shift.is_tidak_masuk_kerja ? (
                                                <Badge className="bg-red-100 text-red-800 border-red-200 font-medium text-[10px]">
                                                    Tidak Masuk Kerja
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium text-[10px]">
                                                    Hari Kerja
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditForm(shift)}
                                                    className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                    title="Edit Shift"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(shift)}
                                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                                    title="Hapus Shift"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
