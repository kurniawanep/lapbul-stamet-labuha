import { Link } from '@inertiajs/react';
import {
    Briefcase,
    Calendar,
    CloudRain,
    CloudSun,
    Droplets,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Gauge,
    KeyRound,
    LayoutGrid,
    MessageSquare,
    Plane,
    Radio,
    Settings,
    Share2,
    ShieldCheck,
    Sun,
    Thermometer,
    TrendingUp,
    User,
    Users,
    Wind,
    Wrench,
    Zap,
} from 'lucide-react';
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
import { usePermission } from '@/hooks/use-permission';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const allNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Monitoring Performa',
        href: '/monitoring',
        icon: TrendingUp,
        permission: 'monitoring.view',
    },
    {
        title: 'Pegawai',
        href: '/pegawai',
        icon: Users,
        permission: 'pegawai.view',
    },
    {
        title: 'Jadwal Dinas',
        href: '/jadwal/operasional',
        icon: Calendar,
        permission: 'jadwal.view',
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
        permission: 'laporan.view',
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
            {
                title: 'Data Flight',
                href: '/laporan/flight',
                icon: Plane,
            },
            {
                title: 'Produk Bulanan',
                href: '/laporan/produk-bulanan',
                icon: FileSpreadsheet,
            },
            {
                title: 'SIMPAN-MKG (Diseminasi)',
                href: '/laporan/simpan-mkg',
                icon: Share2,
            },
        ],
    },
    {
        title: 'WhatsApp Gateway',
        href: '/pengaturan/whatsapp',
        icon: Radio,
        permission: 'whatsapp.manage',
    },
    {
        title: 'Hak Akses',
        href: '/admin/hak-akses',
        icon: ShieldCheck,
        superadminOnly: true,
    },
    {
        title: 'Setting',
        href: editProfile(),
        icon: Settings,
        items: [
            {
                title: 'Profil',
                href: editProfile(),
                icon: User,
            },
            {
                title: 'Ganti Password',
                href: editSecurity(),
                icon: KeyRound,
            },
        ],
    },
];

export function AppSidebar() {
    const { hasPermission, isSuperAdmin } = usePermission();

    const filteredNavItems = allNavItems.filter((item) => {
        if (item.superadminOnly && !isSuperAdmin) {
            return false;
        }

        if (item.permission && !hasPermission(item.permission)) {
            return false;
        }

        return true;
    });

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
                <NavMain items={filteredNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
