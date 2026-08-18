import React from 'react';

interface BmkgLogoProps {
    className?: string;
    iconOnly?: boolean;
    subtitle?: string;
    lightMode?: boolean;
}

export default function BmkgLogo({
    className = 'h-10',
    iconOnly = false,
    subtitle = 'Stasiun Meteorologi Oesman Sadik',
    lightMode = true
}: BmkgLogoProps) {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            {/* BMKG Logo Image from public/img/logo.jpg */}
            <div className="relative flex items-center justify-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-md border border-slate-200/80 overflow-hidden flex items-center justify-center">
                    <img
                        src="/img/logo.jpg"
                        alt="Logo BMKG"
                        className="w-full h-full object-contain rounded-lg"
                    />
                </div>
            </div>

            {!iconOnly && (
                <div className="flex flex-col text-left">
                    <span className={`font-extrabold tracking-wider text-base uppercase leading-none ${
                        lightMode ? 'text-blue-900' : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 bg-clip-text text-transparent'
                    }`}>
                        BMKG
                    </span>
                    <span className={`text-[10px] font-semibold tracking-tight leading-tight mt-0.5 ${
                        lightMode ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                        {subtitle}
                    </span>
                </div>
            )}
        </div>
    );
}
