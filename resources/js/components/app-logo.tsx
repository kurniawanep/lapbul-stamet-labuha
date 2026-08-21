import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white p-0.5 shadow-xs border border-sidebar-border/60 shrink-0 overflow-hidden">
                <AppLogoIcon className="size-full object-contain rounded-sm" />
            </div>
            <div className="ml-1.5 grid flex-1 text-left leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold text-xs text-sidebar-foreground">
                    Stasiun Meteorologi
                </span>
                <span className="truncate text-[10px] text-sidebar-foreground/70 font-medium">
                    Oesman Sadik
                </span>
            </div>
        </>
    );
}

