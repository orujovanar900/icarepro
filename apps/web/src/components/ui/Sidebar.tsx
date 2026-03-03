import * as React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
    LayoutDashboard,
    FileText,
    Home,
    TrendingUp,
    Receipt,
    FolderOpen,
    Users,
    UserCheck,
    Settings,
    Sparkles,
    X,
    BarChart4,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
    { name: 'İdarə Paneli', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Müqavilələr', path: '/contracts', icon: FileText },
    { name: 'Obyektlər', path: '/properties', icon: Home },
    { name: 'İcarəçilər', path: '/tenants', icon: UserCheck },
    { name: 'Mədaxil', path: '/income', icon: TrendingUp },
    { name: 'Məxaric', path: '/expenses', icon: Receipt },
    { name: 'Sənədlər', path: '/documents', icon: FolderOpen },
    { name: '✦ Sənəd Ustası AI', path: '/sanad-ustasi', icon: Sparkles, isSpecial: true },
    { name: 'İstifadəçilər', path: '/users', icon: Users },
    { name: 'Parametrlər', path: '/settings', icon: Settings },
    { name: 'Ümumi Statistika', path: '/admin/stats', icon: BarChart4 },
    { name: 'Təşkilatlar', path: '/admin/users', icon: ShieldCheck },
];

export function Sidebar({ isMobileOpen = false, onClose }: { isMobileOpen?: boolean; onClose?: () => void }) {
    const { user } = useAuthStore();

    const navItems = React.useMemo(() => {
        const allowedMenu = {
            SUPERADMIN: ['Ümumi Statistika', 'Təşkilatlar', 'Parametrlər'],
            OWNER: ['İdarə Paneli', 'Müqavilələr', 'Obyektlər', 'İcarəçilər', 'Mədaxil', 'Məxaric', 'Sənədlər', '✦ Sənəd Ustası AI', 'İstifadəçilər', 'Parametrlər'],
            MANAGER: ['İdarə Paneli', 'Müqavilələr', 'Obyektlər', 'İcarəçilər', 'Mədaxil', 'Məxaric', 'Sənədlər', '✦ Sənəd Ustası AI', 'İstifadəçilər', 'Parametrlər'],
            CASHIER: ['İdarə Paneli', 'Mədaxil', 'Məxaric'],
            ACCOUNTANT: ['İdarə Paneli', 'Müqavilələr', 'Obyektlər', 'İcarəçilər', 'Sənədlər', '✦ Sənəd Ustası AI'],
            ADMINISTRATOR: ['İdarə Paneli', 'Müqavilələr', 'Obyektlər', 'İcarəçilər', 'Sənədlər', '✦ Sənəd Ustası AI'],
            TENANT: [],
        };

        const role = user?.role || 'TENANT';
        const allowed = allowedMenu[role as keyof typeof allowedMenu] || [];

        return allNavItems.filter(item => (allowed as string[]).includes(item.name));
    }, [user?.role]);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:w-60 md:shadow-none",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-[72px] items-center justify-between px-6">
                    <div className="flex flex-col justify-center">
                        <Link to="/" className="text-3xl font-heading tracking-tight flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                            <span className="text-gold font-extrabold">İcarə</span>
                            <span className="text-white font-normal">Pro</span>
                        </Link>
                        <span className="text-[11px] text-gold/70 italic mt-0.5">"Mülkünüzü ağıllı idarə edin"</span>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="md:hidden p-2 text-muted hover:text-text -mr-2">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                cn(
                                    'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    item.isSpecial
                                        ? 'bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/20 shadow-sm mt-2 mb-2'
                                        : isActive
                                            ? 'bg-gold/10 text-gold'
                                            : 'text-muted hover:bg-surface/50 hover:text-text'
                                )
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon
                                        className={cn(
                                            'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                                            item.isSpecial
                                                ? 'text-[#C9A84C]'
                                                : isActive ? 'text-gold' : 'text-muted group-hover:text-text'
                                        )}
                                    />
                                    {item.name}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
}
