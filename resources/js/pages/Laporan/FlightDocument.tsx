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
    Eye,
    FileCheck, 
    FileCode,
    FileText, 
    MessageSquare, 
    Search, 
    Trash2, 
    Plane,
    Users,
    Calendar
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
    teknisi?: { id: number; nama: string };
    ppnpn?: { id: number; nama: string };
}

interface DailyMatrixItem {
    day: number;
    total_fd: number;
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
        total_fd: number;
        unique_flights: number;
    };
    daily_matrix: DailyMatrixItem[];
    inasiam_config: {
        base_url: string;
        upt_id: string;
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

const bulanIndoShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatFlightDocTime = (timestampStr: string | null) => {
    if (!timestampStr) {
        return {
            wit: '-',
            utc: '-',
            timeWit: '-',
            timeUtc: '-',
            dateWit: '-',
            fullWit: '-',
            fullUtc: '-',
        };
    }

    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) {
        return {
            wit: timestampStr,
            utc: '-',
            timeWit: '-',
            timeUtc: '-',
            dateWit: '-',
            fullWit: timestampStr,
            fullUtc: '-',
        };
    }

    // WIT is UTC + 9 hours
    const witMs = d.getTime() + (9 * 60 * 60 * 1000);
    const witDate = new Date(witMs);

    const pad = (n: number) => String(n).padStart(2, '0');

    const yearWit = witDate.getUTCFullYear();
    const monthWitIdx = witDate.getUTCMonth();
    const dayWit = pad(witDate.getUTCDate());
    const hoursWit = pad(witDate.getUTCHours());
    const minsWit = pad(witDate.getUTCMinutes());

    const yearUtc = d.getUTCFullYear();
    const monthUtcIdx = d.getUTCMonth();
    const dayUtc = pad(d.getUTCDate());
    const hoursUtc = pad(d.getUTCHours());
    const minsUtc = pad(d.getUTCMinutes());

    return {
        wit: `${dayWit} ${bulanIndoShort[monthWitIdx]} ${yearWit}, ${hoursWit}:${minsWit} WIT`,
        utc: `${dayUtc} ${bulanIndoShort[monthUtcIdx]} ${yearUtc}, ${hoursUtc}:${minsUtc} UTC`,
        timeWit: `${hoursWit}:${minsWit} WIT`,
        timeUtc: `${hoursUtc}:${minsUtc} UTC`,
        dateWit: `${dayWit} ${bulanIndoShort[monthWitIdx]} ${yearWit}`,
        fullWit: `${dayWit} ${namaBulan[monthWitIdx]} ${yearWit} pukul ${hoursWit}:${minsWit} WIT`,
        fullUtc: `${dayUtc} ${namaBulan[monthUtcIdx]} ${yearUtc} pukul ${hoursUtc}:${minsUtc} UTC`,
    };
};

