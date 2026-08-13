import React from 'react';
import AppLayout from '@/layouts/app-layout';
import Index from './Index';

export default function TeknisiPage(props: any) {
    return <Index {...props} />;
}

TeknisiPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Jadwal Dinas', href: '/jadwal/operasional' },
            { title: 'Jadwal Dinas Teknisi', href: '/jadwal/teknisi' },
        ]}
    >
        {page}
    </AppLayout>
);
