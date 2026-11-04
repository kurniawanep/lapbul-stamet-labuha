import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Users, CheckCircle2, Clock, AlertTriangle, Target, LineChart as ChartIcon, Filter } from 'lucide-react';

export interface MonthSummary {
    key: string;
    label: string;
    year: number;
    month: number;
    station_timely_pct: number;
    station_availability_pct: number;
    station_breakdown?: Record<string, { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay?: number }>;
    total_slots: number;
    timely_count: number;
    late_count: number;
    missing_count: number;
}

export interface StaffHistoryItem {
    key: string;
    label: string;
    year: number;
    month: number;
    assigned: number;
    timely_count: number;
    late_count: number;
    missing_count: number;
    timely_pct: number | null;
    availability_pct: number | null;
    avg_delay_minutes: number;
    breakdown?: Record<string, { total: number; timely: number; late: number; missing: number; timely_pct: number; avg_delay?: number }>;
}

export interface StaffTrend {
    pegawai: {
        id: number;
        nama: string;
        nip: string | null;
        jabatan: string | null;
    };
    history: StaffHistoryItem[];
}

export interface Trend12MonthsData {
    months: MonthSummary[];
    staff_trends: StaffTrend[];
}

interface Props {
    data?: Trend12MonthsData;
    initialStaffId?: number | null;
    activeParameter?: string;
    onParameterChange?: (param: string) => void;
    title?: string;
    hideStaffSelect?: boolean;
}

const parameterLabels: Record<string, string> = {
    all: 'Semua Parameter',
    sinop: 'Sinoptik',
    metar: 'METAR Manual',
    pibal_ppaa: 'PIBAL PPAA',
    pibal_ppbb: 'PIBAL PPBB',
    tafor: 'TAFOR',
};

