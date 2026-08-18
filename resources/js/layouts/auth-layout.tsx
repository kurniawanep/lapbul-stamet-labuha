import React from 'react';
import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';

export default function AuthLayout({
    title = '',
    description = '',
    children,
}: {
    title?: string;
    description?: string;
    children: React.ReactNode;
}) {
    // Extract title and description from page component's static layout property if available
    const pageLayout = (children as { type?: { layout?: { title?: string; description?: string } } })?.type?.layout;
    const finalTitle = title || pageLayout?.title || 'Masuk ke Akun Pegawai';
    const finalDescription = description || pageLayout?.description || 'Silakan masukkan email dan kata sandi Anda untuk mengakses sistem LAPBUL BMKG';

    return (
        <AuthLayoutTemplate title={finalTitle} description={finalDescription}>
            {children}
        </AuthLayoutTemplate>
    );
}
