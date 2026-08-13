import React from 'react';
import AppLayout from '@/layouts/app-layout';
import Index from './Index';

export default function PPNPNPage(props: any) {
    return <Index {...props} />;
}

PPNPNPage.layout = (page: React.ReactNode) => (
    <AppLayout
        breadcrumbs={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Jadwal Dinas', href: '/jadwal/operasional' },
            { title: 'Jadwal Dinas PPNPN', href: '/jadwal/ppnpn' },
        ]}
    >
        {page}
    </AppLayout>
);
