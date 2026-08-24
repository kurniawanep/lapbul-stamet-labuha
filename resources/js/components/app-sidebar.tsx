import { Link } from '@inertiajs/react';
import { Briefcase, Calendar, CloudRain, CloudSun, Droplets, Eye, FileCheck, FileText, Gauge, LayoutGrid, MessageSquare, Radio, ShieldCheck, Sun, Thermometer, TrendingUp, Users, Wind, Wrench, Zap } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Monitoring Performa',
        href: '/monitoring',
        icon: TrendingUp,
    },
    {
        title: 'Pegawai',
        href: '/pegawai',
        icon: Users,
    },
    {
        title: 'Jadwal Dinas',
        href: '/jadwal/operasional',
        icon: Calendar,
        items: [
            {
                title: 'Operasional & TU',
                href: '/jadwal/operasional',
                icon: Calendar,
            },
            {
                title: 'Teknisi',
                href: '/jadwal/teknisi',
                icon: Wrench,
            },
            {
                title: 'Jadwal Dinas PPNPN',
                href: '/jadwal/ppnpn',
                icon: Briefcase,
            },
        ],
    },
    {
        title: 'Laporan Bulanan',
        href: '/laporan/pibal',
        icon: FileText,
        items: [
            {
                title: 'Data PIBAL',
                href: '/laporan/pibal',
                icon: Wind,
            },
            {
                title: 'Data TAFOR',
                href: '/laporan/tafor',
                icon: CloudRain,
            },
            {
                title: 'Data METAR',
                href: '/laporan/metar',
                icon: Gauge,
            },
            {
                title: 'Data Sinoptik',
                href: '/laporan/sinoptik',
                icon: Sun,
            },
            {
                title: 'Data FKLIM',
                href: '/laporan/fklim',
                icon: Thermometer,
            },
            {
                title: 'Data Perawanan',
                href: '/laporan/perawanan',
                icon: CloudSun,
            },
            {
                title: 'Data Penguapan',
                href: '/laporan/penguapan',
                icon: Droplets,
            },
            {
                title: 'Thunderstorm',
                href: '/laporan/thunderstorm',
                icon: Zap,
            },
            {
                title: 'MET REPORT (QAM)',
                href: '/laporan/met-report',
                icon: MessageSquare,
            },
            {
                title: 'Flight Document',
                href: '/laporan/flight-document',
                icon: FileCheck,
            },
        ],
    },
    {
        title: 'WhatsApp Gateway',
        href: '/pengaturan/whatsapp',
        icon: Radio,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
