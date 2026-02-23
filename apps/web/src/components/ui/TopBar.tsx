import * as React from 'react';
import { useAuthStore } from '@/store/auth';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from './Button';
import { useLocation } from 'react-router-dom';

export function TopBar() {
    const { user, logout } = useAuthStore();
    const location = useLocation();

    // Mapping English route bases to Azerbaijani titles
    const routeTitles: Record<string, string> = {
        'dashboard': 'İdarə Paneli',
        'contracts': 'Müqavilələr',
        'properties': 'Obyektlər',
        'income': 'Mədaxil',
        'expenses': 'Məxaric',
        'documents': 'Sənədlər',
        'sanad-ustasi': 'Sənəd Ustası',
        'users': 'İstifadəçilər',
        'settings': 'Parametrlər',
    };

    const pathBase = location.pathname.split('/')[1] || 'dashboard';
    const pageTitle = routeTitles[pathBase] || 'Səhifə';

    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6 shrink-0">
            {/* Mobile Logo */}
            <div className="md:hidden flex h-16 items-center">
                <h1 className="text-xl font-extrabold font-heading text-gold">
                    İcarə <span className="text-white font-light">Pro</span>
                </h1>
            </div>

            {/* Desktop Page Title */}
            <h2 className="hidden md:block text-xl font-semibold font-heading text-text">
                {pageTitle}
            </h2>

            <div className="flex items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold">
                        {user?.name?.charAt(0) || <UserIcon className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline-block">
                        {user?.name}
                    </span>
                    <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted md:ml-2">
                        {user?.role}
                    </span>
                </div>

                <div className="hidden md:block h-6 w-px bg-border" />

                <Button variant="ghost" size="sm" onClick={logout} className="hidden md:flex text-muted hover:text-red">
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıxış
                </Button>
                {/* Mobile logout icon instead of full button */}
                <button onClick={logout} className="md:hidden p-2 text-muted hover:text-red">
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </header>
    );
}
