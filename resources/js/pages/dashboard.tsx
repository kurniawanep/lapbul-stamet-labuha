import React from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Clock,
    FileSpreadsheet,
    Layers,
    ShieldCheck,
    Sparkles,
    Users,
    ArrowRight,
    CloudSun,
} from 'lucide-react';
import type { BreadcrumbItem, SharedData } from '@/types';

export default function Dashboard() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    return (
        <>
            <Head title="Dashboard - BMKG Oesman Sadik" />

            <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-50 min-h-screen">
                {/* Hero / Welcome Card */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 px-3 py-1 text-xs">
                                <Sparkles className="h-3.5 w-3.5 mr-1" /> Stasiun Meteorologi Kelas III Oesman Sadik
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-3 py-1 text-xs">
                                WIT (UTC+9)
                            </Badge>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Selamat Datang, {user?.nama || user?.name || 'Pegawai BMKG'}!
                        </h1>
                        <p className="text-blue-200/80 text-sm max-w-2xl">
                            Sistem Informasi Jadwal Dinas & Otomasi Pelaporan Stasiun Meteorologi Oesman Sadik Halmahera Selatan.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/jadwal/operasional">
                            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 shadow-lg shadow-blue-500/30">
                                <Calendar className="h-4 w-4" /> Buka Jadwal Dinas
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Jadwal Dinas Operasional
                                </CardTitle>
                                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <FileSpreadsheet className="h-4 w-4" />
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Kelola matriks jadwal dinas bulanan observer, bulk update shift, dan cetak PDF resmi.
                            </p>
                            <Link href="/jadwal/operasional" className="inline-block w-full">
                                <Button variant="outline" className="w-full justify-between text-xs font-semibold">
                                    Lihat Matriks Jadwal <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                    Manajemen Pegawai
                                </CardTitle>
                                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <ShieldCheck className="h-4 w-4" />
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Kelola data pegawai PNS dan PPNPN, NIP, pangkat, golongan, dan akun login sistem.
                            </p>
                            <Link href="/pegawai" className="inline-block w-full">
                                <Button variant="outline" className="w-full justify-between text-xs font-semibold">
                                    Kelola Data Pegawai <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-emerald-600" />
                                    Master Shift
                                </CardTitle>
                                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Layers className="h-4 w-4" />
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-slate-500">
                                Pengaturan kode shift (A, P, PF, S, M1, M2, WFH, dll.) dan jam masuk / jam keluar.
                            </p>
                            <Link href="/jadwal/shifts" className="inline-block w-full">
                                <Button variant="outline" className="w-full justify-between text-xs font-semibold">
                                    Pengaturan Master Shift <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            {
                title: 'Dashboard',
                href: '/dashboard',
            },
        ]}
    >
        {page}
    </AppLayout>
);
