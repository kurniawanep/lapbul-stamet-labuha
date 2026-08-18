import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
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
import { Badge } from '@/components/ui/badge';
import { Clock, Edit3, Plus } from 'lucide-react';

interface MasterShift {
    id: number;
    kode_shift: string;
    nama_shift: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
}

interface Props {
    shifts: MasterShift[];
}

export default function MasterShiftPage({ shifts }: Props) {
    const [editingShift, setEditingShift] = useState<MasterShift | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Edit form
    const editForm = useForm({
        kode_shift: '',
        nama_shift: '',
        jam_masuk: '',
        jam_keluar: '',
    });

    // Add form
    const addForm = useForm({
        kode_shift: '',
        nama_shift: '',
        jam_masuk: '',
        jam_keluar: '',
    });

    const openEditModal = (shift: MasterShift) => {
        setEditingShift(shift);
        editForm.setData({
            kode_shift: shift.kode_shift || '',
            nama_shift: shift.nama_shift || '',
            jam_masuk: shift.jam_masuk || '',
            jam_keluar: shift.jam_keluar || '',
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingShift) return;

        editForm.patch(`/jadwal/shifts/${editingShift.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingShift(null);
                editForm.reset();
            },
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/jadwal/shifts', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddModalOpen(false);
                addForm.reset();
            },
        });
    };

    return (
        <>
            <Head title="Master Shift - BMKG" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Clock className="h-6 w-6 text-blue-600" />
                            Master Shift Dinas
                        </h1>
                        <p className="text-sm text-slate-500">
                            Kelola kode shift, deskripsi, serta konfigurasi jam masuk dan jam keluar kerja.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                            {shifts.length} Total Shift
                        </Badge>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-900/20"
                        >
                            <Plus className="h-4 w-4" /> Tambah Shift Baru
                        </Button>
                    </div>
                </div>

                <Card className="border border-slate-200 shadow-md bg-white">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-lg font-bold text-slate-800">
                            Daftar Kode & Jam Kerja Shift
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table className="w-full text-sm">
                            <TableHeader>
                                <TableRow className="bg-slate-100/80">
                                    <TableHead className="w-16 text-center font-bold">No</TableHead>
                                    <TableHead className="w-28 font-bold">Kode Shift</TableHead>
                                    <TableHead className="font-bold">Nama Shift</TableHead>
                                    <TableHead className="w-36 font-bold text-center">Jam Masuk (WIT)</TableHead>
                                    <TableHead className="w-36 font-bold text-center">Jam Keluar (WIT)</TableHead>
                                    <TableHead className="w-24 font-bold text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.map((shift, idx) => (
                                    <TableRow key={shift.id} className="hover:bg-slate-50">
                                        <TableCell className="text-center font-medium text-slate-500">
                                            {idx + 1}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold px-2.5 py-0.5">
                                                {shift.kode_shift}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-800">
                                            {shift.nama_shift}
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {shift.jam_masuk ? shift.jam_masuk.substring(0, 5) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            {shift.jam_keluar ? shift.jam_keluar.substring(0, 5) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openEditModal(shift)}
                                                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                >
                                                    <Edit3 className="h-4 w-4 mr-1" /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (confirm(`Yakin ingin menghapus shift ${shift.kode_shift}?`)) {
                                                            const { router } = require('@inertiajs/react');
                                                            router.delete(`/jadwal/shifts/${shift.id}`, { preserveScroll: true });
                                                        }
                                                    }}
                                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                                >
                                                    <Edit3 className="h-4 w-4 mr-1 text-red-500" /> Hapus
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Add Shift Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Plus className="h-5 w-5 text-blue-600" />
                                Tambah Master Shift Baru
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan kode shift baru, nama deskripsi, dan jam kerja operasional.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="add_kode_shift">Kode Shift (Unik, misal: P2, M3)</Label>
                                <Input
                                    id="add_kode_shift"
                                    value={addForm.data.kode_shift}
                                    onChange={(e) => addForm.setData('kode_shift', e.target.value)}
                                    placeholder="Contoh: P2"
                                    className="uppercase font-semibold"
                                />
                                {addForm.errors.kode_shift && (
                                    <p className="text-xs text-red-500">{addForm.errors.kode_shift}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="add_nama_shift">Nama Shift</Label>
                                <Input
                                    id="add_nama_shift"
                                    value={addForm.data.nama_shift}
                                    onChange={(e) => addForm.setData('nama_shift', e.target.value)}
                                    placeholder="Contoh: PAGI CADANGAN"
                                />
                                {addForm.errors.nama_shift && (
                                    <p className="text-xs text-red-500">{addForm.errors.nama_shift}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="add_jam_masuk">Jam Masuk (Opsional)</Label>
                                    <Input
                                        id="add_jam_masuk"
                                        type="time"
                                        step="1"
                                        value={addForm.data.jam_masuk}
                                        onChange={(e) => addForm.setData('jam_masuk', e.target.value)}
                                    />
                                    {addForm.errors.jam_masuk && (
                                        <p className="text-xs text-red-500">{addForm.errors.jam_masuk}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="add_jam_keluar">Jam Keluar (Opsional)</Label>
                                    <Input
                                        id="add_jam_keluar"
                                        type="time"
                                        step="1"
                                        value={addForm.data.jam_keluar}
                                        onChange={(e) => addForm.setData('jam_keluar', e.target.value)}
                                    />
                                    {addForm.errors.jam_keluar && (
                                        <p className="text-xs text-red-500">{addForm.errors.jam_keluar}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={addForm.processing}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {addForm.processing ? 'Menyimpan...' : 'Tambah Shift'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Shift Modal */}
            <Dialog open={Boolean(editingShift)} onOpenChange={(open) => !open && setEditingShift(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                Edit Master Shift [{editingShift?.kode_shift}]
                            </DialogTitle>
                            <DialogDescription>
                                Perbarui kode shift, nama shift, dan batasan jam operasional.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit_kode_shift">Kode Shift</Label>
                                <Input
                                    id="edit_kode_shift"
                                    value={editForm.data.kode_shift}
                                    onChange={(e) => editForm.setData('kode_shift', e.target.value)}
                                    placeholder="Contoh: PAGI"
                                    className="uppercase font-semibold"
                                />
                                {editForm.errors.kode_shift && (
                                    <p className="text-xs text-red-500">{editForm.errors.kode_shift}</p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="nama_shift">Nama Shift</Label>
                                <Input
                                    id="nama_shift"
                                    value={editForm.data.nama_shift}
                                    onChange={(e) => editForm.setData('nama_shift', e.target.value)}
                                    placeholder="Contoh: PAGI OBS"
                                />
                                {editForm.errors.nama_shift && (
                                    <p className="text-xs text-red-500">{editForm.errors.nama_shift}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="jam_masuk">Jam Masuk (HH:MM:SS)</Label>
                                    <Input
                                        id="jam_masuk"
                                        type="time"
                                        step="1"
                                        value={editForm.data.jam_masuk}
                                        onChange={(e) => editForm.setData('jam_masuk', e.target.value)}
                                    />
                                    {editForm.errors.jam_masuk && (
                                        <p className="text-xs text-red-500">{editForm.errors.jam_masuk}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="jam_keluar">Jam Keluar (HH:MM:SS)</Label>
                                    <Input
                                        id="jam_keluar"
                                        type="time"
                                        step="1"
                                        value={editForm.data.jam_keluar}
                                        onChange={(e) => editForm.setData('jam_keluar', e.target.value)}
                                    />
                                    {editForm.errors.jam_keluar && (
                                        <p className="text-xs text-red-500">{editForm.errors.jam_keluar}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingShift(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={editForm.processing}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {editForm.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