export default function Performance12MonthChart({
    data,
    initialStaffId,
    activeParameter = 'all',
    onParameterChange,
    title,
    hideStaffSelect = false,
}: Props) {
    const months = data?.months ?? [];
    const staffTrends = data?.staff_trends ?? [];

    const [selectedStaffId, setSelectedStaffId] = useState<string>(
        initialStaffId ? String(initialStaffId) : 'station_avg'
    );
    const [selectedParam, setSelectedParam] = useState<string>(activeParameter);
    const [activeMetric, setActiveMetric] = useState<'both' | 'timely' | 'availability'>('both');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        if (initialStaffId !== undefined) {
            setSelectedStaffId(initialStaffId ? String(initialStaffId) : 'station_avg');
        }
    }, [initialStaffId]);

    useEffect(() => {
        setSelectedParam(activeParameter);
    }, [activeParameter]);

    const handleParamChange = (newParam: string) => {
        setSelectedParam(newParam);
        if (onParameterChange) {
            onParameterChange(newParam);
        }
    };

    const activeStaff = useMemo(() => {
        if (selectedStaffId === 'station_avg') return null;
        return staffTrends.find((s) => String(s.pegawai.id) === selectedStaffId) ?? null;
    }, [selectedStaffId, staffTrends]);

    // Data points to graph based on selected staff and selected parameter
    const chartPoints = useMemo(() => {
        return months.map((m, idx) => {
            if (activeStaff) {
                const staffHist = activeStaff.history[idx];
                if (selectedParam !== 'all' && staffHist?.breakdown?.[selectedParam]) {
                    const pData = staffHist.breakdown[selectedParam];
                    const availPct = pData.total > 0 ? Number(((pData.timely + pData.late) / pData.total * 100).toFixed(1)) : null;
                    return {
                        label: m.label,
                        key: m.key,
                        timely_pct: pData.total > 0 ? pData.timely_pct : null,
                        availability_pct: availPct,
                        assigned: pData.total,
                        timely_count: pData.timely,
                        late_count: pData.late,
                        missing_count: pData.missing,
                        avg_delay: pData.avg_delay ?? 0,
                        isStaff: true,
                    };
                }

                return {
                    label: m.label,
                    key: m.key,
                    timely_pct: staffHist?.timely_pct ?? null,
                    availability_pct: staffHist?.availability_pct ?? null,
                    assigned: staffHist?.assigned ?? 0,
                    timely_count: staffHist?.timely_count ?? 0,
                    late_count: staffHist?.late_count ?? 0,
                    missing_count: staffHist?.missing_count ?? 0,
                    avg_delay: staffHist?.avg_delay_minutes ?? 0,
                    isStaff: true,
                };
            }

            if (selectedParam !== 'all' && m.station_breakdown?.[selectedParam]) {
                const pData = m.station_breakdown[selectedParam];
                const availPct = pData.total > 0 ? Number(((pData.timely + pData.late) / pData.total * 100).toFixed(1)) : 0;
                return {
                    label: m.label,
                    key: m.key,
                    timely_pct: pData.timely_pct,
                    availability_pct: availPct,
                    assigned: pData.total,
                    timely_count: pData.timely,
                    late_count: pData.late,
                    missing_count: pData.missing,
                    avg_delay: pData.avg_delay ?? 0,
                    isStaff: false,
                };
            }

            return {
                label: m.label,
                key: m.key,
                timely_pct: m.station_timely_pct,
                availability_pct: m.station_availability_pct,
                assigned: m.total_slots,
                timely_count: m.timely_count,
                late_count: m.late_count,
                missing_count: m.missing_count,
                avg_delay: 0,
                isStaff: false,
            };
        });
    }, [months, activeStaff, selectedParam]);

    // Calculate Summary Stats
    const summaryStats = useMemo(() => {
        const validTimely = chartPoints.map((p) => p.timely_pct).filter((v): v is number => v !== null);
        const validAvail = chartPoints.map((p) => p.availability_pct).filter((v): v is number => v !== null);

        const avgTimely = validTimely.length > 0 ? validTimely.reduce((a, b) => a + b, 0) / validTimely.length : 0;
        const avgAvail = validAvail.length > 0 ? validAvail.reduce((a, b) => a + b, 0) / validAvail.length : 0;

        const latestPoint = chartPoints[chartPoints.length - 1];
        const prevPoint = chartPoints[chartPoints.length - 2];

        const momTimelyDiff =
            latestPoint && prevPoint && latestPoint.timely_pct !== null && prevPoint.timely_pct !== null
                ? Number((latestPoint.timely_pct - prevPoint.timely_pct).toFixed(1))
                : 0;

        const momAvailDiff =
            latestPoint && prevPoint && latestPoint.availability_pct !== null && prevPoint.availability_pct !== null
                ? Number((latestPoint.availability_pct - prevPoint.availability_pct).toFixed(1))
                : 0;

        return {
            avgTimely: avgTimely.toFixed(1),
            avgAvail: avgAvail.toFixed(1),
            latestTimely: latestPoint?.timely_pct ?? null,
            latestAvail: latestPoint?.availability_pct ?? null,
            momTimelyDiff,
            momAvailDiff,
        };
    }, [chartPoints]);

    if (!months.length) {
        return null;
    }

    // SVG Chart Geometry
    const svgWidth = 900;
    const svgHeight = 280;
    const paddingLeft = 45;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    // Y Axis scaling: 0% to 100%
    const getY = (pct: number | null) => {
        if (pct === null) return null;
        const clamped = Math.max(0, Math.min(100, pct));
        return paddingTop + chartHeight - (clamped / 100) * chartHeight;
    };

    const getX = (index: number) => {
        if (chartPoints.length <= 1) return paddingLeft + chartWidth / 2;
        return paddingLeft + (index / (chartPoints.length - 1)) * chartWidth;
    };

    // Generate Path String for series
    const generatePath = (metricKey: 'timely_pct' | 'availability_pct') => {
        let path = '';
        let isFirst = true;

        chartPoints.forEach((p, idx) => {
            const val = p[metricKey];
            if (val === null) return;
            const x = getX(idx);
            const y = getY(val);
            if (y === null) return;

            if (isFirst) {
                path += `M ${x} ${y}`;
                isFirst = false;
            } else {
                path += ` L ${x} ${y}`;
            }
        });

        return path;
    };

    // Generate Area Gradient Path
    const generateAreaPath = (metricKey: 'timely_pct' | 'availability_pct') => {
        const points = chartPoints
            .map((p, idx) => ({ val: p[metricKey], x: getX(idx), y: getY(p[metricKey]) }))
            .filter((pt) => pt.val !== null && pt.y !== null);

        if (points.length === 0) return '';

        const bottomY = paddingTop + chartHeight;
        const first = points[0];
        const last = points[points.length - 1];

        let area = `M ${first.x} ${bottomY} L ${first.x} ${first.y}`;
        points.forEach((pt) => {
            area += ` L ${pt.x} ${pt.y}`;
        });
        area += ` L ${last.x} ${bottomY} Z`;
        return area;
    };

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <ChartIcon className="h-5 w-5 text-indigo-600" />
                            <CardTitle className="text-base font-bold text-slate-900">
                                {title || 'Tren Performa Pengiriman Data (12 Bulan Terakhir)'}
                            </CardTitle>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Monitoring tren ketepatan waktu & ketercapaian per bulan {selectedParam !== 'all' ? `• Parameter: ${parameterLabels[selectedParam]}` : ''}
                        </p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Parameter Selector */}
                        <div className="w-44">
                            <Select value={selectedParam} onValueChange={handleParamChange}>
                                <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 font-medium">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                                        <SelectValue placeholder="Pilih Parameter" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {Object.entries(parameterLabels).map(([key, label]) => (
                                        <SelectItem key={key} value={key} className="text-xs">
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Metric Selector Buttons */}
                        <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-xs text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveMetric('both')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${activeMetric === 'both' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Semua Metrik
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMetric('availability')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${activeMetric === 'availability' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Ketercapaian
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveMetric('timely')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${activeMetric === 'timely' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Ketepatan Waktu
                            </button>
                        </div>

                        {/* Staff Dropdown Selector */}
                        {!hideStaffSelect && (
                            <div className="w-56">
                                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                    <SelectTrigger className="h-8.5 text-xs bg-white border-slate-200 font-medium">
                                        <SelectValue placeholder="Pilih Pegawai" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-64">
                                        <SelectItem value="station_avg" className="text-xs font-semibold text-indigo-700">
                                            📊 Rata-rata Keseluruhan
                                        </SelectItem>
                                        {staffTrends.map((s) => (
                                            <SelectItem key={s.pegawai.id} value={String(s.pegawai.id)} className="text-xs">
                                                {s.pegawai.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Stat Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-200/60">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Rerata Ketercapaian (12 Bln)</span>
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-bold text-blue-700">{summaryStats.avgAvail}%</span>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Rerata Ketepatan Waktu (12 Bln)</span>
                            <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-lg font-bold text-emerald-700">{summaryStats.avgTimely}%</span>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Bulan Terakhir (% Tepat)</span>
                            <Target className="h-3.5 w-3.5 text-indigo-500" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-lg font-bold text-slate-900">
                                {summaryStats.latestTimely !== null ? `${summaryStats.latestTimely}%` : '-'}
                            </span>
                            {summaryStats.momTimelyDiff !== 0 && (
                                <span
                                    className={`inline-flex items-center text-[11px] font-semibold ${summaryStats.momTimelyDiff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                >
                                    {summaryStats.momTimelyDiff > 0 ? (
                                        <TrendingUp className="h-3 w-3 mr-0.5" />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 mr-0.5" />
                                    )}
                                    {summaryStats.momTimelyDiff > 0 ? `+${summaryStats.momTimelyDiff}%` : `${summaryStats.momTimelyDiff}%`}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-xs flex flex-col justify-center">
                        <div className="text-xs text-slate-500">Subjek & Parameter:</div>
                        <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                            {activeStaff ? activeStaff.pegawai.nama : 'Semua Observer & Forecaster'}
                        </div>
                        <div className="text-[10px] text-indigo-600 font-semibold truncate">
                            {parameterLabels[selectedParam] || 'Semua Parameter'}
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-3">
                {/* SVG Line Graph */}
                <div className="relative w-full overflow-x-auto">
                    <svg
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        className="w-full h-auto min-w-[700px] select-none"
                    >
                        <defs>
                            <linearGradient id="availGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="timelyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>

                        {/* Background Horizontal Grid Lines & Y Axis Labels */}
                        {[100, 75, 50, 25, 0].map((val) => {
                            const y = getY(val);
                            if (y === null) return null;
                            return (
                                <g key={val}>
                                    <line
                                        x1={paddingLeft}
                                        y1={y}
                                        x2={svgWidth - paddingRight}
                                        y2={y}
                                        stroke="#f1f5f9"
                                        strokeWidth="1"
                                        strokeDasharray={val === 0 || val === 100 ? 'none' : '4 4'}
                                    />
                                    <text
                                        x={paddingLeft - 8}
                                        y={y + 3.5}
                                        textAnchor="end"
                                        fontSize="10"
                                        fill="#94a3b8"
                                        fontFamily="sans-serif"
                                    >
                                        {val}%
                                    </text>
                                </g>
                            );
                        })}

                        {/* Area Fill for Availability */}
                        {(activeMetric === 'both' || activeMetric === 'availability') && (
                            <path d={generateAreaPath('availability_pct')} fill="url(#availGradient)" />
                        )}

                        {/* Area Fill for Timeliness */}
                        {(activeMetric === 'both' || activeMetric === 'timely') && (
                            <path d={generateAreaPath('timely_pct')} fill="url(#timelyGradient)" />
                        )}

                        {/* Line: Availability */}
                        {(activeMetric === 'both' || activeMetric === 'availability') && (
                            <path
                                d={generatePath('availability_pct')}
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* Line: Timeliness */}
                        {(activeMetric === 'both' || activeMetric === 'timely') && (
                            <path
                                d={generatePath('timely_pct')}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        )}

                        {/* X Axis Labels and Interactive Hover Columns */}
                        {chartPoints.map((p, idx) => {
                            const x = getX(idx);
                            const yAvail = getY(p.availability_pct);
                            const yTimely = getY(p.timely_pct);
                            const isHovered = hoveredIndex === idx;

                            return (
                                <g
                                    key={p.key}
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="cursor-pointer"
                                >
                                    {/* Invisible Hover Hitbox */}
                                    <rect
                                        x={x - chartWidth / (chartPoints.length * 2)}
                                        y={paddingTop}
                                        width={chartWidth / chartPoints.length}
                                        height={chartHeight}
                                        fill={isHovered ? '#6366f1' : 'transparent'}
                                        fillOpacity={isHovered ? 0.05 : 0}
                                        rx="4"
                                    />

                                    {/* Vertical Hover Line */}
                                    {isHovered && (
                                        <line
                                            x1={x}
                                            y1={paddingTop}
                                            x2={x}
                                            y2={paddingTop + chartHeight}
                                            stroke="#6366f1"
                                            strokeWidth="1.5"
                                            strokeDasharray="3 3"
                                        />
                                    )}

                                    {/* Availability Dot */}
                                    {(activeMetric === 'both' || activeMetric === 'availability') && yAvail !== null && (
                                        <circle
                                            cx={x}
                                            cy={yAvail}
                                            r={isHovered ? 5.5 : 3.5}
                                            fill="#3b82f6"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            className="transition-all duration-150 shadow-sm"
                                        />
                                    )}

                                    {/* Timeliness Dot */}
                                    {(activeMetric === 'both' || activeMetric === 'timely') && yTimely !== null && (
                                        <circle
                                            cx={x}
                                            cy={yTimely}
                                            r={isHovered ? 5.5 : 3.5}
                                            fill="#10b981"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                            className="transition-all duration-150 shadow-sm"
                                        />
                                    )}

                                    {/* Month Label on X Axis */}
                                    <text
                                        x={x}
                                        y={svgHeight - 12}
                                        textAnchor="middle"
                                        fontSize={isHovered ? '11' : '10'}
                                        fontWeight={isHovered ? '700' : '500'}
                                        fill={isHovered ? '#1e293b' : '#64748b'}
                                        fontFamily="sans-serif"
                                    >
                                        {p.label.split(' ')[0]}
                                    </text>
                                    <text
                                        x={x}
                                        y={svgHeight - 2}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#94a3b8"
                                        fontFamily="sans-serif"
                                    >
                                        {p.label.split(' ')[1]}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Tooltip Overlay */}
                    {hoveredIndex !== null && chartPoints[hoveredIndex] && (
                        <div
                            className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-md text-white px-3 py-2.5 rounded-lg shadow-xl text-xs z-20 border border-slate-700 min-w-[210px] transform -translate-x-1/2 -translate-y-full transition-all duration-75"
                            style={{
                                left: `${(getX(hoveredIndex) / svgWidth) * 100}%`,
                                top: '35%',
                            }}
                        >
                            <div className="font-bold text-slate-100 border-b border-slate-700/80 pb-1.5 mb-1.5 flex items-center justify-between">
                                <span>📅 {chartPoints[hoveredIndex].label}</span>
                                <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-300 py-0 px-1.5">
                                    {chartPoints[hoveredIndex].assigned} Slot Tugas
                                </Badge>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5 text-blue-300 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Ketercapaian:
                                    </span>
                                    <span className="font-bold text-white">
                                        {chartPoints[hoveredIndex].availability_pct !== null
                                            ? `${chartPoints[hoveredIndex].availability_pct}%`
                                            : 'Tidak ada tugas'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Ketepatan Waktu:
                                    </span>
                                    <span className="font-bold text-white">
                                        {chartPoints[hoveredIndex].timely_pct !== null
                                            ? `${chartPoints[hoveredIndex].timely_pct}%`
                                            : 'Tidak ada tugas'}
                                    </span>
                                </div>

                                <div className="pt-1.5 border-t border-slate-800 grid grid-cols-3 gap-1 text-[10px] text-slate-300 text-center">
                                    <div className="bg-slate-800/80 p-1 rounded">
                                        <div className="text-emerald-400 font-bold">{chartPoints[hoveredIndex].timely_count}</div>
                                        <div className="text-slate-400 text-[9px]">Tepat</div>
                                    </div>
                                    <div className="bg-slate-800/80 p-1 rounded">
                                        <div className="text-amber-400 font-bold">{chartPoints[hoveredIndex].late_count}</div>
                                        <div className="text-slate-400 text-[9px]">Terlambat</div>
                                    </div>
                                    <div className="bg-slate-800/80 p-1 rounded">
                                        <div className="text-rose-400 font-bold">{chartPoints[hoveredIndex].missing_count}</div>
                                        <div className="text-slate-400 text-[9px]">Missing</div>
                                    </div>
                                </div>

                                {chartPoints[hoveredIndex].avg_delay > 0 && (
                                    <div className="text-[10px] text-amber-300/90 text-right pt-0.5">
                                        ⏱ Rerata keterlambatan: {chartPoints[hoveredIndex].avg_delay} mnt
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend Bar */}
                <div className="flex flex-wrap items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-1 rounded-full bg-blue-500"></span>
                        <span className="font-medium">Ketercapaian Pengiriman (% Availability)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-1 rounded-full bg-emerald-500"></span>
                        <span className="font-medium">Ketepatan Waktu (% Timeliness)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
