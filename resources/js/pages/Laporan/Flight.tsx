import React, { useState, useRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, SharedData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plane,
    Calendar,
    Search,
    Upload,
    Download,
    Plus,
    Trash2,
    Edit,
    FileSpreadsheet,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    AlertCircle,
    Building2,
    Sparkles,
    Filter,
} from 'lucide-react';

interface FlightItem {
    id: number;
    tanggal: string;
    maskapai: string;
    flight_number: string;
    reg: string | null;
    dep: string | null;
    arr: string | null;
    sta_utc: string | null;
    std_utc: string | null;
    ata_utc: string | null;
    atd_utc: string | null;
    remarks: string | null;
    pegawai?: { id: number; nama: string };
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface MaskapaiGroupStats {
    maskapai: string;
    total_flights: number;
    departures: number;
    arrivals: number;
    unique_aircraft_count: number;
    unique_aircrafts: string[];
}

interface DailyMatrixItem {
    day: number;
    date: string;
    count: number;
    has_data: boolean;
}

interface Props {
    records: PaginatedData<FlightItem>;
    filters: {
        bulan: number;
        tahun: number;
        maskapai: string;
        type?: string;
        search?: string;
    };
    stats: {
        total_flights: number;
        total_departures: number;
        total_arrivals: number;
        unique_airlines: number;
    };
    grouped_stats: MaskapaiGroupStats[];
    available_maskapai: string[];
    daily_matrix: DailyMatrixItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Laporan Bulanan', href: '/laporan/pibal' },
    { title: 'Data Flight', href: '/laporan/flight' },
];

const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function FlightIndex({
    records,
    filters,
    stats,
    grouped_stats,
    available_maskapai,
    daily_matrix,
}: Props) {
    const { flash } = usePage<SharedData & { flash?: { success?: string; error?: string } }>().props;

    const [selectedMonth, setSelectedMonth] = useState<number>(filters.bulan);
    const [selectedYear, setSelectedYear] = useState<number>(filters.tahun);
    const [selectedMaskapai, setSelectedMaskapai] = useState<string>(filters.maskapai || 'all');
    const [selectedType, setSelectedType] = useState<string>(filters.type || 'all');
    const [searchQuery, setSearchQuery] = useState<string>(filters.search || '');

    // Modal States
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingFlight, setEditingFlight] = useState<FlightItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Import Form with Inertia useForm
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importForm = useForm<{
        file: File | null;
        override_maskapai: string;
    }>({
        file: null,
        override_maskapai: '',
    });

    // Create / Edit Form
    const flightForm = useForm({
        tanggal: new Date().toISOString().split('T')[0],
        maskapai: 'Wings Air',
        flight_number: '',
        reg: '',
        dep: 'LAH',
        arr: 'TTE',
        sta_utc: '',
        std_utc: '',
        ata_utc: '',
        atd_utc: '',
        remarks: '',
    });

