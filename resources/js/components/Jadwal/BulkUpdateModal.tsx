import React from 'react';
import { useForm } from '@inertiajs/react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CheckSquare, Square } from 'lucide-react';

export interface Pegawai {
    id: number;
    nip: string | null;
    nama: string;
    jabatan: string | null;
}

export interface MasterShift {
    id: number;
    kode_shift: string;
    nama_shift: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jadwalBulananId: number;
    pegawais: Pegawai[];
    shifts: MasterShift[];
    bulan: number;
    tahun: number;
}

export default function BulkUpdateModal({
    open,
    onOpenChange,
    jadwalBulananId,
    pegawais,
    shifts,
    bulan,
    tahun,
}: Props) {
    const defaultStartDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
    const defaultEndDate = `${tahun}-${String(bulan).padStart(2, '0')}-05`;

    const { data, setData, post, processing, errors, reset } = useForm({
        jadwal_bulanan_id: jadwalBulananId,
        pegawai_ids: [] as number[],
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        shift_id: shifts.length > 0 ? String(shifts[0].id) : '',
    });

    const togglePegawai = (id: number) => {
        if (data.pegawai_ids.includes(id)) {
            setData('pegawai_ids', data.pegawai_ids.filter((pId) => pId !== id));
        } else {
            setData('pegawai_ids', [...data.pegawai_ids, id]);
        }
    };

    const toggleAllPegawai = () => {
        if (data.pegawai_ids.length === pegawais.length) {
            setData('pegawai_ids', []);
        } else {
            setData('pegawai_ids', pegawais.map((p) => p.id));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/jadwal/bulk-update', {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset('pegawai_ids');
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Update Massal Shift Dinas
                        </DialogTitle>
                        <DialogDescription>
                            Pilih satu atau beberapa pegawai, tentukan rentang tanggal, dan shift tujuan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Target Shift */}
                        <div className="grid gap-2">
                            <Label htmlFor="shift_id">Shift Tujuan</Label>
                            <Select
                                value={String(data.shift_id)}
                                onValueChange={(val) => setData('shift_id', val)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih Shift" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shifts.map((shift) => (
                                        <SelectItem key={shift.id} value={String(shift.id)}>
                                            <span className="font-semibold text-blue-600 mr-2">
                                                [{shift.kode_shift}]
                                            </span>
                                            {shift.nama_shift}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.shift_id && (
                                <p className="text-xs text-red-500">{errors.shift_id}</p>
                            )}
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">Tanggal Mulai</Label>
                                <input
                                    type="date"
                                    id="start_date"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {errors.start_date && (
                                    <p className="text-xs text-red-500">{errors.start_date}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end_date">Tanggal Selesai</Label>
                                <input
                                    type="date"
                                    id="end_date"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {errors.end_date && (
                                    <p className="text-xs text-red-500">{errors.end_date}</p>
                                )}
                            </div>
                        </div>

                        {/* Pegawai List Multi-Select */}
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    Pilih Pegawai ({data.pegawai_ids.length} dipilih)
                                </Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleAllPegawai}
                                    className="h-7 text-xs text-blue-600 hover:text-blue-800"
                                >
                                    {data.pegawai_ids.length === pegawais.length ? (
                                        <span className="flex items-center gap-1">
                                            <Square className="h-3.5 w-3.5" /> Batal Semua
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <CheckSquare className="h-3.5 w-3.5" /> Pilih Semua
                                        </span>
                                    )}
                                </Button>
                            </div>

                            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1.5 bg-slate-50/50">
                                {pegawais.map((pegawai) => {
                                    const isChecked = data.pegawai_ids.includes(pegawai.id);
                                    return (
                                        <label
                                            key={pegawai.id}
                                            className="flex items-center gap-3 p-2 rounded hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onCheckedChange={() => togglePegawai(pegawai.id)}
                                            />
                                            <span className="text-sm font-medium text-slate-800">
                                                {pegawai.nama}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.pegawai_ids && (
                                <p className="text-xs text-red-500">{errors.pegawai_ids}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || data.pegawai_ids.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {processing ? 'Menyimpan...' : 'Terapkan Shift Massal'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
