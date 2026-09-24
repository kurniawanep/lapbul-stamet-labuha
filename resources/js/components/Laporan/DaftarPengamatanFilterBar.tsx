import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Calendar,
    Clock,
    Filter,
    ArrowDownUp,
    RotateCcw,
    Globe,
    Check,
    X,
    SlidersHorizontal,
} from 'lucide-react';

export interface ObservationFilterParams {
    bulan?: number;
    tahun?: number;
    timezone?: 'UTC' | 'WIT';
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    observer?: string;
    sort_order?: string;
    per_page?: number;
    [key: string]: unknown;
}

interface Props {
    baseUrl: string;
    bulan: number;
    tahun: number;
    title?: string;
    icon?: React.ReactNode;
    totalRecords?: number;
    timezone?: 'UTC' | 'WIT';
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    hasCustomFilter?: boolean;
    sortOrder?: string;
    perPage?: number;
    availableObservers?: string[];
    observerFilter?: string;
    extraFilters?: React.ReactNode;
    extraParams?: Record<string, unknown>;
    onFilterSubmit?: (params: ObservationFilterParams) => void;
    showObserverFilter?: boolean;
    showSortOrder?: boolean;
    showPerPage?: boolean;
}

export default function DaftarPengamatanFilterBar({
    baseUrl,
    bulan,
    tahun,
    title = 'Daftar Pengamatan',
    icon,
    totalRecords,
    timezone = 'UTC',
    startDate = null,
    endDate = null,
    startTime = null,
    endTime = null,
    hasCustomFilter = false,
    sortOrder = 'desc',
    perPage = 10,
    availableObservers = [],
    observerFilter = 'ALL',
    extraFilters,
    extraParams = {},
    onFilterSubmit,
    showObserverFilter = true,
    showSortOrder = true,
    showPerPage = true,
}: Props) {
    // Local form state
    const [selectedTz, setSelectedTz] = useState<'UTC' | 'WIT'>(timezone);
    const [inputStartDate, setInputStartDate] = useState(startDate || '');
    const [inputEndDate, setInputEndDate] = useState(endDate || '');
    const [inputStartTime, setInputStartTime] = useState(startTime || '');
    const [inputEndTime, setInputEndTime] = useState(endTime || '');
    const [selectedObserver, setSelectedObserver] = useState(observerFilter || 'ALL');
    const [selectedSort, setSelectedSort] = useState(sortOrder || 'desc');
    const [selectedPerPage, setSelectedPerPage] = useState(perPage || 10);
    const [isExpanded, setIsExpanded] = useState(false);

    // Sync state when props change
    useEffect(() => {
        setSelectedTz(timezone);
        setInputStartDate(startDate || '');
        setInputEndDate(endDate || '');
        setInputStartTime(startTime || '');
        setInputEndTime(endTime || '');
        setSelectedObserver(observerFilter || 'ALL');
        setSelectedSort(sortOrder || 'desc');
        setSelectedPerPage(perPage || 10);
    }, [timezone, startDate, endDate, startTime, endTime, observerFilter, sortOrder, perPage]);

    const isFiltered = hasCustomFilter || (selectedObserver && selectedObserver !== 'ALL');

    const handleApplyFilter = (overrideParams: Partial<ObservationFilterParams> = {}) => {
        const params: Record<string, unknown> = {
            bulan,
            tahun,
            timezone: overrideParams.timezone !== undefined ? overrideParams.timezone : selectedTz,
            start_date: overrideParams.start_date !== undefined ? overrideParams.start_date : (inputStartDate || undefined),
            end_date: overrideParams.end_date !== undefined ? overrideParams.end_date : (inputEndDate || undefined),
            start_time: overrideParams.start_time !== undefined ? overrideParams.start_time : (inputStartTime || undefined),
            end_time: overrideParams.end_time !== undefined ? overrideParams.end_time : (inputEndTime || undefined),
            observer: overrideParams.observer !== undefined ? (overrideParams.observer === 'ALL' ? undefined : overrideParams.observer) : (selectedObserver === 'ALL' ? undefined : selectedObserver),
            sort_order: overrideParams.sort_order !== undefined ? overrideParams.sort_order : selectedSort,
            per_page: overrideParams.per_page !== undefined ? overrideParams.per_page : selectedPerPage,
            ...extraParams,
        };

        // Clean undefined or empty string values
        Object.keys(params).forEach((key) => {
            if (params[key] === undefined || params[key] === '') {
                delete params[key];
            }
        });

        if (onFilterSubmit) {
            onFilterSubmit(params as ObservationFilterParams);
        } else {
            router.get(baseUrl, params as Record<string, string>, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handleResetFilter = () => {
        setSelectedTz('UTC');
        setInputStartDate('');
        setInputEndDate('');
        setInputStartTime('');
        setInputEndTime('');
        setSelectedObserver('ALL');

        const params: Record<string, unknown> = {
            bulan,
            tahun,
            timezone: 'UTC',
            sort_order: selectedSort,
            per_page: selectedPerPage,
            ...extraParams,
        };

        if (onFilterSubmit) {
            onFilterSubmit(params as ObservationFilterParams);
        } else {
            router.get(baseUrl, params as Record<string, string>, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    const handleTimezoneChange = (newTz: 'UTC' | 'WIT') => {
        setSelectedTz(newTz);
        handleApplyFilter({ timezone: newTz });
    };

    const handleSortChange = (newSort: string) => {
        setSelectedSort(newSort);
        handleApplyFilter({ sort_order: newSort });
    };

    const handlePerPageChange = (newPerPage: number) => {
        setSelectedPerPage(newPerPage);
        handleApplyFilter({ per_page: newPerPage });
    };

    const handleObserverChange = (newObs: string) => {
        setSelectedObserver(newObs);
        handleApplyFilter({ observer: newObs });
    };

    return (
        <div className="bg-slate-50/80 border-b border-slate-200 p-2.5 sm:px-4 space-y-2.5">
            {/* TOP ROW: TITLE & PRIMARY CONTROLS IN ONE COMPACT ROW */}
            <div className="flex flex-row items-center justify-between gap-2.5 w-full flex-wrap xl:flex-nowrap">
                {/* LEFT: ICON + TITLE + BADGE */}
                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                    {icon || <Calendar className="h-4.5 w-4.5 text-indigo-600 shrink-0" />}
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                            {title}
                        </h3>
                        {totalRecords !== undefined && (
                            <Badge variant="secondary" className="font-semibold text-[11px] px-1.5 py-0 bg-slate-200/80 text-slate-700 h-5">
                                {totalRecords} Data
                            </Badge>
                        )}
                    </div>
                </div>

                {/* RIGHT QUICK CONTROLS: OBSERVER, SORT, PER PAGE & ADVANCED TOGGLE */}
                <div className="flex items-center gap-1.5 shrink-0 text-xs flex-nowrap">
                    {showObserverFilter && availableObservers.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 hidden lg:inline" />
                            <Select
                                value={selectedObserver}
                                onValueChange={handleObserverChange}
                            >
                                <SelectTrigger className="w-[125px] h-8 text-xs bg-white border-slate-200 px-2">
                                    <SelectValue placeholder="Observer" />
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-60">
                                    <SelectItem value="ALL">Semua Observer</SelectItem>
                                    {availableObservers.map((obs, idx) => (
                                        <SelectItem key={idx} value={obs}>
                                            {obs}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {showSortOrder && (
                        <div className="flex items-center gap-1">
                            <ArrowDownUp className="h-3.5 w-3.5 text-slate-400 shrink-0 hidden lg:inline" />
                            <Select
                                value={selectedSort}
                                onValueChange={handleSortChange}
                            >
                                <SelectTrigger className="w-[95px] h-8 text-xs bg-white border-slate-200 px-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="desc">Terbaru</SelectItem>
                                    <SelectItem value="asc">Terlama</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {showPerPage && (
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-medium text-slate-500 hidden xl:inline">Baris:</span>
                            <Select
                                value={String(selectedPerPage)}
                                onValueChange={(val) => handlePerPageChange(Number(val))}
                            >
                                <SelectTrigger className="w-[62px] h-8 text-xs bg-white border-slate-200 px-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <Button
                        type="button"
                        variant={isExpanded || isFiltered ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`h-8 px-2.5 text-xs font-semibold gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                            isExpanded || isFiltered
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Filter Tanggal & Jam</span>
                        {isFiltered && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                    </Button>
                </div>
            </div>

            {/* EXPANDABLE DATE & TIME FILTER DRAWER */}
            {(isExpanded || isFiltered) && (
                <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs space-y-3 transition-all animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                Rentang Tanggal & Jam
                            </span>

                            {/* TIMEZONE TOGGLE PILL INSIDE DRAWER */}
                            <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTz('UTC')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                        selectedTz === 'UTC'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                                    }`}
                                    title="Filter berdasarkan Waktu Universal (UTC+0)"
                                >
                                    <Globe className="h-3 w-3" />
                                    Zona Waktu: UTC
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTz('WIT')}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                                        selectedTz === 'WIT'
                                            ? 'bg-amber-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                                    }`}
                                    title="Filter berdasarkan Waktu Indonesia Timur (UTC+9)"
                                >
                                    <Clock className="h-3 w-3" />
                                    Zona Waktu: WIT (UTC+9)
                                </button>
                            </div>
                        </div>

                        {isFiltered && (
                            <button
                                type="button"
                                onClick={handleResetFilter}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset ke Bulan Penuh
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Tanggal Mulai */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" /> Dari Tanggal ({selectedTz})
                            </label>
                            <Input
                                type="date"
                                value={inputStartDate}
                                onChange={(e) => setInputStartDate(e.target.value)}
                                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                            />
                        </div>

                        {/* Tanggal Selesai */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-400" /> Sampai Tanggal ({selectedTz})
                            </label>
                            <Input
                                type="date"
                                value={inputEndDate}
                                onChange={(e) => setInputEndDate(e.target.value)}
                                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                            />
                        </div>

                        {/* Jam Mulai */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" /> Jam Mulai ({selectedTz})
                            </label>
                            <Input
                                type="time"
                                value={inputStartTime}
                                onChange={(e) => setInputStartTime(e.target.value)}
                                placeholder="00:00"
                                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                            />
                        </div>

                        {/* Jam Selesai */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" /> Jam Selesai ({selectedTz})
                            </label>
                            <Input
                                type="time"
                                value={inputEndTime}
                                onChange={(e) => setInputEndTime(e.target.value)}
                                placeholder="23:59"
                                className="h-8 text-xs bg-slate-50/50 border-slate-200 focus:bg-white"
                            />
                        </div>
                    </div>

                    {extraFilters && (
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
                            {extraFilters}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(false)}
                            className="h-8 text-xs text-slate-600 hover:text-slate-900"
                        >
                            Tutup
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApplyFilter()}
                            className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                        >
                            <Check className="h-3.5 w-3.5" />
                            Terapkan Filter
                        </Button>
                    </div>
                </div>
            )}

            {/* ACTIVE FILTER CHIPS / BADGES */}
            {isFiltered && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Aktif:</span>

                    {selectedTz === 'WIT' ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Zona:</span> <strong>WIT (UTC+9)</strong>
                        </Badge>
                    ) : hasCustomFilter ? (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-300 flex items-center gap-1">
                            <Globe className="h-3 w-3 text-blue-600" />
                            <span>Zona:</span> <strong>UTC</strong>
                        </Badge>
                    ) : null}

                    {(inputStartDate || inputEndDate) && (
                        <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span>Tgl: {inputStartDate || 'Awal Bulan'} s/d {inputEndDate || 'Akhir Bulan'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setInputStartDate('');
                                    setInputEndDate('');
                                    handleApplyFilter({ start_date: '', end_date: '' });
                                }}
                                className="hover:bg-slate-100 rounded-full p-0.5"
                            >
                                <X className="h-2.5 w-2.5 text-slate-500" />
                            </button>
                        </Badge>
                    )}

                    {(inputStartTime || inputEndTime) && (
                        <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Jam: {inputStartTime || '00:00'} - {inputEndTime || '23:59'} {selectedTz}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setInputStartTime('');
                                    setInputEndTime('');
                                    handleApplyFilter({ start_time: '', end_time: '' });
                                }}
                                className="hover:bg-slate-100 rounded-full p-0.5"
                            >
                                <X className="h-2.5 w-2.5 text-slate-500" />
                            </button>
                        </Badge>
                    )}

                    {selectedObserver && selectedObserver !== 'ALL' && (
                        <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300 flex items-center gap-1">
                            <Filter className="h-3 w-3 text-slate-400" />
                            <span>Observer: {selectedObserver}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedObserver('ALL');
                                    handleApplyFilter({ observer: 'ALL' });
                                }}
                                className="hover:bg-slate-100 rounded-full p-0.5"
                            >
                                <X className="h-2.5 w-2.5 text-slate-500" />
                            </button>
                        </Badge>
                    )}

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilter}
                        className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium ml-1"
                    >
                        Hapus Semua
                    </Button>
                </div>
            )}
        </div>
    );
}