    // Apply Filters
    const applyFilters = (
        newMonth = selectedMonth,
        newYear = selectedYear,
        newMaskapai = selectedMaskapai,
        newType = selectedType,
        newSearch = searchQuery
    ) => {
        router.get('/laporan/flight', {
            bulan: newMonth,
            tahun: newYear,
            maskapai: newMaskapai,
            type: newType,
            search: newSearch,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters(selectedMonth, selectedYear, selectedMaskapai, selectedType, searchQuery);
    };

    const handleOpenCreateModal = () => {
        setEditingFlight(null);
        flightForm.reset();
        flightForm.setData({
            tanggal: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
            maskapai: selectedMaskapai !== 'all' ? selectedMaskapai : 'Wings Air',
            flight_number: '',
            reg: '',
            dep: 'LAH',
            arr: 'TTE',
            sta_utc: '',
            std_utc: '',
            ata_utc: '',
            atd_utc: '',
            remarks: '',
        });
        setIsFormOpen(true);
    };

    const handleOpenEditModal = (item: FlightItem) => {
        setEditingFlight(item);
        flightForm.setData({
            tanggal: item.tanggal,
            maskapai: item.maskapai,
            flight_number: item.flight_number,
            reg: item.reg || '',
            dep: item.dep || '',
            arr: item.arr || '',
            sta_utc: item.sta_utc || '',
            std_utc: item.std_utc || '',
            ata_utc: item.ata_utc || '',
            atd_utc: item.atd_utc || '',
            remarks: item.remarks || '',
        });
        setIsFormOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingFlight) {
            flightForm.put(`/laporan/flight/${editingFlight.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    setEditingFlight(null);
                },
            });
        } else {
            flightForm.post('/laporan/flight', {
                preserveScroll: true,
                onSuccess: () => {
                    setIsFormOpen(false);
                    flightForm.reset();
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data penerbangan ini?')) {
            router.delete(`/laporan/flight/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data penerbangan yang dipilih?`)) {
            setIsBulkDeleting(true);
            router.post('/laporan/flight/bulk-delete', { ids: selectedIds }, {
                preserveScroll: true,
                onFinish: () => {
                    setIsBulkDeleting(false);
                    setSelectedIds([]);
                },
            });
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(records.data.map((r) => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleToggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!importForm.data.file) return;

        importForm.post('/laporan/flight/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setIsImportOpen(false);
                importForm.reset();
            },
        });
    };

    const handleExportExcel = () => {
        window.location.href = `/laporan/flight/export?bulan=${selectedMonth}&tahun=${selectedYear}&maskapai=${selectedMaskapai}&type=${selectedType}`;
    };

    const handleDownloadTemplate = () => {
        window.location.href = '/laporan/flight/template';
    };

    return (
        <>
            <Head title={`Data Flight - ${namaBulan[selectedMonth - 1]} ${selectedYear}`} />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* FLASH MESSAGES */}
                {flash?.success && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl shadow-sm text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span className="flex-1">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl shadow-sm text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span className="flex-1">{flash.error}</span>
                    </div>
                )}

                {/* 1. TOP HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-sky-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 transform -translate-x-12 translate-y-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        {/* <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-slate-950 font-bold px-3 py-1 text-xs shadow-md">
                                <Sparkles className="h-3 w-3 mr-1 inline" />
                                Log &amp; Monitoring Pergerakan Pesawat
                            </Badge>
                            <span className="text-xs text-sky-300 font-mono tracking-widest uppercase">
                                Stasiun Meteorologi Kelas III Oesman Sadik (WAEL / LAH)
                            </span>
                        </div> */}

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Plane className="h-7 w-7 text-sky-400" />
                            Data Penerbangan (Flight Data)
                        </h1>

                        {/* <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Rekapitulasi pergerakan pesawat udara, kedatangan, keberangkatan, dan jadwal maskapai di Bandara Oesman Sadik untuk periode {namaBulan[selectedMonth - 1]} {selectedYear}.
                        </p> */}
                    </div>

                    {/* ACTION & FILTER CONTROLS IN HEADER */}
                    <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
                            <Select
                                value={String(selectedMonth)}
                                onValueChange={(val) => {
                                    const newMonth = Number(val);
                                    setSelectedMonth(newMonth);
                                    applyFilters(newMonth, selectedYear, selectedMaskapai, selectedType, searchQuery);
                                }}
                            >
                                <SelectTrigger className="w-[125px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                    {namaBulan.map((bln, idx) => (
                                        <SelectItem key={idx + 1} value={String(idx + 1)}>
                                            {bln}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(selectedYear)}
                                onValueChange={(val) => {
                                    const newYear = Number(val);
                                    setSelectedYear(newYear);
                                    applyFilters(selectedMonth, newYear, selectedMaskapai, selectedType, searchQuery);
                                }}
                            >
                                <SelectTrigger className="w-[90px] h-9 text-xs font-semibold bg-slate-900/90 text-white border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 text-white border-slate-800 text-xs font-semibold">
                                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                                        <SelectItem key={yr} value={String(yr)}>
                                            {yr}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Action Buttons in Hero */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="text-xs bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl"
                            >
                                <Download className="h-3.5 w-3.5 mr-1.5" />
                                Template Excel
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportExcel}
                                className="text-xs bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80 hover:text-emerald-100 rounded-xl"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                                Export Excel
                            </Button>

                            <Button
                                onClick={() => {
                                    importForm.reset();
                                    setIsImportOpen(true);
                                }}
                                size="sm"
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                            >
                                <Upload className="h-3.5 w-3.5 mr-1.5" />
                                Import Excel
                            </Button>

                            <Button
                                onClick={handleOpenCreateModal}
                                size="sm"
                                className="text-xs bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold rounded-xl shadow-md"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Tambah Data
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 2. STATS SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card
                        onClick={() => {
                            if (selectedType !== 'all') {
                                setSelectedType('all');
                                applyFilters(selectedMonth, selectedYear, selectedMaskapai, 'all', searchQuery);
                            }
                        }}
                        className={`cursor-pointer transition-all shadow-sm ${selectedType === 'all'
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                            : 'border-border/60 hover:border-blue-500/40'
                            }`}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Total Penerbangan
                                    </p>
                                    {selectedType === 'all' && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                                            Aktif
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-foreground mt-1">
                                    {stats.total_flights} <span className="text-xs font-normal text-muted-foreground">Flight</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Bulan {namaBulan[selectedMonth - 1]} {selectedYear}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                                <Plane className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            const nextType = selectedType === 'departure' ? 'all' : 'departure';
                            setSelectedType(nextType);
                            applyFilters(selectedMonth, selectedYear, selectedMaskapai, nextType, searchQuery);
                        }}
                        className={`cursor-pointer transition-all shadow-sm ${selectedType === 'departure'
                            ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 shadow-md'
                            : 'border-border/60 hover:border-amber-500/40'
                            }`}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Keberangkatan (Dep LAH)
                                    </p>
                                    {selectedType === 'departure' && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                                            Aktif
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                    {stats.total_departures} <span className="text-xs font-normal text-muted-foreground">Flight</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Take-off dari Oesman Sadik
                                </p>
                            </div>
                            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                                <ArrowUpRight className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card
                        onClick={() => {
                            const nextType = selectedType === 'landing' ? 'all' : 'landing';
                            setSelectedType(nextType);
                            applyFilters(selectedMonth, selectedYear, selectedMaskapai, nextType, searchQuery);
                        }}
                        className={`cursor-pointer transition-all shadow-sm ${selectedType === 'landing'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 shadow-md'
                            : 'border-border/60 hover:border-emerald-500/40'
                            }`}
                    >
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Kedatangan (Arr LAH)
                                    </p>
                                    {selectedType === 'landing' && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                                            Aktif
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                    {stats.total_arrivals} <span className="text-xs font-normal text-muted-foreground">Flight</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Landing di Oesman Sadik
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                                <ArrowDownLeft className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 hover:border-indigo-500/40 transition-all shadow-sm">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Maskapai Aktif
                                </p>
                                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                                    {stats.unique_airlines} <span className="text-xs font-normal text-muted-foreground">Maskapai</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Beroperasi di periode ini
                                </p>
                            </div>
                            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                                <Building2 className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. GROUPED BY MASKAPAI SECTION */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                            Statistik Berdasarkan Maskapai ({namaBulan[selectedMonth - 1]} {selectedYear})
                        </h2>
                        <span className="text-xs text-muted-foreground font-medium">
                            Klik kartu maskapai untuk memfilter data
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {grouped_stats.length === 0 ? (
                            <div className="col-span-full bg-card rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                <Plane className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
                                <p className="text-sm font-medium">Belum ada data penerbangan untuk periode {namaBulan[selectedMonth - 1]} {selectedYear}.</p>
                                <p className="text-xs text-muted-foreground/80 mt-1">Gunakan tombol <strong>Import Excel</strong> untuk mengunggah berkas data flight.</p>
                            </div>
                        ) : (
                            grouped_stats.map((g) => {
                                const isSelected = selectedMaskapai === g.maskapai;
                                return (
                                    <div
                                        key={g.maskapai}
                                        onClick={() => {
                                            const nextMaskapai = isSelected ? 'all' : g.maskapai;
                                            setSelectedMaskapai(nextMaskapai);
                                            applyFilters(selectedMonth, selectedYear, nextMaskapai, selectedType, searchQuery);
                                        }}
                                        className={`cursor-pointer transition-all duration-200 rounded-2xl p-5 border ${isSelected
                                            ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500'
                                            : 'bg-card hover:border-indigo-300 dark:hover:border-indigo-700 border-border/60 shadow-sm text-foreground hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <Badge
                                                    className={
                                                        isSelected
                                                            ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs'
                                                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs'
                                                    }
                                                >
                                                    {g.maskapai}
                                                </Badge>
                                                <div className="text-2xl font-black mt-2">
                                                    {g.total_flights} <span className="text-xs font-normal opacity-80">Penerbangan</span>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/10 text-slate-200' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {g.unique_aircraft_count} Pesawat (Reg)
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-dashed border-border/60 grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <ArrowUpRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                <span className={isSelected ? 'text-slate-300' : 'text-muted-foreground'}>Dep (LAH):</span>
                                                <strong className="font-bold">{g.departures}</strong>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                <span className={isSelected ? 'text-slate-300' : 'text-muted-foreground'}>Arr (LAH):</span>
                                                <strong className="font-bold">{g.arrivals}</strong>
                                            </div>
                                        </div>

                                        {g.unique_aircrafts.length > 0 && (
                                            <div className="mt-2.5 flex flex-wrap gap-1">
                                                {g.unique_aircrafts.slice(0, 5).map((reg) => (
                                                    <span
                                                        key={reg}
                                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-foreground'
                                                            }`}
                                                    >
                                                        {reg}
                                                    </span>
                                                ))}
                                                {g.unique_aircrafts.length > 5 && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/10 text-slate-300' : 'bg-muted/60 text-muted-foreground'
                                                        }`}>
                                                        +{g.unique_aircrafts.length - 5} lainnya
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 4. DAILY MATRIX CALENDAR STRIP */}
                <Card className="border-border/60 shadow-sm bg-card overflow-hidden rounded-2xl">
                    <CardHeader className="p-4 pb-2 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                                <Calendar className="h-4 w-4 text-sky-600" />
                                Distribusi Harian Penerbangan ({namaBulan[selectedMonth - 1]} {selectedYear})
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                                Total penerbangan per tanggal
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-3">
                        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1.5 overflow-x-auto pb-1">
                            {daily_matrix.map((d) => (
                                <div
                                    key={d.day}
                                    title={`Tgl ${d.day}: ${d.count} penerbangan`}
                                    className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${d.count > 0
                                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200 font-semibold'
                                        : 'bg-muted/20 border-border/40 text-muted-foreground'
                                        }`}
                                >
                                    <span className="text-[10px] text-muted-foreground">Tgl</span>
                                    <span className="text-xs font-bold text-foreground">{d.day}</span>
                                    <span className={`text-[10px] mt-0.5 px-1 rounded-md ${d.count > 0 ? 'bg-sky-600 text-white font-bold' : 'text-muted-foreground/60'
                                        }`}>
                                        {d.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 5. FILTER & SEARCH TOOLBAR */}
                <Card className="border-border/60 shadow-sm bg-card rounded-2xl">
                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mr-1">
                                <Filter className="h-3.5 w-3.5" />
                                <span>Filter:</span>
                            </div>

                            {/* Flight Direction / Type Selector (Departure & Landing) */}
                            <Select
                                value={selectedType}
                                onValueChange={(val) => {
                                    setSelectedType(val);
                                    applyFilters(selectedMonth, selectedYear, selectedMaskapai, val, searchQuery);
                                }}
                            >
                                <SelectTrigger className="w-[195px] h-9 text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs font-semibold">
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Plane className="h-3.5 w-3.5 text-blue-500" />
                                            <span>Semua Pergerakan</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="departure">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                                            <span>Keberangkatan (Dep)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="landing">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                                            <span>Pendaratan / Landing (Arr)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Maskapai Selector */}
                            <Select
                                value={selectedMaskapai}
                                onValueChange={(val) => {
                                    setSelectedMaskapai(val);
                                    applyFilters(selectedMonth, selectedYear, val, selectedType, searchQuery);
                                }}
                            >
                                <SelectTrigger className="w-[160px] h-9 text-xs font-semibold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs font-semibold">
                                    <SelectItem value="all">Semua Maskapai</SelectItem>
                                    {available_maskapai.map((m) => (
                                        <SelectItem key={m} value={m}>
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Reset Filter Button */}
                            {(selectedType !== 'all' || selectedMaskapai !== 'all' || searchQuery) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedType('all');
                                        setSelectedMaskapai('all');
                                        setSearchQuery('');
                                        applyFilters(selectedMonth, selectedYear, 'all', 'all', '');
                                    }}
                                    className="text-xs h-9 text-muted-foreground hover:text-foreground rounded-xl"
                                >
                                    Reset Filter
                                </Button>
                            )}
                        </div>

                        {/* Search & Bulk Delete */}
                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={isBulkDeleting}
                                    className="text-xs rounded-xl"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Hapus ({selectedIds.length})
                                </Button>
                            )}

                            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                                <Input
                                    placeholder="Cari No. Flight, Reg, Rute..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="text-xs pr-8 w-60 md:w-72 bg-background border-input rounded-xl"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <Search className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </CardContent>
                </Card>

                {/* 6. DATA TABLE */}
                <Card className="border-border/60 shadow-sm bg-card overflow-hidden rounded-2xl">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/60">
                                <TableRow className="text-xs">
                                    <TableHead className="w-10 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={records.data.length > 0 && selectedIds.length === records.data.length}
                                            className="rounded border-border text-primary focus:ring-primary"
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold">Tanggal (UTC)</TableHead>
                                    <TableHead className="font-bold">Maskapai</TableHead>
                                    <TableHead className="font-bold">Flight No</TableHead>
                                    <TableHead className="font-bold">Reg (Pesawat)</TableHead>
                                    <TableHead className="font-bold">Rute (Dep &rarr; Arr)</TableHead>
                                    <TableHead className="font-bold text-center">STA (UTC)</TableHead>
                                    <TableHead className="font-bold text-center">STD (UTC)</TableHead>
                                    <TableHead className="font-bold text-center text-emerald-600 dark:text-emerald-400">ATA (UTC)</TableHead>
                                    <TableHead className="font-bold text-center text-amber-600 dark:text-amber-400">ATD (UTC)</TableHead>
                                    <TableHead className="font-bold">Keterangan</TableHead>
                                    <TableHead className="font-bold text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground text-xs">
                                            <Plane className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                            Tidak ada data penerbangan yang cocok dengan filter yang dipilih.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.data.map((row) => {
                                        const isDepLah = strtoupper(row.dep || '') === 'LAH';
                                        const isArrLah = strtoupper(row.arr || '') === 'LAH';

                                        return (
                                            <TableRow key={row.id} className="hover:bg-muted/40 text-xs transition-colors">
                                                <TableCell className="text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(row.id)}
                                                        onChange={() => handleToggleSelect(row.id)}
                                                        className="rounded border-border text-primary focus:ring-primary"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium text-foreground whitespace-nowrap">
                                                    {formatDateDisplay(row.tanggal)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold">
                                                        {row.maskapai}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold text-foreground font-mono">
                                                    {row.flight_number}
                                                </TableCell>
                                                <TableCell className="font-mono text-muted-foreground font-semibold">
                                                    {row.reg || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded-md text-[11px] ${isDepLah
                                                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                                            : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                            {row.dep || '?'}
                                                        </span>
                                                        <span className="text-muted-foreground/60">&rarr;</span>
                                                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded-md text-[11px] ${isArrLah
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                                            : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                            {row.arr || '?'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-muted-foreground">
                                                    {row.sta_utc || '-'}
                                                </TableCell>
                                                <TableCell className="text-center font-mono text-muted-foreground">
                                                    {row.std_utc || '-'}
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {row.ata_utc || '-'}
                                                </TableCell>
                                                <TableCell className="text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                                                    {row.atd_utc || '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground max-w-xs truncate">
                                                    {row.remarks || '-'}
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenEditModal(row)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-sky-600 rounded-lg"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(row.id)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-rose-600 rounded-lg"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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

                    {/* Pagination */}
                    {records.last_page > 1 && (
                        <div className="p-4 border-t border-border/60 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                Menampilkan {records.data.length} dari total {records.total} data
                            </span>
                            <div className="flex items-center gap-1">
                                {records.links.map((link, idx) => (
                                    <Button
                                        key={idx}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        className="text-xs h-8 px-3 rounded-lg"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* 7. IMPORT EXCEL MODAL */}
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                    <DialogContent className="sm:max-w-md bg-card rounded-2xl border border-border">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-foreground">
                                <Upload className="h-5 w-5 text-indigo-600" />
                                Import File Data Flight Excel
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Unggah berkas Excel (.xlsx / .xls) sesuai template data flight (e.g. data-flight-wings.xlsx).
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleImportSubmit} className="space-y-4 pt-2">
                            {importForm.errors.file && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{importForm.errors.file}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-foreground">
                                    Override Nama Maskapai (Opsional)
                                </Label>
                                <Input
                                    placeholder="Biarkan kosong untuk auto-detect (e.g. IW &rarr; Wings Air)"
                                    value={importForm.data.override_maskapai}
                                    onChange={(e) => importForm.setData('override_maskapai', e.target.value)}
                                    className="text-xs bg-muted/30 rounded-xl"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    Jika diisi, semua data dalam berkas akan ditetapkan ke maskapai ini.
                                </span>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-foreground">
                                    Pilih Berkas Excel (.xlsx / .xls / .csv)
                                </Label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            importForm.setData('file', e.dataTransfer.files[0]);
                                        }
                                    }}
                                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${isDragging
                                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-300'
                                        : importForm.data.file
                                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                                            : 'border-border hover:border-indigo-500 bg-muted/20 hover:bg-indigo-50/30'
                                        }`}
                                >
                                    <FileSpreadsheet className={`h-10 w-10 mx-auto mb-2 ${importForm.data.file ? 'text-emerald-600' : 'text-indigo-500'
                                        }`} />

                                    {importForm.data.file ? (
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-foreground">{importForm.data.file.name}</p>
                                            <p className="text-[11px] text-emerald-600 font-semibold">
                                                {(importForm.data.file.size / 1024).toFixed(1)} KB &bull; Berkas siap diunggah
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">Klik untuk mengganti file</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-foreground">
                                                Klik untuk memilih file atau seret file ke sini
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                Mendukung format .xlsx, .xls, dan .csv (maks 20 MB)
                                            </p>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                importForm.setData('file', e.target.files[0]);
                                            }
                                        }}
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-2 gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsImportOpen(false)}
                                    className="text-xs rounded-xl"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!importForm.data.file || importForm.processing}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                                >
                                    {importForm.processing ? 'Mengunggah & Memproses...' : 'Proses Import Excel'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 8. CREATE / EDIT MODAL */}
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="sm:max-w-lg bg-card rounded-2xl border border-border">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-foreground">
                                <Plane className="h-5 w-5 text-sky-600" />
                                {editingFlight ? 'Edit Data Penerbangan' : 'Tambah Data Penerbangan Manual'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Lengkapi detail data operasional penerbangan pesawat.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleFormSubmit} className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Tanggal (UTC)</Label>
                                    <Input
                                        type="date"
                                        value={flightForm.data.tanggal}
                                        onChange={(e) => flightForm.setData('tanggal', e.target.value)}
                                        className="text-xs bg-muted/30 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Maskapai</Label>
                                    <Input
                                        placeholder="e.g. Wings Air"
                                        value={flightForm.data.maskapai}
                                        onChange={(e) => flightForm.setData('maskapai', e.target.value)}
                                        className="text-xs bg-muted/30 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">No. Penerbangan (Flight No)</Label>
                                    <Input
                                        placeholder="e.g. IW 2275"
                                        value={flightForm.data.flight_number}
                                        onChange={(e) => flightForm.setData('flight_number', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Registrasi Pesawat (PK-...)</Label>
                                    <Input
                                        placeholder="e.g. PK-WJG"
                                        value={flightForm.data.reg}
                                        onChange={(e) => flightForm.setData('reg', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Bandara Asal (DEP)</Label>
                                    <Input
                                        placeholder="e.g. LAH"
                                        value={flightForm.data.dep}
                                        onChange={(e) => flightForm.setData('dep', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono uppercase rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold text-foreground">Bandara Tujuan (ARR)</Label>
                                    <Input
                                        placeholder="e.g. TTE"
                                        value={flightForm.data.arr}
                                        onChange={(e) => flightForm.setData('arr', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono uppercase rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-1">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-medium text-muted-foreground">STA (UTC)</Label>
                                    <Input
                                        placeholder="21:40"
                                        value={flightForm.data.sta_utc}
                                        onChange={(e) => flightForm.setData('sta_utc', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono text-center rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-medium text-muted-foreground">STD (UTC)</Label>
                                    <Input
                                        placeholder="22:30"
                                        value={flightForm.data.std_utc}
                                        onChange={(e) => flightForm.setData('std_utc', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono text-center rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-medium text-muted-foreground">ATA (UTC)</Label>
                                    <Input
                                        placeholder="21:45"
                                        value={flightForm.data.ata_utc}
                                        onChange={(e) => flightForm.setData('ata_utc', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono text-center rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-medium text-muted-foreground">ATD (UTC)</Label>
                                    <Input
                                        placeholder="22:35"
                                        value={flightForm.data.atd_utc}
                                        onChange={(e) => flightForm.setData('atd_utc', e.target.value)}
                                        className="text-xs bg-muted/30 font-mono text-center rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 pt-1">
                                <Label className="text-xs font-semibold text-foreground">Keterangan (Remarks)</Label>
                                <Textarea
                                    placeholder="Catatan tambahan (opsional)..."
                                    value={flightForm.data.remarks}
                                    onChange={(e) => flightForm.setData('remarks', e.target.value)}
                                    className="text-xs bg-muted/30 rounded-xl"
                                    rows={2}
                                />
                            </div>

                            <DialogFooter className="pt-2 gap-2 sm:gap-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsFormOpen(false)}
                                    className="text-xs rounded-xl"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={flightForm.processing}
                                    className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl"
                                >
                                    {flightForm.processing ? 'Menyimpan...' : (editingFlight ? 'Perbarui' : 'Simpan Data')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

FlightIndex.layout = (page: React.ReactNode) => (
    <AppLayout breadcrumbs={breadcrumbs}>
        {page}
    </AppLayout>
);

// Helpers
function strtoupper(val: string): string {
    return val ? val.toUpperCase() : '';
}

function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const day = parts[2];
            const monthIdx = parseInt(parts[1], 10) - 1;
            const year = parts[0];
            const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            return `${parseInt(day, 10)} ${monthsShort[monthIdx] || parts[1]} ${year}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}
