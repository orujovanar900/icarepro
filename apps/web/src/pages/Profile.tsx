import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { User, LogOut, Camera, Loader2, KeyRound, Building, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translateRole } from '@/utils/roles';

// ── Session timeout: warn at 25min, logout at 30min ──────────────────────────
const WARN_IDLE_MS  = 25 * 60 * 1000;
const LOGOUT_IDLE_MS = 30 * 60 * 1000;

function useSessionTimeout(onWarn: () => void, onLogout: () => void) {
    const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
    const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reset = () => {
        if (warnTimer.current)   clearTimeout(warnTimer.current);
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        warnTimer.current   = setTimeout(onWarn,   WARN_IDLE_MS);
        logoutTimer.current = setTimeout(onLogout, LOGOUT_IDLE_MS);
    };

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();
        return () => {
            events.forEach(e => window.removeEventListener(e, reset));
            if (warnTimer.current)   clearTimeout(warnTimer.current);
            if (logoutTimer.current) clearTimeout(logoutTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}

export function Profile() {
    const { user, setUser, logout } = useAuthStore();
    const addToast  = useToastStore((state) => state.addToast);
    const navigate  = useNavigate();
    const isOwner   = user?.role === 'OWNER';
    const org       = (user as any)?.organization;

    // ── Personal info ─────────────────────────────────────────────────────────
    const [name, setName]   = useState(user?.name || '');
    const [phone, setPhone] = useState((user as any)?.phone || '');
    const [isSaving, setIsSaving]     = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

    // ── Change Password ───────────────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // ── Tax Profile (OWNER only) ──────────────────────────────────────────────
    const [ownerType, setOwnerType]           = useState<string | null>(org?.ownerType || null);
    const [activityLocation, setActivityLocation] = useState<string | null>(org?.activityLocation || null);
    const [taxOfficeType, setTaxOfficeType]   = useState<string | null>(org?.taxOfficeType || null);
    const [taxVoen, setTaxVoen]               = useState<string>(org?.taxVoen || '');
    const [isVatPayer, setIsVatPayer]         = useState<boolean>(org?.isVatPayer || false);
    const [isUpdatingTax, setIsUpdatingTax]   = useState(false);
    const [isEditingTax, setIsEditingTax]     = useState(false);

    // ── Session timeout ───────────────────────────────────────────────────────
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const handleSessionLogout = () => { logout(); navigate('/login'); };
    useSessionTimeout(() => setShowSessionWarning(true), handleSessionLogout);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await api.put('/users/profile', { name, phone });
            setUser({ ...user, ...res.data.data });
            addToast({ message: 'Profil məlumatları yeniləndi', type: 'success' });
        } catch (error: any) {
            addToast({ message: error?.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);
        try {
            const res = await api.post('/users/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUser({ ...user, ...res.data.data });
            addToast({ message: 'Şəkil yeniləndi', type: 'success' });
        } catch (error: any) {
            addToast({ message: 'Şəkil yüklənərkən xəta baş verdi', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm('Bütün cihazlardan çıxış etdiyiniz üçün hesabınıza yenidən daxil olmalı olacaqsınız. Davam edilsin?')) return;
        setIsLoggingOutAll(true);
        try {
            await api.post('/auth/logout-all');
            addToast({ message: 'Bütün cihazlardan çıxış edildi', type: 'success' });
            logout();
            navigate('/login');
        } catch (error: any) {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
            setIsLoggingOutAll(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast({ message: 'Yeni şifrələr uyğun gəlmir', type: 'error' });
            return;
        }
        if (newPassword.length < 8) {
            addToast({ message: 'Şifrə ən azı 8 simvol olmalıdır', type: 'error' });
            return;
        }
        setIsChangingPassword(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            addToast({ message: 'Şifrə uğurla dəyişdirildi. Zəhmət olmasa yenidən daxil olun.', type: 'success' });
            logout();
            navigate('/login');
        } catch (error: any) {
            addToast({ message: error?.response?.data?.error || 'Şifrə dəyişdirilə bilmədi', type: 'error' });
        } finally {
            setIsChangingPassword(false);
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
                activityLocation: ownerType === 'FERDI_VETANDAS' ? activityLocation : null,
                taxOfficeType: ownerType === 'FERDI_SAHIBKAR' ? taxOfficeType : null,
                taxVoen: ownerType === 'HUQUQI_SEXS' ? taxVoen : null,
                isVatPayer: ownerType === 'HUQUQI_SEXS' ? isVatPayer : false,
            };
            const res = await api.patch('/auth/organization', payload);
            setUser({ ...user, organization: { ...user!.organization, ...res.data.data } } as any);
            addToast({ message: 'Vergi profili yeniləndi', type: 'success' });
            setIsEditingTax(false);
        } catch (err: any) {
            addToast({ message: err?.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingTax(false);
        }
    };

    const renderTaxSummary = () => {
        if (!org?.ownerType) {
            return (
                <div className="bg-orange/10 border border-orange/20 rounded-xl p-4 flex items-start gap-4">
                    <div className="text-orange text-2xl">⚠️</div>
                    <div className="flex-1">
                        <p className="text-orange font-semibold">Vergi profilinizi tamamlayın — düzgün hesablama üçün vacibdir</p>
                        <Button className="mt-3 bg-orange hover:bg-orange/90 text-white border-0 py-1 h-8 text-xs" onClick={() => setIsEditingTax(true)}>Tamamla</Button>
                    </div>
                </div>
            );
        }
        if (org.ownerType === 'FERDI_VETANDAS') {
            const locLabel = org.activityLocation === 'RESIDENTIAL' ? 'Yaşayış əmlakı (10%)' : org.activityLocation === 'COMMERCIAL' ? 'Qeyri-yaşayış/kommersiya (14%)' : 'Əmlak növü seçilməyib';
            return (
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Fərdi Vətəndaş</div>
                    <div className="text-sm text-muted">Əmlak növü: <span className="text-text font-medium">{locLabel}</span></div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }
        if (org.ownerType === 'FERDI_SAHIBKAR') {
            const officeLabel = org.taxOfficeType === 'SIMPLIFIED' ? '2% (Sadələşdirilmiş)' : org.taxOfficeType === 'STANDARD' ? '4% (Ümumi sistem)' : (org.activityLocation === 'BAKI' ? '4% (Bakı)' : org.activityLocation === 'DIGER' ? '2% (Digər şəhər)' : 'Vergi növü seçilməyib');
            return (
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Fərdi Sahibkar</div>
                    <div className="text-sm text-muted">Vergi uçotu: <span className="text-text font-medium">{officeLabel}</span></div>
                    <div className="text-sm text-muted mt-1">ÖMV tətbiq edilmir</div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }
        if (org.ownerType === 'HUQUQI_SEXS') {
            return (
                <div className="bg-surface rounded-xl p-4 border border-border">
                    <div className="font-bold flex items-center gap-2 mb-2 text-text"><CheckCircle2 className="w-5 h-5 text-green" /> Vergi rejimi: Hüquqi Şəxs</div>
                    <div className="text-sm text-muted">Mənfəət vergisi: <span className="text-text font-medium">20%</span></div>
                    <div className="text-sm text-muted mt-1">ƏDV: <span className="text-text font-medium">{org.isVatPayer ? 'Aktiv (18%)' : 'Passiv'}</span></div>
                    <div className="text-sm text-muted mt-1">VÖEN: <span className="text-text font-medium">{org.taxVoen}</span></div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsEditingTax(true)}>Dəyişdir</Button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <h1 className="text-2xl font-bold font-heading text-text">Profil Parametrləri</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Avatar card */}
                <Card variant="elevated" className="md:col-span-1 h-fit">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface bg-bg flex items-center justify-center">
                                {(user as any)?.avatarUrl ? (
                                    <img src={(user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-muted" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-gold text-bg rounded-full cursor-pointer hover:bg-gold-hover transition-colors shadow-lg">
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading} />
                            </label>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text">{user?.name}</h3>
                            <p className="text-sm text-muted">{translateRole(user?.role)}</p>
                            <p className="text-xs text-muted mt-1">{user?.email}</p>
                        </div>
                        <div className="w-full pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red hover:text-red hover:bg-red/10 border-red/20"
                                onClick={handleLogoutAll}
                                disabled={isLoggingOutAll}
                            >
                                {isLoggingOutAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                                Bütün cihazlardan çıx
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="md:col-span-2 space-y-6">

                    {/* Personal info */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle>Şəxsi Məlumatlar</CardTitle>
                            <p className="text-sm text-muted mt-1">Profil məlumatlarınızı buradan yeniləyə bilərsiniz.</p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Ad və Soyad</label>
                                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Adınız" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Telefon</label>
                                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+994" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text">E-poçt (dəyişdirilə bilməz)</label>
                                    <Input value={user?.email || ''} disabled />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5" /> Şifrəni Dəyiş
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <Input type="password" placeholder="Mövcud şifrə" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                <Input type="password" placeholder="Yeni şifrə (min. 8 simvol)" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                                <Input type="password" placeholder="Yeni şifrəni təsdiqləyin" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" variant="outline" disabled={isChangingPassword || !currentPassword || !newPassword}>
                                        {isChangingPassword ? 'Dəyişdirilir...' : 'Şifrəni Yenilə'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* OWNER-only: Vergi Profili */}
                    {isOwner && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <span className="text-xl">📊</span> Vergi Profili
                                </CardTitle>
                                <p className="text-sm text-muted mt-1">Müqavilə vergisi avtomatik hesablamaq üçün vergi rejimini seçin.</p>
                            </CardHeader>
                            <CardContent>
                                {!isEditingTax && renderTaxSummary()}

                                {isEditingTax && (
                                    <form onSubmit={handleUpdateTax} className="space-y-5 bg-surface rounded-xl p-5 border border-border">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-text">Mülkiyyətçi növü</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {[
                                                    { v: 'FERDI_VETANDAS', l: 'Fərdi Vətəndaş (fiziki şəxs, qeydiyyatsız)' },
                                                    { v: 'FERDI_SAHIBKAR', l: 'Fərdi Sahibkar (İP, sadələşdirilmiş vergi)' },
                                                    { v: 'HUQUQI_SEXS',   l: 'Hüquqi Şəxs (şirkət, MMC və s.)' },
                                                ].map(o => (
                                                    <label key={o.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${ownerType === o.v ? 'border-gold bg-gold/5' : 'border-border bg-background'}`}>
                                                        <input type="radio" name="ownerType" value={o.v} checked={ownerType === o.v} onChange={() => setOwnerType(o.v)} className="accent-gold" required />
                                                        <span className="text-sm text-text font-medium">{o.l}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {ownerType === 'FERDI_VETANDAS' && (
                                            <>
                                                <div className="space-y-2 pt-2 border-t border-border">
                                                    <label className="text-sm font-medium text-text">Əmlak növü</label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="actLoc" value="RESIDENTIAL" checked={activityLocation === 'RESIDENTIAL'} onChange={() => setActivityLocation('RESIDENTIAL')} className="accent-gold" required />
                                                            <span className="text-sm">Yaşayış (10% ÖMV)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="actLoc" value="COMMERCIAL" checked={activityLocation === 'COMMERCIAL'} onChange={() => setActivityLocation('COMMERCIAL')} className="accent-gold" required />
                                                            <span className="text-sm">Kommersiya (14% ÖMV)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                    <strong>Məlumat:</strong> Yaşayış əmlakı fiziki şəxsə kirayə → 10% ÖMV. Kommersiya/qeyri-yaşayış → 14% ÖMV.
                                                </div>
                                            </>
                                        )}

                                        {ownerType === 'FERDI_SAHIBKAR' && (
                                            <>
                                                <div className="space-y-2 pt-2 border-t border-border">
                                                    <label className="text-sm font-medium text-text">Vergi uçotu yeri</label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="taxOffice" value="SIMPLIFIED" checked={taxOfficeType === 'SIMPLIFIED'} onChange={() => setTaxOfficeType('SIMPLIFIED')} className="accent-gold" required />
                                                            <span className="text-sm">Sadələşdirilmiş vergi (2%)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="taxOffice" value="STANDARD" checked={taxOfficeType === 'STANDARD'} onChange={() => setTaxOfficeType('STANDARD')} className="accent-gold" required />
                                                            <span className="text-sm">Ümumi vergi sistemi (4%)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                    <strong>Sadələşdirilmiş vergi rejimi:</strong><br />
                                                    Kirayə məbləğinin 2% (sadələşdirilmiş) və ya 4% (ümumi sistem).
                                                </div>
                                            </>
                                        )}

                                        {ownerType === 'HUQUQI_SEXS' && (
                                            <>
                                                <div className="space-y-4 pt-2 border-t border-border">
                                                    <Input label="VÖEN daxil edin" value={taxVoen} onChange={e => setTaxVoen(e.target.value)} placeholder="10 rəqəmli VÖEN" required maxLength={10} />
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" checked={isVatPayer} onChange={e => setIsVatPayer(e.target.checked)} className="w-4 h-4 accent-gold" />
                                                        <span className="text-sm font-medium">ƏDV ödəyicisiyəm</span>
                                                    </label>
                                                </div>
                                                <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-sm text-blue">
                                                    <strong>Mənfəət vergisi:</strong> 20% &nbsp;|&nbsp; <strong>ƏDV:</strong> {isVatPayer ? '18%' : 'Tətbiq edilmir'}
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
                            </CardContent>
                        </Card>
                    )}

                    {/* OWNER-only: Təşkilat Məlumatı */}
                    {isOwner && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="w-5 h-5 text-gold" /> Təşkilat Məlumatı
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-w-md">
                                    <Input label="Təşkilat İD" value={(user as any)?.organizationId || ''} disabled />
                                    <Input label="Abunəlik Planı" value={org?.subscriptionPlan || '—'} disabled />
                                    <p className="text-sm text-muted border-l-2 border-gold/30 pl-3">
                                        Təşkilatın adını dəyişmək üçün dəstək ilə əlaqə saxlayın.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Session timeout warning */}
            <Modal isOpen={showSessionWarning} onClose={() => setShowSessionWarning(false)} title="">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-orange" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text">Sessiya bitmək üzrədir</h3>
                        <p className="text-sm text-muted mt-1">5 dəqiqə ərzində fəaliyyət olmasa sistem avtomatik çıxacaq.</p>
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
