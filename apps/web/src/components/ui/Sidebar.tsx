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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Contracts', path: '/contracts', icon: FileText },
    { name: 'Properties', path: '/properties', icon: Home },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Documents', path: '/documents', icon: FolderOpen },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
];

export function Sidebar() {
    const { user } = useAuthStore();

    const navItems = React.useMemo(() => {
        if (user?.role === 'STAFF') {
            return allNavItems.filter(
                (item) => !['Expenses', 'Users', 'Settings'].includes(item.name)
            );
        }
        // OWNER sees everything, TENANT might have a completely different view later if supported
        return allNavItems;
    }, [user?.role]);

    return (
        <aside className="flex h-screen w-60 flex-col border-r border-border bg-surface shrink-0 hidden md:flex">
            <div className="flex h-16 items-center px-6">
                <h1 className="text-2xl font-bold font-heading text-gold">İcarə Pro</h1>
            </div>
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                isActive
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
                                        isActive ? 'text-gold' : 'text-muted group-hover:text-text'
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
