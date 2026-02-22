import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
    LayoutDashboard,
    FileText,
    Home,
    TrendingUp,
    Receipt,
    FolderOpen,
    Users,
    Settings,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
    { name: 'İdarə Paneli', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Müqavilələr', path: '/contracts', icon: FileText },
    { name: 'Obyektlər', path: '/properties', icon: Home },
    { name: 'Mədaxil', path: '/income', icon: TrendingUp },
    { name: 'Məxaric', path: '/expenses', icon: Receipt },
    { name: 'Sənədlər', path: '/documents', icon: FolderOpen },
    { name: '✦ Sənəd Ustası', path: '/sanad-ustasi', icon: Sparkles, isSpecial: true },
    { name: 'İstifadəçilər', path: '/users', icon: Users },
    { name: 'Parametrlər', path: '/settings', icon: Settings },
];

export function Sidebar() {
    const { user } = useAuthStore();

    const navItems = React.useMemo(() => {
        if (user?.role === 'STAFF') {
            return allNavItems.filter(
                (item) => !['Məxaric', 'İstifadəçilər', 'Parametrlər'].includes(item.name)
            );
        }
        // OWNER sees everything, TENANT might have a completely different view later if supported
        return allNavItems;
    }, [user?.role]);

    return (
        <aside className="flex h-screen w-60 flex-col border-r border-border bg-surface shrink-0 hidden md:flex">
            <div className="flex h-16 items-center px-6">
                <h1 className="text-2xl font-extrabold font-heading text-gold">
                    İcarə <span className="text-white font-light">Pro</span>
                </h1>
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
    );
}
