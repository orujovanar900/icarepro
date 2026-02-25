import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import {
    Settings as SettingsIcon, User, Building, Lock, MessageCircle, Mail, Phone, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

// Session timeout: warn at 25min, logout at 30min
const WARN_IDLE_MS = 25 * 60 * 1000;
const LOGOUT_IDLE_MS = 30 * 60 * 1000;

function useSessionTimeout(onWarn: () => void, onLogout: () => void) {
    const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reset = () => {
        if (warnTimer.current) clearTimeout(warnTimer.current);
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        warnTimer.current = setTimeout(onWarn, WARN_IDLE_MS);
        logoutTimer.current = setTimeout(onLogout, LOGOUT_IDLE_MS);
    };

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();
        return () => {
            events.forEach(e => window.removeEventListener(e, reset));
            if (warnTimer.current) clearTimeout(warnTimer.current);
            if (logoutTimer.current) clearTimeout(logoutTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

export function Settings() {
    const navigate = useNavigate();
    const { user, setUser, logout } = useAuthStore();
    const addToast = useToastStore((state) => state.addToast);

    // ── Profile ──────────────────────────────────────────────
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState((user as any)?.phone || '');
    const [telegramChatId, setTelegramChatId] = useState((user as any)?.telegramChatId || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // ── Change Password ───────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // ── Change Email ──────────────────────────────────────────
    const [emailPassword, setEmailPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

    // ── Session timeout ───────────────────────────────────────
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const handleSessionLogout = () => {
        logout();
        navigate('/login');
    };
    useSessionTimeout(
        () => setShowSessionWarning(true),
        handleSessionLogout,
    );

    // ── Handlers ──────────────────────────────────────────────
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsUpdatingProfile(true);
        try {
            const res = await api.patch(`/users/${user.id}`, { name, phone, telegramChatId });
            setUser(res.data.data);
            addToast({ message: 'Profil uğurla yeniləndi', type: 'success' });
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast({ message: 'Şifrələr uyğun gəlmir', type: 'error' });
            return;
        }
        if (newPassword.length < 8) {
            addToast({ message: 'Şifrə ən azı 8 simvol olmalıdır', type: 'error' });
            return;
        }
        setIsUpdatingPassword(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            addToast({ message: 'Şifrə yeniləndi. Yenidən daxil olun.', type: 'success' });
            logout();
            navigate('/login');
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingEmail(true);
        try {
            await api.post('/auth/change-email', { currentPassword: emailPassword, newEmail });
            addToast({ message: 'Email yeniləndi. Yenidən daxil olun.', type: 'success' });
            logout();
            navigate('/login');
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingEmail(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <SettingsIcon className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-extrabold font-heading text-text">Tənzimləmələr</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── Profile ── */}
                <Card variant="elevated" className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gold" /> Profil Məlumatları
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                            <Input
                                label="Ad Soyad"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-text flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Əlaqə Nömrəsi
                                </label>
                                <Input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+994 50 000 00 00"
                                />
                            </div>
                            <Input
                                label="Email (dəyişmək üçün aşağıdakı bölməyə baxın)"
                                value={user?.email || ''}
                                disabled
                            />
                            <Button
                                type="submit"
                                disabled={isUpdatingProfile || (name === user?.name && phone === ((user as any)?.phone || '') && telegramChatId === ((user as any)?.telegramChatId || ''))}
                            >
                                {isUpdatingProfile ? 'Yenilənir...' : 'Yadda Saxla'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Change Password ── */}
                <Card variant="default">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-gold" /> Şifrəni Yenilə
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <Input
                                label="Mövcud Şifrə"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Yeni Şifrə"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Şifrənin Təkrarı"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <Button
                                type="submit"
                                variant="danger"
                                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                            >
                                {isUpdatingPassword ? 'Yenilənir...' : 'Şifrəni Dəyiş'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Change Email ── */}
                {user?.role === 'OWNER' && (
                    <Card variant="default">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-gold" /> Email Dəyiş
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdateEmail} className="space-y-4">
                                <Input
                                    label="Yeni Email"
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Mövcud Şifrə (Təsdiq üçün)"
                                    type="password"
                                    value={emailPassword}
                                    onChange={(e) => setEmailPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={isUpdatingEmail || !newEmail || !emailPassword}
                                >
                                    {isUpdatingEmail ? 'Yenilənir...' : 'Emaili Dəyiş'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* ── Telegram ── */}
                <Card variant="default" className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-[#2AABEE]" /> Telegram Bildirişləri
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                            <div className="bg-[#131F30] border border-[#192840] rounded-lg p-4 text-sm text-[#E8F0FE]">
                                1. Telegram-da <b>@IcareProBot</b> səhifəsini tapın.<br />
                                2. Bota <code className="text-[#C9A84C]">/start</code> yazın.<br />
                                3. Bot sizə Chat ID-nizi göndərəcək.<br />
                                4. Həmin ID-ni daxil edib yadda saxlayın.
                            </div>
                            <Input
                                label="Telegram Chat ID"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="Məsələn: 123456789"
                            />
                            <Button type="submit" disabled={isUpdatingProfile || telegramChatId === ((user as any)?.telegramChatId || '')}>
                                {isUpdatingProfile ? 'Yenilənir...' : 'Yadda Saxla'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Org Info (OWNER only) ── */}
                {user?.role === 'OWNER' && (
                    <Card variant="default" className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-gold" /> Təşkilat Məlumatı
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-w-md">
                                <Input
                                    label="Təşkilat İD"
                                    value={(user as any)?.organizationId || ''}
                                    disabled
                                />
                                <p className="text-sm text-muted">
                                    Təşkilatın adını dəyişmək üçün dəstək ilə əlaqə saxlayın.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── Session timeout warning modal ── */}
            <Modal isOpen={showSessionWarning} onClose={() => setShowSessionWarning(false)} title="">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-orange" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text">Sessiya bitmək üzrədir</h3>
                        <p className="text-sm text-muted mt-1">
                            5 dəqiqə ərzində fəaliyyət olmasa sistem avtomatik çıxacaq.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" className="flex-1" onClick={handleSessionLogout}>Çıx</Button>
                        <Button className="flex-1" onClick={() => setShowSessionWarning(false)}>Sessiyanı Uzat</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
