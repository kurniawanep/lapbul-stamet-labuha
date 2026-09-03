import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import BmkgLogo from '@/components/bmkg-logo';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';
import { Clock, Sparkles, MapPin } from 'lucide-react';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const [currentTime, setCurrentTime] = useState<string>('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const options: Intl.DateTimeFormatOptions = {
                timeZone: 'Asia/Jayapura',
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
        <div className="w-full min-h-screen grid lg:grid-cols-12 bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
            {/* Left Column - BMKG Light Theme Hero Panel */}
            <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-blue-100/60 via-sky-50 to-indigo-50/70 border-r border-slate-200/90 overflow-hidden">
                {/* Ambient Decorative Lighting */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_50%)] pointer-events-none" />
                <div className="absolute top-1/3 -left-20 w-96 h-96 bg-sky-300/25 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

                {/* Top Bar Logo & Clock */}
                <div className="relative z-10 flex items-center justify-between">
                    <Link href={home()} className="flex items-center gap-3 group">
                        <BmkgLogo className="h-10" subtitle="Stasiun Meteorologi Oesman Sadik" lightMode={true} />
                    </Link>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200 text-xs font-mono text-slate-700 shadow-xs backdrop-blur-xs">
                        <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                        <span>{currentTime ? `${currentTime} WIT` : 'WIT (UTC+9)'}</span>
                    </div>
                </div>

                {/* Center Content / Hero Text */}
                <div className="relative z-10 my-auto max-w-lg space-y-6 py-8">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 border border-blue-200 text-blue-800 text-xs font-semibold backdrop-blur-xs shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sistem Otomasi Laporan Bulanan & Monitoring Performa Pegawai</span>
                    </div>

                    <h2 className="text-3xl xl:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                        Stasiun Meteorologi Kelas III{' '}
                        <span className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 bg-clip-text text-transparent">
                            Oesman Sadik Halmahera Selatan
                        </span>
                    </h2>

                    <p className="text-slate-600 text-sm xl:text-base leading-relaxed font-normal">
                        Aplikasi  pengelolaan  jadwal dinas pegawai, rekapitulasi data meteorologi penerbangan dan iklim, serta administrasi kepegawaian BMKG Halmahera Selatan.
                    </p>

                    {/* Quick Badge Chips */}
                    {/* <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-xs flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">Dinas Operasional 24/7</div>
                                <div className="text-[11px] text-slate-500">Shift Pagi, Siang & Malam</div>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-xs backdrop-blur-xs flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-900">Akses Terotentikasi</div>
                                <div className="text-[11px] text-slate-500">Passkey & Biometrik Ready</div>
                            </div>
                        </div>
                    </div> */}
                </div>

                {/* Bottom Footer Quote */}
                <div className="relative z-10 pt-6 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Labuha, Halmahera Selatan
                    </span>
                    <span className="italic text-slate-500 font-serif">
                        "Cepat, Tepat, Akurat, Luas, dan Mudah Dipahami"
                    </span>
                </div>
            </div>

            {/* Right Column - Light Mode Form Container */}
            <div className="lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 relative w-full bg-slate-50/50">
                {/* Mobile Header (Shown on small screens) */}
                <div className="w-full max-w-sm lg:hidden flex items-center justify-between mb-8">
                    <Link href={home()}>
                        <BmkgLogo className="h-9" subtitle="BMKG Oesman Sadik" lightMode={true} />
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                        <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
                        <span>WIT</span>
                    </div>
                </div>

                <div className="w-full max-w-sm space-y-6">
                    {/* Header */}
                    <div className="space-y-2 text-center lg:text-left">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                        {description && (
                            <p className="text-sm text-slate-600">{description}</p>
                        )}
                    </div>

                    {/* Children Form Container */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-md">
                        {children}
                    </div>

                    {/* Mobile Footer Quote */}
                    <div className="lg:hidden text-center text-xs text-slate-500 pt-4">
                        Stasiun Meteorologi Kelas III Oesman Sadik Halmahera Selatan
                    </div>
                </div>
            </div>
        </div>
    );
}
