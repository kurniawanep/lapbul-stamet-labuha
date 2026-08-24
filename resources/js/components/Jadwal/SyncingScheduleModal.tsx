import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Sparkles, Database, CheckCircle2 } from 'lucide-react';

interface Props {
    open: boolean;
    bulan?: number;
    tahun?: number;
}

export default function SyncingScheduleModal({ open, bulan, tahun }: Props) {
    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md bg-transparent border-0 shadow-none p-0 flex items-center justify-center outline-none [&>button]:hidden">
                <Card className="w-full border-2 border-indigo-500/30 bg-white/95 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
                        {/* Background glowing sphere */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-indigo-500/30 rounded-2xl blur-md animate-pulse" />
                                <div className="relative p-3.5 bg-indigo-600/90 border border-indigo-400/30 text-white rounded-2xl shadow-lg flex items-center justify-center">
                                    <RefreshCw className="h-8 w-8 animate-spin text-amber-300" />
                                </div>
                            </div>

                            <Badge className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-extrabold px-3 py-1 mb-2 tracking-wide uppercase">
                                <Sparkles className="h-3 w-3 mr-1 text-amber-300 animate-bounce" /> Resinkronisasi Otomatis
                            </Badge>

                            <h3 className="text-lg font-black tracking-tight text-white">
                                Menyinkronkan Data Pengamatan
                            </h3>
                            <p className="text-xs text-indigo-200 mt-1 max-w-xs">
                                Memperbarui data Observer, Teknisi, dan PPNPN Piket pada seluruh laporan pengamatan {bulan && tahun ? `bulan ${bulan}/${tahun}` : 'terkait'}.
                            </p>
                        </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                                <div className="flex items-center gap-2.5">
                                    <Database className="h-4 w-4 text-indigo-600 animate-pulse" />
                                    <span className="font-semibold text-slate-700">Database Engine:</span>
                                </div>
                                <span className="font-bold text-indigo-900">Direct Bulk SQL Update</span>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1 text-slate-600 text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                                    <span>Menyelaraskan 7 Laporan Operasional:</span>
                                </div>
                                <p className="pl-5 text-slate-500">
                                    Sinoptik, METAR, TAFOR, PIBAL, FKLIM, MET REPORT, & Flight Document.
                                </p>
                            </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 via-amber-400 to-indigo-600 h-full w-full animate-pulse" />
                        </div>
                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    );
}
