import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
    CheckCircle2, 
    Clock, 
    ExternalLink, 
    FileCheck, 
    FileText, 
    MessageSquare, 
    Search, 
    Trash2, 
    AlertTriangle,
    Plane
} from 'lucide-react';

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface FlightDocumentItem {
    id: number;
    station_code: string;
    inasiam_fd_id: string | null;
    no_fd: string | null;
    flight_number: string | null;
    airline_name: string | null;
    route: string | null;
    departure_at: string | null;
    issued_at: string | null;
    type: string | null;
    status: string | null;
    fd_url: string | null;
    is_wa_dispatched: boolean;
    wa_dispatched_at: string | null;
    wa_sender_name: string | null;
    observer_name: string | null;
    pegawai?: { id: number; nama: string };
}

interface DailyMatrixItem {
    day: number;
    total_fd: number;
    wa_sent: number;
    is_complete: boolean;
}

interface Props {
    records: PaginatedData<FlightDocumentItem>;
    filters: {
        bulan: number;
        tahun: number;
        search?: string;
    };
    stats: {
        total_inasiam: number;
        total_dispatched: number;
        pending_dispatch: number;
        dispatch_rate_pct: number;
    };
    daily_matrix: DailyMatrixItem[];
    inasiam_config: {
        base_url: string;
        upt_id: string;
        apikey: string;
        bearer_token: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/pibal' },
    { title: 'Flight Document', href: '/laporan/flight-document' },
];

const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function FlightDocument({ records, filters, stats, daily_matrix, inasiam_config }: Props) {
    const [selectedBulan, setSelectedBulan] = useState(filters.bulan);
    const [selectedTahun, setSelectedTahun] = useState(filters.tahun);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isPasteOpen, setIsPasteOpen] = useState(false);

    const pasteForm = useForm({
        raw_message: '',
    });

    const handleFilterChange = (newBulan = selectedBulan, newTahun = selectedTahun, newSearch = searchQuery) => {
        router.get('/laporan/flight-document', {
            bulan: newBulan,
            tahun: newTahun,
            search: newSearch,
        }, { preserveState: true, replace: true });
    };

