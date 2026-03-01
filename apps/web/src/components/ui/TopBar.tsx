import * as React from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LogOut, User as UserIcon, Menu, Bell, AlertCircle, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from './Button';

function timeAgo(dateInput: Date | string) {
    const diff = new Date(dateInput).getTime() - Date.now();
    if (diff < 0) {
        const days = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Bu gün';
        return `${days} gün sonra`; // wait overdue is in the past! So `diff < 0` means PAST. So "gün əvvəl".
    } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Bu gün';
        return `${days} gün sonra`;
    }
}

import { useLocation, useNavigate, Link } from 'react-router-dom';

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

    const [readNotificationIds, setReadNotificationIds] = React.useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('readNotifications') || '[]');
        } catch {
            return [];
        }
    });

    const markAsRead = (id: string) => {
        if (!readNotificationIds.includes(id)) {
            const updated = [...readNotificationIds, id];
            setReadNotificationIds(updated);
            localStorage.setItem('readNotifications', JSON.stringify(updated));
        }
    };

    const markAllAsRead = () => {
        const allIds = notifications.map((n: any) => n.id);
        const updated = Array.from(new Set([...readNotificationIds, ...allIds]));
        setReadNotificationIds(updated);
        localStorage.setItem('readNotifications', JSON.stringify(updated));
    };

    const unreadCount = notifications.filter((n: any) => !readNotificationIds.includes(n.id)).length;

    // Mapping English route bases to Azerbaijani titles
    const routeTitles: Record<string, string> = {
        'dashboard': 'İdarə Paneli',
        'contracts': 'Müqavilələr',
        'properties': 'Obyektlər',
        'tenants': 'İcarəçilər',
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
                <div className="flex flex-col justify-center mt-1">
                    <Link to="/" className="text-xl font-extrabold font-heading text-gold hover:opacity-80 transition-opacity leading-tight">
                        İcarə <span className="text-white font-light">Pro</span>
                    </Link>
                    <span className="text-[10px] text-gold/70 italic leading-none">"Mülkünüzü ağıllı idarə edin"</span>
                </div>
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
                            <div className="absolute right-0 mt-2 w-80 md:w-96 origin-top-right rounded-lg bg-surface shadow-2xl ring-1 ring-border border border-border z-50 overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                                <div className="p-4 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10 shrink-0">
                                    <h3 className="text-sm font-semibold text-text">Bildirişlər</h3>
                                    <div className="flex items-center gap-3">
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-xs text-gold hover:text-gold2 flex items-center gap-1 transition-colors">
                                                <CheckCircle className="w-3.5 h-3.5" /> Hamısını oxunmuş say
                                            </button>
                                        )}
                                        <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-medium">{unreadCount}</span>
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 custom-scrollbar pb-2">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center flex flex-col items-center text-muted">
                                            <Bell className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="text-sm">Heç bir bildiriş yoxdur</p>
                                        </div>
                                    ) : (
                                        notifications.map((n: any) => {
                                            const isRead = readNotificationIds.includes(n.id);
                                            const Icon = n.type === 'PAYMENT_OVERDUE' ? AlertCircle :
                                                n.type === 'PAYMENT_DUE' ? Bell : AlertTriangle;
                                            const iconColor = n.type === 'PAYMENT_OVERDUE' ? 'text-red' :
                                                n.type === 'PAYMENT_DUE' ? 'text-orange' : 'text-gold';
                                            return (
                                                <div
                                                    key={n.id}
                                                    className={`p-4 border-b border-border/50 hover:bg-surface-hover transition-colors cursor-pointer flex gap-3 ${!isRead ? 'bg-surface/40' : ''}`}
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        setIsNotifOpen(false);
                                                        if (n.metadata?.contractId) {
                                                            navigate(`/contracts/${n.metadata.contractId}`);
                                                        }
                                                    }}
                                                >
                                                    <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className={`text-sm font-bold text-text truncate ${!isRead ? 'opacity-100' : 'opacity-80'}`}>
                                                                {n.title}
                                                            </p>
                                                            {!isRead && <span className="w-2 h-2 rounded-full bg-gold shrink-0 mt-1" />}
                                                        </div>
                                                        <p className={`text-sm leading-relaxed mb-2 ${!isRead ? 'text-text/90' : 'text-muted'}`}>{n.message}</p>
                                                        <div className="flex items-center text-xs text-muted font-medium">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {timeAgo(n.date)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
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
