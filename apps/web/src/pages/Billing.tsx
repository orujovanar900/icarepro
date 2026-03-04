import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CreditCard, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export function Billing() {
    const { user } = useAuthStore();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // Using any type for organization stats returned mapped into user or defaults
    const plan = (user as any)?.organization?.subscriptionPlan || 'FREE_TRIAL';
    const expiresAt = (user as any)?.organization?.planExpiresAt || null;

    // Derived plan variables purely for visual mapping. 
    // Actual role checks are on backend.
    const planLabels: Record<string, string> = {
        FREE_TRIAL: 'Pulsuz',
        BASHLANQIC: 'Başlanğıc',
        BIZNES: 'Biznes',
        KORPORATIV: 'Korporativ',
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <CreditCard className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-extrabold font-heading text-text">Abonəlik Planı</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cari Plan */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Cari Plan</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-muted">Plan növü:</span>
                            <span className="font-bold text-text bg-surface-hover px-3 py-1 rounded-full text-sm">
                                {planLabels[plan] || plan}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted">Status:</span>
                            <span className="flex items-center gap-1 text-green text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" /> Aktiv
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted">Yenilənmə tarixi:</span>
                            <span className="text-text font-medium">
                                {expiresAt ? new Date(expiresAt).toLocaleDateString('az-AZ') : 'Limitsiz'}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-border mt-2">
                            <Button
                                className="w-full bg-gold hover:bg-gold/90 text-background font-bold shadow-lg shadow-gold/20"
                                onClick={() => setIsUpgradeModalOpen(true)}
                            >
                                Planı Yenilə
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Ödəniş Metodu */}
                <Card variant="default">
                    <CardHeader>
                        <CardTitle className="text-lg">Ödəniş Metodu</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-surface border border-border rounded-xl flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                                <CreditCard className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-text">Əlaqə ilə ödəniş</h4>
                                <p className="text-sm text-muted mt-1">
                                    Ödəniş etmək və ya planı dəyişmək üçün dəstək komandamızla əlaqə saxlayın.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-blue/10 border border-blue/20 text-blue rounded-lg text-sm">
                            <Info className="w-5 h-5 shrink-0" />
                            <span>Ödəniş üçün <a href="mailto:support@icarepro.az" className="font-bold underline">support@icarepro.az</a> e-poçtu ilə əlaqə saxlayın.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Ödəniş Tarixçəsi (Mock) */}
            <Card variant="default" className="mt-8">
                <CardHeader>
                    <CardTitle className="text-lg text-text">Ödəniş Tarixçəsi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-muted">
                        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>Hələ ki, ödəniş tarixçəniz yoxdur.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Plan seçimi modalı */}
            <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Plan Seçimi">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {/* Başlanğıc */}
                    <div className="border border-border bg-surface p-5 rounded-xl flex flex-col relative transition-transform hover:scale-[1.02]">
                        <h3 className="font-bold text-lg text-text">Başlanğıc</h3>
                        <div className="mt-2 mb-4">
                            <span className="text-3xl font-extrabold text-text">29₼</span>
                            <span className="text-muted text-sm"> / ay</span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted mb-6 flex-1">
                            <li className="flex gap-2">✔ 1-5 obyekt</li>
                            <li className="flex gap-2">✔ Standard hesabatlar</li>
                            <li className="flex gap-2">✔ E-poçt dəstəyi</li>
                        </ul>
                        <a href="mailto:support@icarepro.az?subject=Başlanğıc Planı&body=Salam, mən Başlanğıc planına keçmək istəyirəm." className="block text-center w-full py-2 bg-surface-hover hover:bg-border text-text rounded-md transition-colors text-sm font-medium">Seç</a>
                    </div>

                    {/* Biznes */}
                    <div className="border border-gold bg-gold/5 p-5 rounded-xl flex flex-col relative transition-transform hover:scale-[1.02] shadow-lg shadow-gold/10">
                        <div className="absolute top-0 right-0 bg-gold text-background text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">TÖVSİYƏ EDİLİR</div>
                        <h3 className="font-bold text-lg text-gold">Biznes</h3>
                        <div className="mt-2 mb-4">
                            <span className="text-3xl font-extrabold text-text">69₼</span>
                            <span className="text-muted text-sm"> / ay</span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted mb-6 flex-1">
                            <li className="flex gap-2">✔ 6-20 obyekt</li>
                            <li className="flex gap-2">✔ Təkmilləşdirilmiş hesabatlar</li>
                            <li className="flex gap-2">✔ Sənəd Ustası (30/ay)</li>
                            <li className="flex gap-2">✔ Whatsapp dəstəyi</li>
                        </ul>
                        <a href="mailto:support@icarepro.az?subject=Biznes Planı&body=Salam, mən Biznes planına keçmək istəyirəm." className="block text-center w-full py-2 bg-gold hover:bg-gold/90 text-background rounded-md transition-colors text-sm font-bold shadow-md shadow-gold/20">Seç</a>
                    </div>

                    {/* Korporativ */}
                    <div className="border border-border bg-surface p-5 rounded-xl flex flex-col relative transition-transform hover:scale-[1.02]">
                        <h3 className="font-bold text-lg text-text">Korporativ</h3>
                        <div className="mt-2 mb-4">
                            <span className="text-3xl font-extrabold text-text">149₼</span>
                            <span className="text-muted text-sm"> / ay</span>
                        </div>
                        <ul className="space-y-2 text-sm text-muted mb-6 flex-1">
                            <li className="flex gap-2">✔ 21-50 obyekt</li>
                            <li className="flex gap-2">✔ Limitsiz Sənəd Ustası</li>
                            <li className="flex gap-2">✔ 24/7 VIP dəstək</li>
                            <li className="flex gap-2">✔ Xüsusi funksiyalar</li>
                        </ul>
                        <a href="mailto:support@icarepro.az?subject=Korporativ Planı&body=Salam, mən Korporativ planına keçmək istəyirəm." className="block text-center w-full py-2 bg-surface-hover hover:bg-border text-text rounded-md transition-colors text-sm font-medium">Seç</a>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