    const handleQuickPasteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        pasteForm.post('/laporan/flight-document/manual', {
            onSuccess: () => {
                setIsPasteOpen(false);
                pasteForm.reset();
            },
        });
    };

    const handleToggleWa = (id: number) => {
        router.post(`/laporan/flight-document/${id}/toggle-wa`, {}, {
            preserveScroll: true,
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data Flight Document ini?')) {
            router.delete(`/laporan/flight-document/${id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <Head title="Flight Document Audit - INA-SIAM & WA Dispatch" />

            <div className="space-y-6 p-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileCheck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                            Flight Document (FD) Dispatch Audit
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Sinkronisasi data dokumen penerbangan dari INA-SIAM dan pemantauan status pengiriman ke grup WhatsApp.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Modal Quick Paste WA */}
                        <Dialog open={isPasteOpen} onOpenChange={setIsPasteOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Quick Paste WA Chat
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <form onSubmit={handleQuickPasteSubmit}>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-indigo-600">
                                            <MessageSquare className="h-5 w-5" />
                                            Quick Paste Riwayat WhatsApp
                                        </DialogTitle>
                                        <DialogDescription>
                                            Tempelkan teks riwayat obrolan dari WA Web/Desktop atau Export Chat (.txt). Parser akan secara otomatis mencocokkan pengiriman FD dengan data INA-SIAM.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4 space-y-3">
                                        <Label htmlFor="raw_message">Teks Pesan / Export Chat WA:</Label>
                                        <Textarea
                                            id="raw_message"
                                            rows={8}
                                            placeholder="Contoh: [17/07/26 04.30] Dinar: FD_WAEL_20260717_0430.pdf atau BMKG-FD-2608-T5AG80..."
                                            value={pasteForm.data.raw_message}
                                            onChange={(e) => pasteForm.setData('raw_message', e.target.value)}
                                            className="font-mono text-xs"
                                            required
                                        />
                                        {pasteForm.errors.raw_message && (
                                            <p className="text-xs text-red-500">{pasteForm.errors.raw_message}</p>
                                        )}
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsPasteOpen(false)}>
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={pasteForm.processing} className="bg-indigo-600 text-white hover:bg-indigo-700">
                                            {pasteForm.processing ? 'Memproses...' : 'Proses & Cocokkan WA'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total FD INA-SIAM</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total_inasiam}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Dokumen resmi terbit</p>
                                </div>
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-600 dark:text-indigo-300">
                                    <FileText className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Terkirim Ke WA</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total_dispatched}</h3>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">{stats.dispatch_rate_pct}% Kelengkapan</p>
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-300">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-100 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Belum Terkirim WA</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.pending_dispatch}</h3>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">Perlu tindakan petugas</p>
                                </div>
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-600 dark:text-amber-300">
                                    <AlertTriangle className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/50 to-white dark:from-sky-950/20 dark:to-slate-900">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Status API INA-SIAM</p>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Sistem Aktif</h3>
                                    <p className="text-xs text-slate-500 mt-1">Stamet Oesman Sadik (WAEL)</p>
                                </div>
                                <div className="p-3 bg-sky-100 dark:bg-sky-900/60 rounded-xl text-sky-600 dark:text-sky-300">
                                    <Plane className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Controls */}
                <Card className="p-4 shadow-sm border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500">Bulan:</Label>
                                <select
                                    value={selectedBulan}
                                    onChange={(e) => {
                                        const b = Number(e.target.value);
                                        setSelectedBulan(b);
                                        handleFilterChange(b, selectedTahun, searchQuery);
                                    }}
                                    className="h-9 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium"
                                >
                                    {namaBulan.map((name, idx) => (
                                        <option key={idx + 1} value={idx + 1}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-slate-500">Tahun:</Label>
                                <select
                                    value={selectedTahun}
                                    onChange={(e) => {
                                        const y = Number(e.target.value);
                                        setSelectedTahun(y);
                                        handleFilterChange(selectedBulan, y, searchQuery);
                                    }}
                                    className="h-9 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium"
                                >
                                    {[2024, 2025, 2026, 2027].map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cari No. FD / Penerbangan / Rute..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    handleFilterChange(selectedBulan, selectedTahun, e.target.value);
                                }}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                </Card>

                {/* Daily Compliance Matrix Grid */}
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-500" />
                            Matriks Kelengkapan Harian - {namaBulan[selectedBulan - 1]} {selectedTahun}
                        </h4>
                        <span className="text-xs text-slate-500">Hijau = Terisi Lengkap | Kuning = Pending WA</span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-2">
                        {daily_matrix.map((item) => (
                            <div
                                key={item.day}
                                title={`Tanggal ${item.day}: ${item.wa_sent} / ${item.total_fd} terkirim WA`}
                                className={`p-2 rounded-lg text-center border transition-all ${
                                    item.total_fd === 0
                                        ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                                        : item.is_complete
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold'
                                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold'
                                }`}
                            >
                                <div className="text-xs font-semibold">{item.day}</div>
                                <div className="text-[10px] mt-0.5 opacity-80">
                                    {item.total_fd > 0 ? `${item.wa_sent}/${item.total_fd}` : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Main Data Table */}
                <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                            <TableRow>
                                <TableHead className="w-[160px]">No. FD (INA-SIAM)</TableHead>
                                <TableHead>Penerbangan & Maskapai</TableHead>
                                <TableHead>Rute</TableHead>
                                <TableHead>Waktu Keberangkatan (UTC)</TableHead>
                                <TableHead>Status INA-SIAM</TableHead>
                                <TableHead>Status WA Dispatch</TableHead>
                                <TableHead>Petugas / Pengirim</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {records.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                                        Tidak ada data Flight Document pada periode ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.data.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                                        <TableCell className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                            {item.no_fd || 'FD-DOC'}
                                        </TableCell>

                                        <TableCell>
                                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.flight_number || 'IW-FLIGHT'}</div>
                                            <div className="text-xs text-slate-500">{item.airline_name || 'Wings Air'}</div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs bg-slate-100 dark:bg-slate-800">
                                                {item.route || 'WAEL -> WAMM'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-xs font-medium">
                                            {item.departure_at ? new Date(item.departure_at).toUTCString().replace('GMT', 'UTC') : '-'}
                                        </TableCell>

                                        <TableCell>
                                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                                {item.status || 'Selesai'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <button
                                                onClick={() => handleToggleWa(item.id)}
                                                className="focus:outline-none"
                                                title="Klik untuk mengubah status pengiriman WA"
                                            >
                                                {item.is_wa_dispatched ? (
                                                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1 cursor-pointer">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Terkirim WA
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 gap-1 cursor-pointer">
                                                        <Clock className="h-3 w-3" />
                                                        Pending WA
                                                    </Badge>
                                                )}
                                            </button>
                                        </TableCell>

                                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                            {item.observer_name || (item.pegawai ? item.pegawai.nama : '-')}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {item.fd_url && (
                                                    <a
                                                        href={item.fd_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                        title="Buka PDF di INA-SIAM"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                    title="Hapus Record"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>

                {/* Pagination */}
                {records.last_page > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-slate-500">
                            Menampilkan {records.data.length} dari {records.total} data Flight Document.
                        </p>
                        <div className="flex items-center gap-1">
                            {records.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

FlightDocument.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Laporan Bulanan', href: '/laporan/flight-document' },
            { title: 'Flight Document', href: '/laporan/flight-document' },
        ]}
    >
        {page}
    </AppLayout>
);

