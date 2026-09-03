import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Edit3, Plus, Search, Trash2, UserCheck, Users, AlertTriangle, Calendar, ShieldCheck, Briefcase, Mail, Key } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import type { BreadcrumbItem } from '@/types';

interface Pegawai {
    id: number;
    jenis_pegawai: 'PNS' | 'PPNPN';
    nip: string | null;
    nama: string;
    email: string | null;
    pangkat: string | null;
    golongan: string | null;
    role: string | null;
    jabatan: string | null;
    tanggal_masuk_kerja: string | null;
}

interface Props {
    pegawais: Pegawai[];
    filters: {
        search?: string;
        jenis?: string;
    };
    rolesPns: string[];
}

const GOLONGAN_OPTIONS = [
    'I/a', 'I/b', 'I/c', 'I/d',
    'II/a', 'II/b', 'II/c', 'II/d',
    'III/a', 'III/b', 'III/c', 'III/d',
    'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e',
];

export default function PegawaiIndex({ pegawais, filters, rolesPns }: Props) {
    const { can } = usePermission();
    const canManage = can('pegawai.manage');

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [jenisFilter, setJenisFilter] = useState(filters.jenis || 'ALL');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPegawai, setEditingPegawai] = useState<Pegawai | null>(null);
    const [deletingPegawai, setDeletingPegawai] = useState<Pegawai | null>(null);

    // Form for Add
    const addForm = useForm({
        jenis_pegawai: 'PNS' as 'PNS' | 'PPNPN',
        nama: '',
        email: '',
        password: '',
        nip: '',
        pangkat: '',
        golongan: '',
        role: '',
        jabatan: '',
        tanggal_masuk_kerja: '',
    });

    // Form for Edit
    const editForm = useForm({
        jenis_pegawai: 'PNS' as 'PNS' | 'PPNPN',
        nama: '',
        email: '',
        password: '',
        nip: '',
        pangkat: '',
        golongan: '',
        role: '',
        jabatan: '',
        tanggal_masuk_kerja: '',
    });

    // Form for Delete
    const deleteForm = useForm({});

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (jenisFilter && jenisFilter !== 'ALL') params.jenis = jenisFilter;
        router.get('/pegawai', params, { preserveState: true });
    };

    const handleJenisFilterChange = (val: string) => {
        setJenisFilter(val);
        const params: Record<string, string> = {};
        if (searchQuery) params.search = searchQuery;
        if (val !== 'ALL') params.jenis = val;
        router.get('/pegawai', params, { preserveState: true });
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setJenisFilter('ALL');
        router.get('/pegawai', {}, { preserveState: true });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/pegawai', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddModalOpen(false);
                addForm.reset();
            },
        });
    };

    const openEditModal = (pegawai: Pegawai) => {
        setEditingPegawai(pegawai);
        editForm.setData({
            jenis_pegawai: pegawai.jenis_pegawai || 'PNS',
            nama: pegawai.nama || '',
            email: pegawai.email || '',
            password: '',
            nip: pegawai.nip || '',
            pangkat: pegawai.pangkat || '',
            golongan: pegawai.golongan || '',
            role: pegawai.role || '',
            jabatan: pegawai.jabatan || '',
            tanggal_masuk_kerja: pegawai.tanggal_masuk_kerja ? pegawai.tanggal_masuk_kerja.substring(0, 10) : '',
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPegawai) return;

        editForm.patch(`/pegawai/${editingPegawai.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingPegawai(null);
                editForm.reset();
            },
        });
    };

    const handleDelete = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingPegawai) return;

        deleteForm.delete(`/pegawai/${deletingPegawai.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingPegawai(null);
            },
        });
    };

    const countPns = pegawais.filter((p) => p.jenis_pegawai === 'PNS').length;
    const countPpnpn = pegawais.filter((p) => p.jenis_pegawai === 'PPNPN').length;

    return (
        <>
            <Head title="Manajemen Pegawai & Akun - BMKG" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                PNS: {countPns}
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                                PPNPN: {countPpnpn}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Users className="h-6 w-6 text-blue-600" />
                            Manajemen Data Pegawai & Akun Akses
                        </h1>
                        <p className="text-sm text-slate-500">
                            Kelola profil dan akun login PNS dan PPNPN Stasiun Meteorologi Oesman Sadik.
                        </p>
                    </div>
                    {canManage && (
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md shadow-blue-900/20"
                        >
                            <Plus className="h-4 w-4" /> Tambah Pegawai
                        </Button>
                    )}
                </div>

                {/* Table & Search Card */}
                <Card className="border border-slate-200 shadow-md bg-white">
                    <CardHeader className="border-b bg-slate-50/50 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-blue-600" />
                                Daftar Pegawai (Akun Terpadu)
                            </CardTitle>

                            {/* Search & Filter Form */}
                            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                                <Select value={jenisFilter} onValueChange={handleJenisFilterChange}>
                                    <SelectTrigger className="w-[130px] text-xs h-9">
                                        <SelectValue placeholder="Semua Jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Jenis</SelectItem>
                                        <SelectItem value="PNS">PNS</SelectItem>
                                        <SelectItem value="PPNPN">PPNPN</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="relative w-56">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Cari nama, NIP, email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 text-xs h-9"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
                                    Cari
                                </Button>
                                {(filters.search || (filters.jenis && filters.jenis !== 'ALL')) && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearSearch}
                                        className="h-9 text-xs text-slate-500 hover:text-slate-800"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </form>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table className="w-full text-sm">
                            <TableHeader>
                                <TableRow className="bg-slate-100/80">
                                    <TableHead className="w-12 text-center font-bold">No</TableHead>
                                    <TableHead className="w-20 font-bold">Jenis</TableHead>
                                    <TableHead className="font-bold">Nama & Email (Login)</TableHead>
                                    <TableHead className="w-44 font-bold">NIP</TableHead>
                                    <TableHead className="font-bold">Role / Jabatan</TableHead>
                                    <TableHead className="w-36 font-bold">Pangkat / Gol.</TableHead>
                                    <TableHead className="w-28 font-bold text-center">TMT Masuk</TableHead>
                                    {canManage && <TableHead className="w-28 font-bold text-center">Aksi</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pegawais.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={canManage ? 8 : 7} className="text-center py-8 text-slate-400">
                                            Tidak ada data pegawai yang ditemukan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    pegawais.map((pegawai, idx) => (
                                        <TableRow key={pegawai.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="text-center font-medium text-slate-500">
                                                {idx + 1}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        pegawai.jenis_pegawai === 'PNS'
                                                            ? 'bg-blue-100 text-blue-900 border-blue-300 font-bold'
                                                            : 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                                                    }
                                                >
                                                    {pegawai.jenis_pegawai}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{pegawai.nama}</span>
                                                    {pegawai.email ? (
                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Mail className="h-3 w-3 text-slate-400" /> {pegawai.email}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 italic">Email belum diatur</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-700">
                                                {pegawai.nip || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex flex-col gap-0.5">
                                                    {pegawai.role && (
                                                        <span className="font-semibold text-blue-700">
                                                            [{pegawai.role}]
                                                        </span>
                                                    )}
                                                    <span className="text-slate-600">
                                                        {pegawai.jabatan || '-'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-700">
                                                {pegawai.jenis_pegawai === 'PNS' ? (
                                                    <span>
                                                        {pegawai.pangkat || '-'}
                                                        {pegawai.golongan ? ` (${pegawai.golongan})` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-mono text-slate-600">
                                                {pegawai.tanggal_masuk_kerja
                                                    ? pegawai.tanggal_masuk_kerja.substring(0, 10)
                                                    : '-'}
                                            </TableCell>
                                            {canManage && (
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditModal(pegawai)}
                                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 px-2"
                                                        >
                                                            <Edit3 className="h-4 w-4 mr-1" /> Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setDeletingPegawai(pegawai)}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 px-2"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" /> Hapus
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Add Pegawai Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Plus className="h-5 w-5 text-blue-600" />
                                Tambah Pegawai Baru (Akun)
                            </DialogTitle>
                            <DialogDescription>
                                Isikan informasi identitas pegawai dan email/password untuk login sistem.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Jenis Pegawai Radio Segment */}
                            <div className="grid gap-2">
                                <Label className="font-semibold">Jenis Pegawai *</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                            addForm.data.jenis_pegawai === 'PNS'
                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="PNS"
                                            checked={addForm.data.jenis_pegawai === 'PNS'}
                                            onChange={() => addForm.setData('jenis_pegawai', 'PNS')}
                                            className="sr-only"
                                        />
                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        <span>PNS</span>
                                    </label>

                                    <label
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                            addForm.data.jenis_pegawai === 'PPNPN'
                                                ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold ring-2 ring-purple-500/20'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="add_jenis"
                                            value="PPNPN"
                                            checked={addForm.data.jenis_pegawai === 'PPNPN'}
                                            onChange={() => addForm.setData('jenis_pegawai', 'PPNPN')}
                                            className="sr-only"
                                        />
                                        <Briefcase className="h-4 w-4 text-purple-600" />
                                        <span>PPNPN</span>
                                    </label>
                                </div>
                            </div>

                            {/* Nama Lengkap */}
                            <div className="grid gap-2">
                                <Label htmlFor="add_nama">Nama Lengkap *</Label>
                                <Input
                                    id="add_nama"
                                    value={addForm.data.nama}
                                    onChange={(e) => addForm.setData('nama', e.target.value)}
                                    placeholder="Contoh: BEN ARTHER MOLLE"
                                    required
                                />
                                {addForm.errors.nama && (
                                    <p className="text-xs text-red-500">{addForm.errors.nama}</p>
                                )}
                            </div>

                            {/* Email Login */}
                            <div className="grid gap-2">
                                <Label htmlFor="add_email" className="flex items-center gap-1.5">
                                    <Mail className="h-4 w-4 text-blue-600" /> Email Login (Opsional)
                                </Label>
                                <Input
                                    id="add_email"
                                    type="email"
                                    value={addForm.data.email}
                                    onChange={(e) => addForm.setData('email', e.target.value)}
                                    placeholder="nama@bmkg.go.id"
                                />
                                {addForm.errors.email && (
                                    <p className="text-xs text-red-500">{addForm.errors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="grid gap-2">
                                <Label htmlFor="add_password" className="flex items-center gap-1.5">
                                    <Key className="h-4 w-4 text-blue-600" /> Password Login
                                </Label>
                                <Input
                                    id="add_password"
                                    type="password"
                                    value={addForm.data.password}
                                    onChange={(e) => addForm.setData('password', e.target.value)}
                                    placeholder="Kosongkan untuk password default (bmkg1234)"
                                />
                                {addForm.errors.password && (
                                    <p className="text-xs text-red-500">{addForm.errors.password}</p>
                                )}
                            </div>

                            {/* PNS Specific Fields */}
                            {addForm.data.jenis_pegawai === 'PNS' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="add_nip">NIP *</Label>
                                        <Input
                                            id="add_nip"
                                            value={addForm.data.nip}
                                            onChange={(e) => addForm.setData('nip', e.target.value)}
                                            placeholder="Contoh: 198001012005011001"
                                            className="font-mono text-xs"
                                            required
                                        />
                                        {addForm.errors.nip && (
                                            <p className="text-xs text-red-500">{addForm.errors.nip}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="add_role">Role Pegawai (PNS) *</Label>
                                        <Select
                                            value={addForm.data.role}
                                            onValueChange={(val) => addForm.setData('role', val)}
                                        >
                                            <SelectTrigger id="add_role">
                                                <SelectValue placeholder="Pilih Role PNS" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {rolesPns.map((r) => (
                                                    <SelectItem key={r} value={r}>
                                                        {r}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {addForm.errors.role && (
                                            <p className="text-xs text-red-500">{addForm.errors.role}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="add_pangkat">Pangkat</Label>
                                            <Input
                                                id="add_pangkat"
                                                value={addForm.data.pangkat}
                                                onChange={(e) => addForm.setData('pangkat', e.target.value)}
                                                placeholder="Contoh: Penata Muda"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="add_golongan">Golongan</Label>
                                            <Select
                                                value={addForm.data.golongan}
                                                onValueChange={(val) => addForm.setData('golongan', val)}
                                            >
                                                <SelectTrigger id="add_golongan">
                                                    <SelectValue placeholder="Pilih Golongan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {GOLONGAN_OPTIONS.map((g) => (
                                                        <SelectItem key={g} value={g}>
                                                            {g}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Role PPNPN or Jabatan PNS */}
                            {addForm.data.jenis_pegawai === 'PPNPN' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="add_role_ppnpn">Role PPNPN</Label>
                                    <Input
                                        id="add_role_ppnpn"
                                        value={addForm.data.role}
                                        onChange={(e) => addForm.setData('role', e.target.value)}
                                        placeholder="Contoh: PPNPN / Tata Usaha / Pramubakti"
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="add_jabatan">Jabatan Fungsional (Opsional)</Label>
                                    <Input
                                        id="add_jabatan"
                                        value={addForm.data.jabatan}
                                        onChange={(e) => addForm.setData('jabatan', e.target.value)}
                                        placeholder="Contoh: PMG Ahli Pertama / PMG Penyelia"
                                    />
                                </div>
                            )}

                            {/* Tanggal Pertama Masuk Kerja */}
                            <div className="grid gap-2">
                                <Label htmlFor="add_tmt" className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    Tanggal Pertama Masuk Kerja (TMT)
                                </Label>
                                <Input
                                    id="add_tmt"
                                    type="date"
                                    value={addForm.data.tanggal_masuk_kerja}
                                    onChange={(e) => addForm.setData('tanggal_masuk_kerja', e.target.value)}
                                />
                                {addForm.errors.tanggal_masuk_kerja && (
                                    <p className="text-xs text-red-500">{addForm.errors.tanggal_masuk_kerja}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
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
                                {addForm.processing ? 'Menyimpan...' : 'Simpan Pegawai'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Pegawai Modal */}
            <Dialog open={Boolean(editingPegawai)} onOpenChange={(open) => !open && setEditingPegawai(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                Edit Data Pegawai & Akun
                            </DialogTitle>
                            <DialogDescription>
                                Perbarui data pegawai [{editingPegawai?.nama}].
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                            {/* Jenis Pegawai Radio Segment */}
                            <div className="grid gap-2">
                                <Label className="font-semibold">Jenis Pegawai *</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                            editForm.data.jenis_pegawai === 'PNS'
                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="edit_jenis"
                                            value="PNS"
                                            checked={editForm.data.jenis_pegawai === 'PNS'}
                                            onChange={() => editForm.setData('jenis_pegawai', 'PNS')}
                                            className="sr-only"
                                        />
                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        <span>PNS</span>
                                    </label>

                                    <label
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                                            editForm.data.jenis_pegawai === 'PPNPN'
                                                ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold ring-2 ring-purple-500/20'
                                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="edit_jenis"
                                            value="PPNPN"
                                            checked={editForm.data.jenis_pegawai === 'PPNPN'}
                                            onChange={() => editForm.setData('jenis_pegawai', 'PPNPN')}
                                            className="sr-only"
                                        />
                                        <Briefcase className="h-4 w-4 text-purple-600" />
                                        <span>PPNPN</span>
                                    </label>
                                </div>
                            </div>

                            {/* Nama Lengkap */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit_nama">Nama Lengkap *</Label>
                                <Input
                                    id="edit_nama"
                                    value={editForm.data.nama}
                                    onChange={(e) => editForm.setData('nama', e.target.value)}
                                    placeholder="Contoh: BEN ARTHER MOLLE"
                                    required
                                />
                                {editForm.errors.nama && (
                                    <p className="text-xs text-red-500">{editForm.errors.nama}</p>
                                )}
                            </div>

                            {/* Email Login */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit_email" className="flex items-center gap-1.5">
                                    <Mail className="h-4 w-4 text-blue-600" /> Email Login
                                </Label>
                                <Input
                                    id="edit_email"
                                    type="email"
                                    value={editForm.data.email}
                                    onChange={(e) => editForm.setData('email', e.target.value)}
                                    placeholder="nama@bmkg.go.id"
                                />
                                {editForm.errors.email && (
                                    <p className="text-xs text-red-500">{editForm.errors.email}</p>
                                )}
                            </div>

                            {/* Password Override */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit_password" className="flex items-center gap-1.5">
                                    <Key className="h-4 w-4 text-blue-600" /> Ubah Password (Opsional)
                                </Label>
                                <Input
                                    id="edit_password"
                                    type="password"
                                    value={editForm.data.password}
                                    onChange={(e) => editForm.setData('password', e.target.value)}
                                    placeholder="Isi hanya jika ingin mengganti password"
                                />
                                {editForm.errors.password && (
                                    <p className="text-xs text-red-500">{editForm.errors.password}</p>
                                )}
                            </div>

                            {/* PNS Specific Fields */}
                            {editForm.data.jenis_pegawai === 'PNS' && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit_nip">NIP *</Label>
                                        <Input
                                            id="edit_nip"
                                            value={editForm.data.nip}
                                            onChange={(e) => editForm.setData('nip', e.target.value)}
                                            placeholder="Contoh: 198001012005011001"
                                            className="font-mono text-xs"
                                            required
                                        />
                                        {editForm.errors.nip && (
                                            <p className="text-xs text-red-500">{editForm.errors.nip}</p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit_role">Role Pegawai (PNS) *</Label>
                                        <Select
                                            value={editForm.data.role}
                                            onValueChange={(val) => editForm.setData('role', val)}
                                        >
                                            <SelectTrigger id="edit_role">
                                                <SelectValue placeholder="Pilih Role PNS" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {rolesPns.map((r) => (
                                                    <SelectItem key={r} value={r}>
                                                        {r}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {editForm.errors.role && (
                                            <p className="text-xs text-red-500">{editForm.errors.role}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit_pangkat">Pangkat</Label>
                                            <Input
                                                id="edit_pangkat"
                                                value={editForm.data.pangkat}
                                                onChange={(e) => editForm.setData('pangkat', e.target.value)}
                                                placeholder="Contoh: Penata Muda"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit_golongan">Golongan</Label>
                                            <Select
                                                value={editForm.data.golongan}
                                                onValueChange={(val) => editForm.setData('golongan', val)}
                                            >
                                                <SelectTrigger id="edit_golongan">
                                                    <SelectValue placeholder="Pilih Golongan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {GOLONGAN_OPTIONS.map((g) => (
                                                        <SelectItem key={g} value={g}>
                                                            {g}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Role PPNPN or Jabatan PNS */}
                            {editForm.data.jenis_pegawai === 'PPNPN' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit_role_ppnpn">Role PPNPN</Label>
                                    <Input
                                        id="edit_role_ppnpn"
                                        value={editForm.data.role}
                                        onChange={(e) => editForm.setData('role', e.target.value)}
                                        placeholder="Contoh: PPNPN / Tata Usaha / Pramubakti"
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="edit_jabatan">Jabatan Fungsional (Opsional)</Label>
                                    <Input
                                        id="edit_jabatan"
                                        value={editForm.data.jabatan}
                                        onChange={(e) => editForm.setData('jabatan', e.target.value)}
                                        placeholder="Contoh: PMG Ahli Pertama / PMG Penyelia"
                                    />
                                </div>
                            )}

                            {/* Tanggal Pertama Masuk Kerja */}
                            <div className="grid gap-2">
                                <Label htmlFor="edit_tmt" className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    Tanggal Pertama Masuk Kerja (TMT)
                                </Label>
                                <Input
                                    id="edit_tmt"
                                    type="date"
                                    value={editForm.data.tanggal_masuk_kerja}
                                    onChange={(e) => editForm.setData('tanggal_masuk_kerja', e.target.value)}
                                />
                                {editForm.errors.tanggal_masuk_kerja && (
                                    <p className="text-xs text-red-500">{editForm.errors.tanggal_masuk_kerja}</p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingPegawai(null)}
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

            {/* Delete Confirmation Modal */}
            <Dialog open={Boolean(deletingPegawai)} onOpenChange={(open) => !open && setDeletingPegawai(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <form onSubmit={handleDelete}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                Hapus Data Pegawai
                            </DialogTitle>
                            <DialogDescription className="py-2 text-slate-700">
                                Apakah Anda yakin ingin menghapus pegawai <strong>{deletingPegawai?.nama}</strong>? Seluruh histori jadwal terkait pegawai ini juga akan dihapus.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="gap-2 sm:gap-0 mt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeletingPegawai(null)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={deleteForm.processing}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {deleteForm.processing ? 'Menghapus...' : 'Hapus Pegawai'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

PegawaiIndex.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Pegawai', href: '/pegawai' },
        ]}
    >
        {page}
    </AppLayout>
);
