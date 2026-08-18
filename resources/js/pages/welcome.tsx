import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { login, dashboard, register } from '@/routes';
import BmkgLogo from '@/components/bmkg-logo';
import {
    Calendar,
    CloudSun,
    FileSpreadsheet,
    Users,
    ArrowRight,
    Clock,
    ShieldCheck,
    Radio,
    Sparkles,
    CheckCircle2,
    LogIn,
    MapPin,
    Building2
} from 'lucide-react';
import type { SharedData } from '@/types';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;
    const [currentTime, setCurrentTime] = useState<string>('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            // Format time for WIT (UTC+9)
            const options: Intl.DateTimeFormatOptions = {
                timeZone: 'Asia/Jayapura', // WIT timezone
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            setCurrentTime(new Intl.DateTimeFormat('id-ID', options).format(now));
        };

        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <Head title="Stasiun Meteorologi Oesman Sadik Labuha - BMKG" />

            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col relative overflow-hidden">
                {/* Ambient Decorative Background Glows */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3" />
                <div className="absolute top-1/3 right-10 w-72 h-72 bg-sky-500/10 rounded-full blur-[90px] pointer-events-none" />

                {/* Grid Pattern Overlay */}
                <div 
                    className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" 
                />

                {/* Header Navigation */}
                <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <BmkgLogo className="h-10" subtitle="Stasiun Meteorologi Kelas III Oesman Sadik" />
                        </div>

                        {/* Right Actions & Clock */}
                        <div className="flex items-center gap-4">
                            {/* Live WIT Clock */}
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300">
                                <Clock className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                                <span>{currentTime ? `${currentTime} WIT` : 'WIT (UTC+9)'}</span>
                            </div>

                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40 active:scale-95"
                                >
                                    <span>Buka Dashboard</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 active:scale-95"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        <span>Masuk ke Sistem</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 flex flex-col justify-center">
                    <div className="text-center max-w-3xl mx-auto space-y-6">
                        {/* Station Identity Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-medium backdrop-blur-xs shadow-inner">
                            <Sparkles className="w-4 h-4 text-sky-400" />
                            <span>Stasiun Meteorologi Kelas III Oesman Sadik Labuha</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-none sm:leading-tight">
                            Sistem Otomasi Pelaporan &{' '}
                            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                Jadwal Dinas Operasional
                            </span>
                        </h1>

                        {/* Description */}
                        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Portal terpadu pengolahan Laporan Bulanan (LAPBUL), data observasi meteorologi penerbangan (TAFOR), serta matriks dinas piket operasional 24 jam BMKG Oesman Sadik Labuha.
                        </p>

                        {/* Action Buttons */}
                        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 flex items-center justify-center gap-2 group"
                                >
                                    <span>Buka Dashboard Operasional</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-base transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 flex items-center justify-center gap-2 group"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        <span>Masuk ke Sistem LAPBUL</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Features Showcase Cards Grid */}
                    <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Feature 1 */}
                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/50 transition-all hover:-translate-y-1 group backdrop-blur-xs shadow-lg">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Matriks Jadwal Dinas</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Manajerial matriks dinas observer 24/7 (Pagi, Siang, Malam, Off), fitur bulk update shift bulanan, dan cetak PDF resmi.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all hover:-translate-y-1 group backdrop-blur-xs shadow-lg">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FileSpreadsheet className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Otomasi LAPBUL & TAFOR</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Rekapitulasi otomatis berkas laporan bulanan meteorologi penerbangan, analisis cuaca permukaan, dan ekspor laporan terstruktur.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-sky-500/50 transition-all hover:-translate-y-1 group backdrop-blur-xs shadow-lg">
                            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Manajemen Pegawai</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Integrasi data kepegawaian PNS & PPNPN Stasiun Oesman Sadik, kelola NIP, pangkat, jabatan, serta otoritas akun sistem.
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all hover:-translate-y-1 group backdrop-blur-xs shadow-lg">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Akses Terproteksi</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Otentikasi aman terintegrasi dengan dukungan Passkey (biometrik/hardware key), 2FA, dan sesi terenkripsi standar BMKG.
                            </p>
                        </div>
                    </div>

                    {/* Station Info Bar */}
                    <div className="mt-16 p-6 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-blue-800/40 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-sky-400">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-white flex items-center gap-2">
                                    Stasiun Meteorologi Kelas III Oesman Sadik
                                </h4>
                                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Labuha, Halmahera Selatan, Maluku Utara (Zona Waktu: WIT UTC+9)</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-2">
                                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                                <span>Status Operasional 24/7 Active</span>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="relative z-10 border-t border-slate-900 py-6 bg-slate-950 text-center text-xs text-slate-500">
                    <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p>© {new Date().getFullYear()} Stasiun Meteorologi Kelas III Oesman Sadik - BMKG Halmahera Selatan.</p>
                        <p className="italic text-slate-600">"Cepat, Tepat, Akurat, Luas, dan Mudah Dipahami"</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
