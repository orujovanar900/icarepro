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
    Building2,
    ShieldCheck,
    CreditCard,
    Store,
    Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
    // OWNER/MANAGER items
    { name: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'İdarə Paneli' },
    { name: 'contracts', path: '/contracts', icon: FileText, label: 'Müqavilələr' },
    { name: 'properties', path: '/properties', icon: Home, label: 'Obyektlər' },
    { name: 'tenants', path: '/tenants', icon: UserCheck, label: 'İcarəçilər' },
    { name: 'income', path: '/income', icon: TrendingUp, label: 'Mədaxil' },
    { name: 'expenses', path: '/expenses', icon: Receipt, label: 'Məxaric' },
    { name: 'sanad', path: '/sanad-ustasi', icon: Sparkles, label: '✦ Sənəd Ustası AI', isSpecial: true },
    { name: 'users', path: '/users', icon: Users, label: 'İstifadəçilər' },
    { name: 'settings', path: '/settings', icon: Settings, label: 'Parametrlər' },
    { name: 'billing', path: '/settings/billing', icon: CreditCard, label: 'Abonəlik Planı' },
    { name: 'listings', path: '/dashboard/elanlar', icon: Store, label: 'Elanlarım' },
    // SUPERADMIN items
    { name: 'admin-dashboard', path: '/admin', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
    { name: 'admin-orgs', path: '/admin/users', icon: Building2, label: 'Təşkilatlar', adminOnly: true },
    { name: 'admin-users', path: '/users', icon: Users, label: 'İstifadəçilər', adminOnly: true },
    { name: 'admin-settings', path: '/settings', icon: Settings, label: 'Sistem Parametrləri', adminOnly: true },
    { name: 'admin-listings', path: '/admin/elanlar', icon: Megaphone, label: 'Elanlar', adminOnly: true },
];

export function Sidebar({ isMobileOpen = false, onClose }: { isMobileOpen?: boolean; onClose?: () => void }) {
    const { user } = useAuthStore();

    const navItems = React.useMemo(() => {
        const role = user?.role || 'TENANT';

        if (role === 'SUPERADMIN') {
            return allNavItems.filter(item => item.adminOnly);
        }

        const allowedByRole: Record<string, string[]> = {
            OWNER:    ['dashboard', 'contracts', 'properties', 'tenants', 'income', 'expenses', 'sanad', 'users', 'settings', 'billing', 'listings'],
            AGENT:    ['dashboard', 'contracts', 'properties', 'tenants', 'income', 'expenses', 'sanad', 'listings'],
            AGENTLIK: ['dashboard', 'contracts', 'properties', 'tenants', 'income', 'expenses', 'sanad', 'users', 'settings', 'listings'],
            MANAGER:  ['dashboard', 'contracts', 'properties', 'tenants', 'income', 'expenses', 'sanad', 'users', 'settings', 'listings'],
            CASHIER:  ['dashboard', 'income', 'expenses'],
            ACCOUNTANT:    ['dashboard', 'contracts', 'properties', 'tenants', 'sanad'],
            ADMINISTRATOR: ['dashboard', 'contracts', 'properties', 'tenants', 'sanad'],
            ICARECI: [],
            TENANT:  [],
        };

        const allowed = allowedByRole[role] || [];
        return allNavItems.filter(item => !item.adminOnly && allowed.includes(item.name));
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
                            <span className="text-[#1A1D2E] dark:text-white font-normal">Pro</span>
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
                            key={item.path + item.name}
                            to={item.path}
                            end={item.path === '/admin'}
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
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 flex justify-center border-t border-border">
                    <span className="text-[11px] text-muted opacity-60 font-mono">
                        v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
                    </span>
                </div>
            </aside>
        </>
    );
}
