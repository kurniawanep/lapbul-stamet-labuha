import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ShieldCheck,
    ShieldAlert,
    Shield,
    Users,
    Search,
    RotateCcw,
    CheckCircle2,
    Sliders,
    Sparkles,
    UserCheck,
    Lock,
    KeyRound,
} from 'lucide-react';
import type { BreadcrumbItem } from '@/types';

interface PegawaiItem {
    id: number;
    nama: string;
    email: string | null;
    nip: string | null;
    jenis_pegawai: 'PNS' | 'PPNPN';
    role: string | null;
    is_superadmin: boolean;
    permissions: string[] | null;
    effective_permissions: string[];
}

interface Props {
    pegawais: PegawaiItem[];
    filters: {
        search?: string;
        jenis?: string;
        role?: string;
    };
    allPermissions: Record<string, Record<string, string>>;
    allPermissionKeys: string[];
    roleDefaults: Record<string, string[]>;
    rolesPns: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Manajemen Hak Akses', href: '/admin/hak-akses' },
];

export default function HakAksesIndex({
    pegawais,
    filters,
    allPermissions,
    allPermissionKeys,
    roleDefaults,
    rolesPns,
}: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [jenisFilter, setJenisFilter] = useState(filters.jenis || 'ALL');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'ALL');

    const [selectedPegawai, setSelectedPegawai] = useState<PegawaiItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form for updating access rights
    const form = useForm({
        is_superadmin: false,
        is_custom: false,
        permissions: [] as string[],
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/hak-akses',
            {
                search: searchQuery || undefined,
                jenis: jenisFilter !== 'ALL' ? jenisFilter : undefined,
                role: roleFilter !== 'ALL' ? roleFilter : undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilter = () => {
        setSearchQuery('');
        setJenisFilter('ALL');
        setRoleFilter('ALL');
        router.get('/admin/hak-akses', {}, { preserveState: true, replace: true });
    };

    const openEditModal = (pegawai: PegawaiItem) => {
        setSelectedPegawai(pegawai);
        const hasCustom = pegawai.permissions !== null;
        form.setData({
            is_superadmin: Boolean(pegawai.is_superadmin),
            is_custom: hasCustom,
            permissions: hasCustom
                ? pegawai.permissions || []
                : roleDefaults[pegawai.role || ''] || roleDefaults['PPNPN'] || [],
        });
        setIsEditModalOpen(true);
    };

    const handleTogglePermission = (key: string) => {
        const current = [...form.data.permissions];
        if (current.includes(key)) {
            form.setData(
                'permissions',
                current.filter((k) => k !== key)
            );
        } else {
            form.setData('permissions', [...current, key]);
        }
    };

    const handleSelectAll = () => {
        form.setData('permissions', [...allPermissionKeys]);
    };

    const handleClearAll = () => {
        form.setData('permissions', []);
    };

    const handleApplyRoleDefaults = () => {
        if (!selectedPegawai) return;
        const defaults =
            roleDefaults[selectedPegawai.role || ''] || roleDefaults['PPNPN'] || [];
        form.setData('permissions', [...defaults]);
    };

    const submitUpdateAccess = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPegawai) return;

        form.put(`/admin/hak-akses/${selectedPegawai.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedPegawai(null);
            },
        });
    };

    const handleQuickReset = (pegawai: PegawaiItem) => {
        if (
            confirm(
                `Kembalikan hak akses untuk "${pegawai.nama}" ke default role (${pegawai.role || 'Tanpa Role'})?`
            )
        ) {
            router.post(`/admin/hak-akses/${pegawai.id}/reset`, {}, { preserveScroll: true });
        }
    };

    // Statistics
    const stats = useMemo(() => {
        const total = pegawais.length;
        const superAdmins = pegawais.filter((p) => p.is_superadmin).length;
        const customUsers = pegawais.filter(
            (p) => !p.is_superadmin && p.permissions !== null
        ).length;
        const defaultUsers = total - superAdmins - customUsers;

        return { total, superAdmins, customUsers, defaultUsers };
    }, [pegawais]);

    return (
        <>
            <Head title="Manajemen Hak Akses" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header Title */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <ShieldCheck className="h-7 w-7 text-primary" />
                            Manajemen Hak Akses & Role
                        </h1>
                        {/* <p className="text-sm text-muted-foreground mt-1">
                            Kelola status Super Admin dan kustomisasi izin modul per individu pegawai secara granular.
                        </p> */}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-xs border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Pegawai
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Terdaftar di sistem
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs bg-amber-500/5 border-amber-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                Super Admin
                            </CardTitle>
                            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                                {stats.superAdmins}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Akses tanpa batas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs bg-blue-500/5 border-blue-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">
                                Izin Kustom (Custom)
                            </CardTitle>
                            <Sliders className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                {stats.customUsers}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Disesuaikan per individu
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs bg-slate-500/5 border-slate-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Default Role
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.defaultUsers}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Mengikuti standar role
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Table Card */}
                <Card className="shadow-sm">
                    <CardHeader className="p-4 md:p-6 pb-2">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-center justify-between">
                            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari nama, email, NIP, atau role..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={jenisFilter} onValueChange={(val) => setJenisFilter(val)}>
                                    <SelectTrigger className="w-full sm:w-[150px]">
                                        <SelectValue placeholder="Jenis Pegawai" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Jenis</SelectItem>
                                        <SelectItem value="PNS">PNS</SelectItem>
                                        <SelectItem value="PPNPN">PPNPN</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val)}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <SelectValue placeholder="Role Pegawai" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Role</SelectItem>
                                        {rolesPns.map((r) => (
                                            <SelectItem key={r} value={r}>
                                                {r}
                                            </SelectItem>
                                        ))}
                                        <SelectItem value="PPNPN">PPNPN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                                <Button type="submit" size="default" className="flex-1 md:flex-initial">
                                    <Search className="h-4 w-4 mr-1" />
                                    Filter
                                </Button>
                                {(searchQuery || jenisFilter !== 'ALL' || roleFilter !== 'ALL') && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="default"
                                        onClick={handleResetFilter}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardHeader>

                    <CardContent className="p-0 md:p-6 md:pt-4">
                        <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px] text-center">No</TableHead>
                                        <TableHead>Pegawai</TableHead>
                                        <TableHead>Jenis / NIP</TableHead>
                                        <TableHead>Role Utama</TableHead>
                                        <TableHead>Status Akses</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pegawais.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Tidak ada data pegawai yang cocok dengan kriteria pencarian.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pegawais.map((pegawai, index) => {
                                            const isSuper = pegawai.is_superadmin;
                                            const isCustom = !isSuper && pegawai.permissions !== null;

                                            return (
                                                <TableRow key={pegawai.id} className="hover:bg-muted/30">
                                                    <TableCell className="text-center font-medium text-muted-foreground">
                                                        {index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                            {pegawai.nama}
                                                            {isSuper && (
                                                                <span title="Super Admin">
                                                                    <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {pegawai.email || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={pegawai.jenis_pegawai === 'PNS' ? 'default' : 'secondary'} className="text-[11px]">
                                                            {pegawai.jenis_pegawai}
                                                        </Badge>
                                                        {pegawai.nip && (
                                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                                {pegawai.nip}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium text-sm">
                                                            {pegawai.role || '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isSuper ? (
                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                                                                <Shield className="h-3 w-3 mr-1" />
                                                                Super Admin
                                                            </Badge>
                                                        ) : isCustom ? (
                                                            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
                                                                <Sliders className="h-3 w-3 mr-1" />
                                                                Custom ({pegawai.effective_permissions?.length || 0} Izin)
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-muted-foreground">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Default Role
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openEditModal(pegawai)}
                                                                className="h-8 gap-1"
                                                            >
                                                                <KeyRound className="h-3.5 w-3.5" />
                                                                Kelola Akses
                                                            </Button>
                                                            {isCustom && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleQuickReset(pegawai)}
                                                                    title="Kembalikan ke Default Role"
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Dialog Modal: Kelola Hak Akses */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Atur Hak Akses Pegawai
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Pegawai: <strong className="text-foreground">{selectedPegawai?.nama}</strong> | Role:{' '}
                            <Badge variant="outline" className="ml-1 text-xs">
                                {selectedPegawai?.role || 'Tanpa Role'}
                            </Badge>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitUpdateAccess} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Option 1: Super Admin Toggle */}
                            <div className="rounded-lg border p-4 bg-amber-500/5 border-amber-500/20">
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="modal_is_superadmin"
                                        checked={form.data.is_superadmin}
                                        onCheckedChange={(checked) =>
                                            form.setData('is_superadmin', Boolean(checked))
                                        }
                                        className="mt-1"
                                    />
                                    <div className="grid gap-1 leading-none">
                                        <Label
                                            htmlFor="modal_is_superadmin"
                                            className="font-semibold text-sm cursor-pointer text-amber-900 dark:text-amber-300 flex items-center gap-1.5"
                                        >
                                            <ShieldAlert className="h-4 w-4 text-amber-600" />
                                            Jadikan Super Admin (Hak Penuh Tanpa Batas)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Super Admin dapat mengakses seluruh fitur sistem, termasuk mengubah hak akses dan izin pegawai lain.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Mode Hak Akses (Default Role vs Custom) */}
                            {!form.data.is_superadmin && (
                                <div className="space-y-4">
                                    <div className="rounded-lg border p-4 bg-muted/20">
                                        <Label className="text-sm font-semibold mb-2 block">
                                            Mode Izin Akses
                                        </Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => form.setData('is_custom', false)}
                                                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-all ${!form.data.is_custom
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-border bg-card hover:bg-muted/40'
                                                    }`}
                                            >
                                                <CheckCircle2
                                                    className={`h-4 w-4 mt-0.5 ${!form.data.is_custom
                                                            ? 'text-primary'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                />
                                                <div>
                                                    <div className="font-medium text-sm">Gunakan Default Role</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        Otomatis mengikuti hak akses bawaan role ({selectedPegawai?.role || 'Umum'}).
                                                    </div>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => form.setData('is_custom', true)}
                                                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-all ${form.data.is_custom
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-border bg-card hover:bg-muted/40'
                                                    }`}
                                            >
                                                <Sliders
                                                    className={`h-4 w-4 mt-0.5 ${form.data.is_custom
                                                            ? 'text-primary'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                />
                                                <div>
                                                    <div className="font-medium text-sm">Kustomisasi Izin (Custom)</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        Pilih izin per modul secara bebas khusus pegawai ini.
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Permissions Checklist Group */}
                                    {form.data.is_custom && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b pb-2">
                                                <h3 className="font-semibold text-sm">
                                                    Daftar Checklist Izin Fitur
                                                </h3>
                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleSelectAll}
                                                        className="h-7 text-xs"
                                                    >
                                                        Pilih Semua
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleApplyRoleDefaults}
                                                        className="h-7 text-xs text-blue-600"
                                                    >
                                                        Preset Role
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={handleClearAll}
                                                        className="h-7 text-xs text-red-600"
                                                    >
                                                        Kosongkan
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {Object.entries(allPermissions).map(
                                                    ([categoryName, permissions]) => (
                                                        <div
                                                            key={categoryName}
                                                            className="rounded-md border p-3 bg-card"
                                                        >
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                                                                {categoryName}
                                                            </h4>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                                {Object.entries(permissions).map(
                                                                    ([key, label]) => {
                                                                        const isChecked =
                                                                            form.data.permissions.includes(
                                                                                key
                                                                            );
                                                                        return (
                                                                            <div
                                                                                key={key}
                                                                                className="flex items-center space-x-2"
                                                                            >
                                                                                <Checkbox
                                                                                    id={`perm_${key}`}
                                                                                    checked={isChecked}
                                                                                    onCheckedChange={() =>
                                                                                        handleTogglePermission(
                                                                                            key
                                                                                        )
                                                                                    }
                                                                                />
                                                                                <Label
                                                                                    htmlFor={`perm_${key}`}
                                                                                    className="text-xs font-normal cursor-pointer leading-tight"
                                                                                >
                                                                                    {label}
                                                                                </Label>
                                                                            </div>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 border-t bg-muted/20">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Simpan Hak Akses
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

HakAksesIndex.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>
        {page}
    </AppLayout>
);
