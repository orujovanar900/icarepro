import React from 'react';
import { X, Lock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureGate, PlanType } from '../utils/planGates';

interface Props {
    isOpen: boolean;
    feature: FeatureGate;
    requiredPlan: PlanType;
    onClose: () => void;
    onUpgrade?: () => void;
}

const MESSAGES: Record<FeatureGate, string> = {
    senadUstasi: 'Sənəd Ustası AI Professional planından istifadə olunur',
    senadLimit: 'Bu ay Sənəd Ustası limitiniz doldu (30/30)',
    addUnit: 'Maksimum obyekt limitinə çatdınız',
    addUser: 'İstifadəçi limitinə çatdınız',
    pdfExport: 'PDF ixrac Başlanğıc planından mövcuddur',
    excelExport: 'Excel ixrac Başlanğıc planından mövcuddur',
    reports: 'Hesabatlar Başlanğıc planından mövcuddur',
    forecast: 'Gəlir proqnozu Başlanğıc planından açılır',
    photos: 'Şəkil yükləmə Başlanğıc planından mövcuddur',
    maxUnits: 'Limit',
    maxUsers: 'Limit',
};

const PRICES: Record<PlanType, string> = {
    free: '0 AZN',
    starter: '29 AZN/ay (ilk 2 ay 15 AZN)',
    pro: '69 AZN/ay (ilk 2 ay 35 AZN)',
    business: '149 AZN/ay (ilk 2 ay 75 AZN)'
};

const PLAN_NAMES: Record<PlanType, string> = {
    free: 'Pulsuz',
    starter: 'Başlanğıc',
    pro: 'Professional',
    business: 'Biznes'
};

export const UpgradeModal: React.FC<Props> = ({ isOpen, feature, requiredPlan, onClose, onUpgrade }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const message = MESSAGES[feature] || 'Bu funksiya üçün planınızı yeniləyin';
    const priceText = PRICES[requiredPlan];
    const planName = PLAN_NAMES[requiredPlan];

    const handleUpgrade = () => {
        if (onUpgrade) onUpgrade();
        onClose();
        navigate('/settings/billing'); // Assuming routing to billing/settings page
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 mbg">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-md bg-[#0D1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
                style={{ animation: 'fsu .2s ease-out both' }}
            >
                {/* Header glow */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold/0 via-gold to-gold/0 opacity-50" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted hover:text-text transition-colors p-1"
                >
                    <X size={20} />
                </button>

                <div className="p-6 pt-10 text-center">
                    <div className="mx-auto w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-6 border border-gold/20">
                        <Lock className="w-8 h-8 text-gold" />
                    </div>

                    <h3 className="text-xl font-bold text-text mb-2">Planınızı Yeniləyin</h3>
                    <p className="text-muted text-sm mb-8 leading-relaxed">
                        {message}
                    </p>

                    {/* Plan highlight box */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8 text-left">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-text uppercase tracking-wider">{planName} Planı</span>
                            <span className="text-xs font-bold bg-gold text-[#0A0B0F] px-2 py-0.5 rounded">TÖVSİYƏ EDİLİR</span>
                        </div>
                        <div className="text-gold font-bold text-lg mb-4">{priceText}</div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <CheckCircle2 size={14} className="text-green shrink-0" />
                                <span>Daha çox obyekt və istifadəçi</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <CheckCircle2 size={14} className="text-green shrink-0" />
                                <span>Genişəndirilmiş hesabatlar və ixrac</span>
                            </div>
                            {requiredPlan === 'pro' || requiredPlan === 'business' ? (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                    <CheckCircle2 size={14} className="text-green shrink-0" />
                                    <span>Sənəd Ustası AI</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleUpgrade}
                            className="w-full bg-[#F5C842] hover:bg-[#F5C842]/90 text-[#0D1117] font-bold py-3.5 px-4 rounded-xl transition-colors"
                        >
                            İndi Yenilə
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-transparent hover:bg-white/5 text-muted font-medium py-3 px-4 rounded-xl transition-colors"
                        >
                            Daha sonra
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fsu {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};
