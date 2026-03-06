import * as React from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LogOut, User as UserIcon, Menu, Bell, AlertCircle, AlertTriangle, Clock, CheckCircle, Sun, Moon } from 'lucide-react';
import { Button } from './Button';
import { translateRole } from '@/utils/roles';

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

const AVATAR_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#0891B2", "#7C3AED", "#BE185D"];

export function getInitials(name: string | undefined | null): string {
    const safeName = name ?? '';
    const words = safeName.trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return 'U';
    if (words.length === 1) return (words[0]?.substring(0, 2) ?? 'U').toUpperCase();
    return ((words[0]?.[0] ?? '') + (words[words.length - 1]?.[0] ?? '')).toUpperCase();
}

export function getAvatarColor(name: string | undefined | null): string {
    const safeName = name ?? '';
    if (!safeName) return AVATAR_COLORS[0] ?? '#7C3AED';
    let hash = 0;
    for (let i = 0; i < safeName.length; i++) {
        hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index] ?? '#7C3AED';
}

import { useLocation, useNavigate, Link } from 'react-router-dom';

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    // Notifications State
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);

    // Theme toggle
    const [isDark, setIsDark] = React.useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return true; // default dark
    });
    React.useEffect(() => {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        html.classList.add(isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

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
        'admin': 'Superadmin Paneli',
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
                        İcarə <span className="text-[#1A1D2E] dark:text-white font-light">Pro</span>
                    </Link>
                    <span className="text-[10px] text-gold/70 italic leading-none">"Mülkünüzü ağıllı idarə edin"</span>
                </div>
            </div>

            {/* Desktop Page Title */}
            <h2 className="hidden md:block text-xl font-semibold font-heading text-text">
                {pageTitle}
            </h2>

            <div className="flex items-center gap-3 md:gap-4">
                {/* iOS Style Theme Toggle */}
                <button
                    onClick={() => setIsDark(d => !d)}
                    className="relative flex items-center justify-center p-1"
                    title={isDark ? 'Aydınlıq rejim' : 'Tünd rejim'}
                >
                    <Sun className="h-4 w-4 text-muted mr-1.5" />
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'bg-[#C9A84C]' : 'bg-[#E5E7EB]'}`}>
                        <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                    </div>
                    <Moon className="h-4 w-4 text-muted ml-1.5" />
                </button>
                <div className="relative ml-2">
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
                    className="flex items-center gap-3 hover:bg-surface-hover p-1.5 pr-3 rounded-xl transition-colors"
                >
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm shadow-sm"
                        style={{ backgroundColor: getAvatarColor(user?.name || '') }}
                    >
                        {getInitials(user?.name || '')}
                    </div>
                    <div className="hidden md:flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold text-text leading-none">
                            {user?.name}
                        </span>
                        {user?.role === 'SUPERADMIN' ? (
                            <span className="bg-gold px-2 py-0.5 rounded-full text-[10px] font-medium text-white uppercase leading-none mt-0.5" style={{ letterSpacing: '0.02em' }}>
                                Super Admin
                            </span>
                        ) : (
                            <span className="text-[11px] text-muted leading-none">
                                {translateRole(user?.role)}
                            </span>
                        )}
                    </div>
                </button>

                <div className="hidden md:block h-8 w-px bg-border mx-1" />

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
