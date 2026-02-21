import * as React from 'react';
import { useAuthStore } from '@/store/auth';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from './Button';
import { useLocation } from 'react-router-dom';

export function TopBar() {
    const { user, logout } = useAuthStore();
    const location = useLocation();

    // Simple title generator based on path
    const pageTitle = React.useMemo(() => {
        const path = location.pathname.split('/')[1];
        if (!path) return 'Dashboard';
        return path.charAt(0).toUpperCase() + path.slice(1);
    }, [location.pathname]);

    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 shrink-0">
            <h2 className="text-xl font-semibold font-heading text-text">{pageTitle}</h2>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold">
                        {user?.firstName?.charAt(0) || <UserIcon className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline-block">
                        {user?.firstName} {user?.lastName}
                    </span>
                    <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted ml-2">
                        {user?.role}
                    </span>
                </div>

                <div className="h-6 w-px bg-border" />

                <Button variant="ghost" size="sm" onClick={logout} className="text-muted hover:text-red">
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıxış
                </Button>
            </div>
        </header>
    );
}
