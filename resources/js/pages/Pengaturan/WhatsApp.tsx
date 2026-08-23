import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileCheck,
    Globe,
    LogOut,
    MessageSquare,
    QrCode,
    Radio,
    RefreshCw,
    Send,
    ShieldCheck,
    Smartphone,
    Sparkles,
    Wifi,
    WifiOff,
} from 'lucide-react';

interface GatewayStatusPayload {
    configured: boolean;
    connected: boolean;
    user: {
        id?: string;
        name?: string;
    } | null;
    qr: string | null;
    gateway_url: string;
    message: string;
}

interface Props {
    status: GatewayStatusPayload;
}

export default function WhatsAppManagement({ status }: Props) {
    const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
        };
    }>().props;

    const [phoneTo, setPhoneTo] = useState('');
    const [messageText, setMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(!status.connected);

    // Auto-poll status every 4 seconds if not connected
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (autoRefresh && !status.connected) {
            interval = setInterval(() => {
                router.reload({ preserveScroll: true, preserveState: true });
            }, 4000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, status.connected]);

    const handleSendTest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneTo || !messageText) return;

        setIsSending(true);
        router.post(
            '/pengaturan/whatsapp/send-test',
            { to: phoneTo, message: messageText },
            {
                onFinish: () => setIsSending(false),
            }
        );
    };

    const handleLogout = () => {
        if (confirm('Apakah Anda yakin ingin me-logout sesi WhatsApp ini dan me-reset QR Code?')) {
            setIsLoggingOut(true);
            router.post(
                '/pengaturan/whatsapp/logout',
                {},
                {
                    onFinish: () => setIsLoggingOut(false),
                }
            );
        }
    };

    const handleManualRefresh = () => {
        router.reload({ preserveScroll: true });
    };

    const userPhoneDisplay = status.user?.id
        ? status.user.id.split('@')[0].split(':')[0]
        : '-';

    return (
        <AppLayout title="WhatsApp Gateway Management">
            <Head title="WhatsApp Gateway Management - Stasion Meteorologi Labuha" />

            <div className="p-4 md:p-6 space-y-6 pb-12">
                {/* HERO HEADER */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-sky-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="space-y-2 z-10">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-gradient-to-r from-sky-500 to-blue-500 text-white font-bold px-3 py-1 text-xs shadow-md">
                                Service Management
                            </Badge>
                            <span className="text-xs text-sky-300 font-mono tracking-widest uppercase">
                                Stasion Meteorologi Kelas III Oesman Sadik (WAEL / 97460)
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                            <Radio className="h-7 w-7 text-sky-400 animate-pulse" />
                            WhatsApp Gateway Management
                        </h1>

                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Pemantauan Status Koneksi 24/7, Pemindaian QR Code, Logout Sesi, dan Pengujian Pengiriman Pesan Outbound.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 z-10 w-full md:w-auto">
                        <Button
                            onClick={handleManualRefresh}
                            className="h-10 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 rounded-xl shadow-md border border-slate-700 transition-all flex items-center gap-2 text-xs"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh Status
                        </Button>
                    </div>
                </div>

                {/* FLASH NOTIFICATIONS */}
                {flash?.success && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2 shadow-sm">
                        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* MAIN GRID CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: CONNECTION STATUS & QR CODE (7 COLS) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* CONNECTION STATUS CARD */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Smartphone className="h-5 w-5 text-sky-400" />
                                        Status Koneksi Gateway
                                    </span>
                                    {status.connected ? (
                                        <Badge className="bg-emerald-500 text-white font-extrabold flex items-center gap-1.5">
                                            <Wifi className="h-3.5 w-3.5" /> TERHUBUNG &amp; AKTIF
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-amber-500 text-white font-extrabold flex items-center gap-1.5">
                                            <WifiOff className="h-3.5 w-3.5" /> MENUNGGU SCAN QR
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <span className="text-slate-500 block font-semibold mb-1">Akun WhatsApp Terhubung</span>
                                        <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                            <Smartphone className="h-4 w-4 text-sky-600" />
                                            {status.connected ? `+${userPhoneDisplay}` : 'Belum Ada Akun'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-slate-500 block font-semibold mb-1">HTTP Gateway Endpoint</span>
                                        <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                                            <Globe className="h-4 w-4 text-sky-600" />
                                            {status.gateway_url}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-100/60 rounded-xl text-slate-700 font-medium">
                                    <span>Pesan Gateway Status:</span>
                                    <span className="font-bold text-slate-900">{status.message}</span>
                                </div>

                                {status.connected && (
                                    <div className="pt-2">
                                        <Button
                                            onClick={handleLogout}
                                            disabled={isLoggingOut}
                                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs"
                                        >
                                            <LogOut className={`h-4 w-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                                            {isLoggingOut ? 'Memproses Logout...' : 'Logout Sesi & Reset QR Code'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* QR CODE SCANNER CARD (IF NOT CONNECTED) */}
                        {!status.connected && (
                            <Card className="border-2 border-sky-400/60 shadow-lg bg-white overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-sky-900 to-slate-900 text-white p-4">
                                    <CardTitle className="text-base font-bold flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <QrCode className="h-5 w-5 text-sky-400" />
                                            Scan QR Code untuk Menghubungkan WhatsApp
                                        </span>
                                        <Badge className="bg-sky-500 text-white font-bold animate-pulse">
                                            Live QR Stream
                                        </Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                                    {status.qr ? (
                                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex flex-col items-center">
                                            <img
                                                src={status.qr}
                                                alt="WhatsApp QR Code"
                                                className="w-64 h-64 object-contain rounded-lg"
                                            />
                                            <span className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5 text-sky-600 animate-spin" />
                                                QR Code diperbarui otomatis saat di-scan
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-64 h-64 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center">
                                            <RefreshCw className="h-8 w-8 text-sky-600 animate-spin mb-2" />
                                            <span className="text-xs font-bold text-slate-700">
                                                Memuat QR Code dari Gateway...
                                            </span>
                                            <span className="text-[11px] text-slate-500 mt-1">
                                                Pastikan service WA Gateway pada port 3000 sedang berjalan.
                                            </span>
                                        </div>
                                    )}

                                    {/* INSTRUCTIONS */}
                                    <div className="w-full p-4 bg-sky-50 rounded-2xl border border-sky-200/60 text-xs space-y-2 text-slate-700">
                                        <p className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                                            <Sparkles className="h-4 w-4 text-sky-600" /> Langkah Pemindaian:
                                        </p>
                                        <ol className="list-decimal list-inside space-y-1 font-medium pl-1">
                                            <li>Buka aplikasi <strong>WhatsApp</strong> di HP Pengamatan / Stasion.</li>
                                            <li>Ketuk menu <strong>Setelan / Titik Tiga (Pojok Kanan Atas)</strong>.</li>
                                            <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong> $\rightarrow$ <strong>Tautkan Perangkat</strong>.</li>
                                            <li>Arahkan kamera HP ke <strong>QR Code</strong> di atas.</li>
                                        </ol>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* CONNECTED SUCCESS NOTICE */}
                        {status.connected && (
                            <Card className="border border-emerald-200 bg-emerald-50/50 shadow-sm overflow-hidden">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shrink-0 shadow-md">
                                        <ShieldCheck className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-1 text-xs">
                                        <h3 className="text-sm font-black text-emerald-950">
                                            WhatsApp Gateway Aktif 24/7
                                        </h3>
                                        <p className="text-emerald-800 leading-relaxed font-medium">
                                            Gateway secara otomatis mendengarkan pesan masuk <strong>MET REPORT (QAM)</strong> dan melacak dispatches <strong>Flight Document (FD)</strong> baik dari grup WhatsApp maupun personal chat (DM).
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT COLUMN: OUTBOUND TEST SENDER & WEBHOOK INFO (5 COLS) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* OUTBOUND TEST FORM CARD */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Send className="h-5 w-5 text-sky-400" />
                                    Uji Coba Pengiriman Pesan (Outbound)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSendTest} className="space-y-4 text-xs">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700">
                                            Nomor HP / JID Tujuan:
                                        </Label>
                                        <Input
                                            type="text"
                                            value={phoneTo}
                                            onChange={(e) => setPhoneTo(e.target.value)}
                                            placeholder="Contoh: 081234567890 atau 6281234567890"
                                            required
                                            className="h-9 text-xs border-slate-200"
                                        />
                                        <span className="text-[11px] text-slate-500">
                                            Dapat memasukkan nomor HP personal atau JID grup (`@g.us`).
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-700">
                                            Isi Pesan WhatsApp:
                                        </Label>
                                        <Textarea
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            placeholder="Tuliskan isi pesan pengujian cuaca atau notifikasi..."
                                            rows={4}
                                            required
                                            className="text-xs border-slate-200 font-mono"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSending || !status.connected}
                                        className="w-full bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold h-10 rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs"
                                    >
                                        <Send className={`h-4 w-4 ${isSending ? 'animate-spin' : ''}`} />
                                        {isSending ? 'Mengirim Pesan...' : 'Kirim Pesan WhatsApp Test'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* WEBHOOK & INTEGRATION INFO CARD */}
                        <Card className="border border-slate-200 shadow-md bg-white overflow-hidden">
                            <CardHeader className="bg-slate-900 text-white p-4">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-sky-400" />
                                    Integrasi Webhook Auto-Receiver
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4 text-xs">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <span className="text-slate-500 block font-semibold mb-1">Public Webhook URL:</span>
                                    <code className="text-sky-700 font-mono font-bold text-[11px] break-all block">
                                        /api/whatsapp/webhook
                                    </code>
                                </div>

                                <div className="space-y-2 text-slate-700">
                                    <p className="font-bold text-slate-900">Modul Terintegrasi Automatic Listener:</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="font-semibold flex items-center gap-1.5">
                                                <MessageSquare className="h-4 w-4 text-sky-600" /> MET REPORT (QAM)
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.get('/laporan/met-report')}
                                                className="h-7 text-[11px] font-bold text-sky-700 border-sky-200 hover:bg-sky-50"
                                            >
                                                Buka Log
                                            </Button>
                                        </li>

                                        <li className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="font-semibold flex items-center gap-1.5">
                                                <FileCheck className="h-4 w-4 text-sky-600" /> Flight Document (FD)
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.get('/laporan/flight-document')}
                                                className="h-7 text-[11px] font-bold text-sky-700 border-sky-200 hover:bg-sky-50"
                                            >
                                                Buka Log
                                            </Button>
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
