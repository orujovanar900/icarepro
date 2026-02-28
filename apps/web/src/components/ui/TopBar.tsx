import * as React from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LogOut, User as UserIcon, Menu, Bell } from 'lucide-react';
import { Button } from './Button';
import { useLocation, useNavigate } from 'react-router-dom';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Notifications State
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);

    const { data: notifData } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data;
        },
        refetchInterval: 60000 // refresh every minute automatically
    });

    const notifications = Array.isArray(notifData?.data) ? notifData.data : [];
    const unreadCount = notifications.length;

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
        'profile': 'Profil',
    };

    const pathBase = location.pathname.split('/')[1] || 'dashboard';
    const pageTitle = routeTitles[pathBase] || 'Səhifə';

    return (
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6 shrink-0">
            {/* Mobile Logo & Menu Toggle */}
            <div className="md:hidden flex h-16 items-center gap-3">
                <button onClick={onMenuClick} className="p-2 text-muted hover:text-text">
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-extrabold font-heading text-gold">
                    İcarə <span className="text-white font-light">Pro</span>
                </h1>
            </div>

            {/* Desktop Page Title */}
            <h2 className="hidden md:block text-xl font-semibold font-heading text-text">
                {pageTitle}
            </h2>

            <div className="flex items-center gap-3 md:gap-4">
                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="relative p-2 text-muted hover:text-text focus:outline-none"
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red ring-2 ring-surface"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {isNotifOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsNotifOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-80 md:w-96 origin-top-right rounded-lg bg-surface shadow-2xl ring-1 ring-border border border-border z-50">
                                <div className="p-4 border-b border-border flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-text">Bildirişlər</h3>
                                    <span className="text-xs bg-gold/20 text-gold px-2 py-1 rounded-full">{unreadCount} bildiriş</span>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted">Aktiv bildiriş yoxdur</div>
                                    ) : (
                                        notifications.map((n: any) => (
                                            <div key={n.id} className="p-4 border-b border-border/50 hover:bg-bg/50 transition-colors">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={`text-sm font-medium ${n.type === 'PAYMENT_OVERDUE' ? 'text-red' : n.type === 'PAYMENT_DUE' ? 'text-orange' : 'text-gold'}`}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-xs text-muted whitespace-nowrap">
                                                        {new Date(n.date).toLocaleDateString('az-AZ')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted mt-1 leading-relaxed">{n.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 hover:bg-surface-hover p-1.5 rounded-lg transition-colors"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold overflow-hidden">
                        {(user as any)?.avatarUrl ? (
                            <img src={(user as any).avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                            user?.name?.charAt(0) || <UserIcon className="h-4 w-4" />
                        )}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline-block">
                        {user?.name}
                    </span>
                    <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted md:ml-2">
                        {user?.role}
                    </span>
                </button>

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
