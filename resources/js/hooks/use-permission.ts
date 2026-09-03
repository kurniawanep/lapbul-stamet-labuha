import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types/auth';

export function usePermission() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth?.user;

    const isSuperAdmin = Boolean(user?.is_superadmin || user?.role === 'Super Admin');
    const effectivePermissions: string[] = user?.effective_permissions || [];

    const hasPermission = (permission?: string | string[]): boolean => {
        if (!user) return false;
        if (isSuperAdmin) return true;
        if (!permission) return true;

        if (Array.isArray(permission)) {
            return permission.some((p) => effectivePermissions.includes(p));
        }

        return effectivePermissions.includes(permission);
    };

    const hasAllPermissions = (permissions: string[]): boolean => {
        if (!user) return false;
        if (isSuperAdmin) return true;
        return permissions.every((p) => effectivePermissions.includes(p));
    };

    return {
        user,
        isSuperAdmin,
        permissions: effectivePermissions,
        hasPermission,
        can: hasPermission,
        hasAllPermissions,
    };
}