export default function FlightDocument({ records, filters, stats, daily_matrix, inasiam_config }: Props) {
    const [selectedBulan, setSelectedBulan] = useState(filters.bulan);
    const [selectedTahun, setSelectedTahun] = useState(filters.tahun);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isPasteOpen, setIsPasteOpen] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
    const [selectedFd, setSelectedFd] = useState<FlightDocumentItem | null>(null);

    const pasteForm = useForm({
        raw_message: '',
    });

    const jsonForm = useForm({
        raw_json: '',
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

    const handleJsonSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        jsonForm.post('/laporan/flight-document/sync-inasiam', {
            onSuccess: () => {
                setIsJsonModalOpen(false);
                jsonForm.reset();
            },
        });
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus log Flight Document ini?')) {
            router.delete(`/laporan/flight-document/${id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <Head title="Log Flight Document (Dokumen Penerbangan)" />

            <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-hidden">
                {/* Header Title & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <FileCheck className="h-7 w-7 text-indigo-600" />
                            Log Flight Document (Dokumen Penerbangan)
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Pencatatan riwayat dokumen penerbangan (Flight Document) yang telah diterbitkan dan dikirimkan ke maskapai.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Modal Paste Raw JSON INA-SIAM */}
                        <Dialog open={isJsonModalOpen} onOpenChange={setIsJsonModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold">
                                    <FileCode className="h-4 w-4 mr-2 text-amber-700" />
                                    Paste Raw JSON INA-SIAM
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-2xl">
                                <form onSubmit={handleJsonSubmit}>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-amber-700 font-bold">
                                            <FileCode className="h-5 w-5 text-amber-600" />
                                            Impor Data Raw JSON INA-SIAM
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500">
                                            Tempelkan teks respons JSON dari API / Console / Network Tab INA-SIAM. Sistem akan otomatis memfilter item berstatus <strong>completed</strong> dan menghubungkan Observer, Teknisi, & PPNPN Piket secara otomatis.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4 space-y-3">
                                        <Label htmlFor="raw_json" className="text-xs font-semibold text-slate-700">Teks Respons JSON INA-SIAM:</Label>
                                        <Textarea
                                            id="raw_json"
                                            rows={10}
                                            placeholder='[&#10;  {&#10;    "id": "BMKG-FD-2604-7CZRXC",&#10;    "callsign": "IW 2275",&#10;    "departure_at": "2026-04-01T04:00:00+00:00",&#10;    "status": "completed",&#10;    "authorized_info": { "forecaster_name": "IRSYAD" }&#10;  }&#10;]'
                                            value={jsonForm.data.raw_json}
                                            onChange={(e) => jsonForm.setData('raw_json', e.target.value)}
                                            className="font-mono text-xs bg-slate-900 text-amber-300 border-slate-700 rounded-xl"
                                            required
                                        />
                                        {jsonForm.errors.raw_json && (
                                            <p className="text-xs text-red-500">{jsonForm.errors.raw_json}</p>
                                        )}
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="ghost" onClick={() => setIsJsonModalOpen(false)}>
                                            Batal
                                        </Button>
                                        <Button type="submit" disabled={jsonForm.processing} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                                            {jsonForm.processing ? 'Memproses Impor...' : 'Proses & Impor JSON'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* Modal Quick Paste WA / Manual */}
                        <Dialog open={isPasteOpen} onOpenChange={setIsPasteOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Quick Paste Teks / WA
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <form onSubmit={handleQuickPasteSubmit}>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-indigo-600 font-bold">
                                            <MessageSquare className="h-5 w-5" />
                                            Quick Paste Log Dokumen
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500">
                                            Tempelkan teks riwayat obrolan atau daftar penerbangan (.txt). Parser akan secara otomatis mencocokkan pengiriman FD dengan data penerbangan.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="py-4 space-y-3">
                                        <Label htmlFor="raw_message" className="text-xs font-semibold text-slate-700">Teks Log / Chat FD:</Label>
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
                                        <Button type="submit" disabled={pasteForm.processing} className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold">
                                            {pasteForm.processing ? 'Memproses...' : 'Proses & Simpan Log'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* KPI Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Total Flight Document</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total_fd}</h3>
                                    <p className="text-xs text-slate-500 mt-1">Dokumen penerbangan terbit</p>
                                </div>
                                <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                                    <FileText className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Nomor Penerbangan</p>
                                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.unique_flights}</h3>
                                    <p className="text-xs text-emerald-600 font-medium mt-1">Varian rute terlayani</p>
                                </div>
                                <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                    <Plane className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 to-white">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Integrasi Jadwal Dinas</p>
                                    <h3 className="text-lg font-bold text-slate-900 mt-1">Otomatis Terhubung</h3>
                                    <p className="text-xs text-slate-500 mt-1">Stamet Oesman Sadik (WAEL)</p>
                                </div>
                                <div className="p-3 bg-sky-100 rounded-xl text-sky-600">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter Controls */}
                <Card className="p-4 shadow-sm border-slate-200">
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
                                    className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-sm font-medium"
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
                                    className="h-9 px-3 py-1 bg-white border border-slate-300 rounded-md text-sm font-medium"
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
                <Card className="p-4 border-slate-200">
                    <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-indigo-500" />
                            Rekap Penerbitan Harian - {namaBulan[selectedBulan - 1]} {selectedTahun}
                        </h4>
                        <span className="text-xs text-slate-500">Angka = Jumlah FD Terbit Hari Tersebut</span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1.5">
                        {daily_matrix.map((item) => (
                            <div
                                key={item.day}
                                title={`Tanggal ${item.day}: ${item.total_fd} Flight Document`}
                                className={`p-2 rounded-lg text-center border transition-all ${
                                    item.total_fd === 0
                                        ? 'bg-slate-50 border-slate-200 text-slate-400'
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                }`}
                            >
                                <div className="text-xs font-semibold">{item.day}</div>
                                <div className="text-[10px] mt-0.5 opacity-80">
                                    {item.total_fd > 0 ? `${item.total_fd} FD` : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Main Data Table */}
                <Card className="border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table className="w-full min-w-[700px]">
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[180px]">No. FD</TableHead>
                                    <TableHead>Penerbangan & Maskapai</TableHead>
                                    <TableHead>Rute</TableHead>
                                    <TableHead className="w-[190px]">Waktu Kirim (WIT)</TableHead>
                                    <TableHead>Status Dokumen</TableHead>
                                    <TableHead>Petugas Piket (Jadwal Dinas)</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {records.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                                            Tidak ada data Flight Document pada periode ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.data.map((item) => {
                                        const dt = formatFlightDocTime(item.wa_dispatched_at || item.departure_at);

                                        return (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                                                {item.no_fd || item.inasiam_fd_id || 'FD-DOC'}
                                            </TableCell>

                                            <TableCell>
                                                <div className="font-semibold text-slate-800">{item.flight_number || 'IW-FLIGHT'}</div>
                                                <div className="text-xs text-slate-500">{item.airline_name || 'Wings Air'}</div>
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs bg-slate-100">
                                                    {item.route || 'WAEL -> WAMM'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold text-slate-900">{dt.wit}</span>
                                                    <span className="text-[11px] font-mono text-slate-500">{dt.utc}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                                                    {item.status || 'Selesai'}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-xs">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Observer</span>
                                                        <span className="font-semibold text-slate-900">{item.pegawai?.nama || item.observer_name || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">Teknisi</span>
                                                        <span>{item.teknisi?.nama || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">PPNPN</span>
                                                        <span>{item.ppnpn?.nama || '-'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setSelectedFd(item)}
                                                        className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    {item.fd_url && (
                                                        <a
                                                            href={item.fd_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-slate-500 hover:text-indigo-600"
                                                            title="Buka Dokumen PDF"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                                        title="Hapus Log"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
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

            {/* Modal Detail Flight Document */}
            {selectedFd && (
                <Dialog open={!!selectedFd} onOpenChange={() => setSelectedFd(null)}>
                    <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-indigo-600 font-bold">
                                <FileText className="h-5 w-5" />
                                Detail Log Flight Document
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Rincian informasi dokumen penerbangan dan penugasan piket.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-3 space-y-3 text-xs">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
                                <div className="text-slate-500">No. Flight Document:</div>
                                <div className="font-mono font-bold text-slate-800 text-sm">{selectedFd.no_fd || selectedFd.inasiam_fd_id || '-'}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div className="text-slate-500">Penerbangan:</div>
                                    <div className="font-bold text-slate-800">{selectedFd.flight_number || '-'}</div>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div className="text-slate-500">Maskapai:</div>
                                    <div className="font-bold text-slate-800">{selectedFd.airline_name || '-'}</div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div className="text-slate-500 font-semibold mb-1">Waktu Kirim:</div>
                                <div className="space-y-1">
                                    <div className="font-bold text-indigo-700 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                                        <span>{formatFlightDocTime(selectedFd.wa_dispatched_at || selectedFd.departure_at).fullWit}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">
                                        {formatFlightDocTime(selectedFd.wa_dispatched_at || selectedFd.departure_at).fullUtc}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3">
                                <p className="font-bold text-slate-700 mb-2">Petugas Piket Operasional:</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                                        <span className="text-slate-600">Observer (Prakirawan):</span>
                                        <span className="font-bold text-indigo-700">{selectedFd.observer_name || selectedFd.pegawai?.nama || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-slate-600">Teknisi Piket:</span>
                                        <span className="font-bold text-slate-700">{selectedFd.teknisi?.nama || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-slate-600">PPNPN Piket:</span>
                                        <span className="font-bold text-slate-700">{selectedFd.ppnpn?.nama || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedFd(null)}>
                                Tutup
                            </Button>
                            {selectedFd.fd_url && (
                                <a href={selectedFd.fd_url} target="_blank" rel="noopener noreferrer">
                                    <Button className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Buka Dokumen PDF
                                    </Button>
                                </a>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
