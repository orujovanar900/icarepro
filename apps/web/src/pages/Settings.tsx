import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import {
    Settings as SettingsIcon, User, Building, Lock, MessageCircle, Mail, Phone, Clock, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

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
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // ── Change Password ───────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // ── Tax Profile (Organization) ────────────────────────────
    const org = (user as any)?.organization;
    const [ownerType, setOwnerType] = useState<string | null>(org?.ownerType || null);
    const [activityLocation, setActivityLocation] = useState<string | null>(org?.activityLocation || null);
    const [taxVoen, setTaxVoen] = useState<string>(org?.taxVoen || '');
    const [isVatPayer, setIsVatPayer] = useState<boolean>(org?.isVatPayer || false);
    const [isUpdatingTax, setIsUpdatingTax] = useState(false);
    const [isEditingTax, setIsEditingTax] = useState(false);

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
            const res = await api.patch(`/users/${user.id}`, { name, phone });
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

    const handleUpdateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (ownerType === 'HUQUQI_SEXS' && (taxVoen.length !== 10 || !/^\d+$/.test(taxVoen))) {
            addToast({ message: 'VÖEN 10 rəqəmdən ibarət olmalıdır', type: 'error' });
            return;
        }

        setIsUpdatingTax(true);
        try {
            const payload = {
                ownerType,
                activityLocation: ownerType === 'FERDI_SAHIBKAR' ? activityLocation : null,
                taxVoen: ownerType === 'HUQUQI_SEXS' ? taxVoen : null,
                isVatPayer: ownerType === 'HUQUQI_SEXS' ? isVatPayer : false,
            };
            const res = await api.patch('/auth/organization', payload);

            setUser({
                ...user,
                organization: { ...user!.organization, ...res.data.data }
            } as any);

            addToast({ message: 'Vergi profili yeniləndi', type: 'success' });
            setIsEditingTax(false);
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingTax(false);
        }
    };

    const renderTaxSummary = () => {
        if (!org?.ownerType) {
            return (
                <div className="bg-orange/10 border border-orange/20 rounded-xl p-4 flex items-start gap-4 mt-4">
                    <div className="text-orange text-2xl">⚠️</div>
                    <div className="flex-1">
                        <p className="text-orange font-semibold">Vergi profilinizi tamamlayın — düzgün hesablama üçün vacibdir</p>
                        <Button className="mt-3 bg-orange hover:bg-orange/90 text-white border-0 py-1 h-8 text-xs" onClick={() => setIsEditingTax(true)}>Tamamla</Button>
                    </div>
                </div>
            );
        }

        if (org.ownerType === 'FERDI_VETANDAS') {
            return (
                <div className="bg-surface rounded-xl p-4 border border-border mt-4">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Fərdi Vətəndaş</div>
                    <div className="text-sm text-muted">Yaşayış + fiziki kirayəçi: <span className="text-text font-medium">10%</span></div>
                    <div className="text-sm text-muted mt-1">Digər hallar: <span className="text-text font-medium">14%</span></div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }

        if (org.ownerType === 'FERDI_SAHIBKAR') {
            return (
                <div className="bg-surface rounded-xl p-4 border border-border mt-4">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Fərdi Sahibkar</div>
                    <div className="text-sm text-muted">Sadələşdirilmiş: <span className="text-text font-medium">{org.activityLocation === 'BAKI' ? '4% (Bakı)' : '2% (Digər şəhər)'}</span></div>
                    <div className="text-sm text-muted mt-1">ÖMV tətbiq edilmir</div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }

        if (org.ownerType === 'HUQUQI_SEXS') {
            return (
                <div className="bg-surface rounded-xl p-4 border border-border mt-4">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Hüquqi Şəxs</div>
                    <div className="text-sm text-muted">Mənfəət vergisi: <span className="text-text font-medium">20%</span></div>
                    <div className="text-sm text-muted mt-1">ƏDV: <span className="text-text font-medium">{org.isVatPayer ? 'Aktiv (18%)' : 'Passiv'}</span></div>
                    <div className="text-sm text-muted mt-1">VÖEN: <span className="text-text font-medium">{org.taxVoen}</span></div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }
        return null;
    }

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <SettingsIcon className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-extrabold font-heading text-text">Tənzimləmələr</h1>
            </div>

            <div className="flex flex-col gap-6">

                {/* ── Profile ── */}
                <Card variant="elevated">
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
                                label="E-poçt (dəyişdirilə bilməz)"
                                value={user?.email || ''}
                                disabled
                            />
                            <Button
                                type="submit"
                                disabled={isUpdatingProfile || (name === user?.name && phone === ((user as any)?.phone || ''))}
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


                {/* ── Org Info (OWNER only) ── */}
                {user?.role === 'OWNER' && (
                    <Card variant="default">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-gold" /> Təşkilat Məlumatı
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <Input
                                        label="Təşkilat İD"
                                        value={(user as any)?.organizationId || ''}
                                        disabled
                                    />
                                    <p className="text-sm text-muted">
                                        Təşkilatın adını dəyişmək üçün dəstək ilə əlaqə saxlayın.
                                    </p>
                                </div>

                                {/* Vergi Profili */}
                                <div>
                                    <h3 className="font-bold text-lg text-text border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold">📊</div>
                                        Vergi Profili
                                    </h3>

                                    {!isEditingTax && renderTaxSummary()}

                                    {isEditingTax && (
                                        <form onSubmit={handleUpdateTax} className="space-y-5 bg-surface rounded-xl p-5 border border-border mt-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-text">Mülkiyyətçi növü</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {[
                                                        { v: 'FERDI_VETANDAS', l: 'Fərdi Vətəndaş (fiziki şəxs, qeydiyyatsız)' },
                                                        { v: 'FERDI_SAHIBKAR', l: 'Fərdi Sahibkar (İP, sadələşdirilmiş vergi)' },
                                                        { v: 'HUQUQI_SEXS', l: 'Hüquqi Şəxs (şirkət, MMC və s.)' },
                                                    ].map(o => (
                                                        <label key={o.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${ownerType === o.v ? 'border-gold bg-gold/5' : 'border-border bg-background'}`}>
                                                            <input type="radio" name="ownerType" value={o.v} checked={ownerType === o.v} onChange={() => setOwnerType(o.v)} className="accent-gold" required />
                                                            <span className="text-sm text-text font-medium">{o.l}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {ownerType === 'FERDI_VETANDAS' && (
                                                <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                    <strong>Məlumat:</strong> Yaşayış əmlakı fiziki şəxsə kirayə → 10% ÖMV. Digər hallarda → 14% ÖMV.
                                                </div>
                                            )}

                                            {ownerType === 'FERDI_SAHIBKAR' && (
                                                <>
                                                    <div className="space-y-2 pt-2 border-t border-border">
                                                        <label className="text-sm font-medium text-text">Fəaliyyət yeri</label>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="loc" value="BAKI" checked={activityLocation === 'BAKI'} onChange={() => setActivityLocation('BAKI')} className="accent-gold" required />
                                                                <span className="text-sm">Bakı (4%)</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" name="loc" value="DIGER" checked={activityLocation === 'DIGER'} onChange={() => setActivityLocation('DIGER')} className="accent-gold" required />
                                                                <span className="text-sm">Digər şəhər (2%)</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                        <strong>Sadələşdirilmiş vergi rejimi:</strong><br />
                                                        Kirayə məbləğinin 4% (Bakı) və ya 2% (digər). Bu vergi sahibkar tərəfindən ayrıca ödənilir. Müqavilədə brutto/ÖMV göstərilmir.
                                                    </div>
                                                </>
                                            )}

                                            {ownerType === 'HUQUQI_SEXS' && (
                                                <>
                                                    <div className="space-y-4 pt-2 border-t border-border">
                                                        <Input
                                                            label="VÖEN daxil edin"
                                                            value={taxVoen}
                                                            onChange={e => setTaxVoen(e.target.value)}
                                                            placeholder="10 rəqəmli VÖEN"
                                                            required
                                                            maxLength={10}
                                                        />
                                                        <div>
                                                            <label className="flex items-center gap-3 cursor-pointer">
                                                                <input type="checkbox" checked={isVatPayer} onChange={e => setIsVatPayer(e.target.checked)} className="w-4 h-4 accent-gold" />
                                                                <span className="text-sm font-medium">ƏDV ödəyicisiyəm</span>
                                                            </label>
                                                            <div className="text-xs text-muted ml-7 mt-1">İllik dövriyyə 200,000 AZN-dən çoxdursa</div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                        <strong>Mənfəət vergisi:</strong> 20%<br />
                                                        <strong>ƏDV:</strong> {isVatPayer ? '18%' : 'Tətbiq edilmir'}
                                                    </div>
                                                </>
                                            )}

                                            <div className="flex gap-2 pt-2">
                                                <Button type="button" variant="outline" onClick={() => setIsEditingTax(false)}>Ləğv et</Button>
                                                <Button type="submit" className="flex-1 bg-gold hover:bg-gold/90 text-black border-0" disabled={isUpdatingTax}>
                                                    {isUpdatingTax ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
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
