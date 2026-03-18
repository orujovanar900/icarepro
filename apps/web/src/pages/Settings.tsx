import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Settings as SettingsIcon, Building, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Settings() {
    const navigate = useNavigate();
    const { user, setUser } = useAuthStore();
    const addToast = useToastStore((state) => state.addToast);
    const isOwner = user?.role === 'OWNER';
    const org = (user as any)?.organization;

    // ── Tax Profile (OWNER only) ──────────────────────────────────────────────
    const [ownerType, setOwnerType]             = useState<string | null>(org?.ownerType || null);
    const [activityLocation, setActivityLocation] = useState<string | null>(org?.activityLocation || null);
    const [taxOfficeType, setTaxOfficeType]     = useState<string | null>(org?.taxOfficeType || null);
    const [taxVoen, setTaxVoen]                 = useState<string>(org?.taxVoen || '');
    const [isVatPayer, setIsVatPayer]           = useState<boolean>(org?.isVatPayer || false);
    const [isUpdatingTax, setIsUpdatingTax]     = useState(false);
    const [isEditingTax, setIsEditingTax]       = useState(false);

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
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <SettingsIcon className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-extrabold font-heading text-text">Tənzimləmələr</h1>
            </div>

            {/* Personal info redirect notice */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-text">Şəxsi məlumatlar (ad, telefon, şifrə, avatar) <strong>Profil</strong> səhifəsindədir.</p>
                </div>
                <Link to="/profile">
                    <Button variant="outline" size="sm" className="shrink-0 border-gold/30 text-gold hover:bg-gold/10">
                        Profil →
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col gap-6">

                {/* OWNER-only: Vergi Profili + Org Info */}
                {isOwner ? (
                    <>
                        {/* Vergi Profili */}
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
                                    <form onSubmit={handleUpdateTax} className="space-y-5 bg-surface rounded-xl p-5 border border-border mt-2">
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

                        {/* Org Info */}
                        <Card variant="default">
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
                    </>
                ) : (
                    <Card variant="default">
                        <CardContent className="p-8 text-center text-muted">
                            <SettingsIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="font-medium">Bu bölmə yalnız hesab sahibi üçün mövcuddur.</p>
                            <Link to="/profile">
                                <Button variant="outline" className="mt-4">Profil Parametrlərinə keç →</Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
