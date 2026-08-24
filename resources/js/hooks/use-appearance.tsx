export type ResolvedAppearance = 'light';
export type Appearance = 'light';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const applyTheme = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem('appearance', 'light');
    applyTheme();
}

export function useAppearance(): UseAppearanceReturn {
    const updateAppearance = (_mode: Appearance): void => {
        applyTheme();
    };

    return { appearance: 'light', resolvedAppearance: 'light', updateAppearance } as const;
}
