import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export const PLAN_LABELS: Record<string, string> = {
    FREE_TRIAL: 'Pulsuz',
    BASHLANQIC: 'Bürünc',
    BIZNES: 'Gümüş',
    KORPORATIV: 'Qızıl',
    PROFESSIONAL: 'Gümüş',
    ENTERPRISE: 'İndividual',
};

export function PlanModal({ org, onClose }: { org: any; onClose: () => void }) {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);
    const [plan, setPlan] = useState(org.subscriptionPlan || 'FREE_TRIAL');
    const [expiresAt, setExpiresAt] = useState(
        org.planExpiresAt ? new Date(org.planExpiresAt).toISOString().split('T')[0] : ''
    );
    const [note, setNote] = useState('');

    // ENTERPRISE extra fields
    const [customPrice, setCustomPrice] = useState('');
    const [contractNumber, setContractNumber] = useState('');
    const [accountManager, setAccountManager] = useState('');
    const [enterpriseNotes, setEnterpriseNotes] = useState('');

    const buildNote = (): string => {
        if (plan === 'ENTERPRISE') {
            const parts: string[] = [];
            parts.push('Individual plan.');
            if (customPrice) parts.push(`Qiymet: ${customPrice} AZN/ay.`);
            if (contractNumber) parts.push(`Muqavile: ${contractNumber}.`);
            if (accountManager) parts.push(`Menecer: ${accountManager}.`);
            if (enterpriseNotes) parts.push(enterpriseNotes);
            if (note) parts.push(note);
            return parts.join(' ');
        }
        return note;
    };

    const mutation = useMutation({
        mutationFn: () =>
            api.patch(`/admin/organizations/${org.id}/subscription`, {
                subscriptionPlan: plan,
                ...(expiresAt ? { expiresAt } : {}),
                note: buildNote() || undefined,
            }),
        onSuccess: () => {
            addToast({ message: 'Plan ugurla yenilendi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
            queryClient.invalidateQueries({ queryKey: ['admin-organization', org.id] });
            onClose();
        },
        onError: () => addToast({ message: 'Xeta bas verdi', type: 'error' }),
    });

    const plans = [
        { value: 'FREE_TRIAL', label: 'Pulsuz (14 gun sinaq)', price: '0 AZN' },
        { value: 'BASHLANQIC', label: 'Burunc', price: '29 AZN/ay' },
        { value: 'BIZNES', label: 'Gumus', price: '69 AZN/ay' },
        { value: 'KORPORATIV', label: 'Qizil', price: '149 AZN/ay' },
        { value: 'ENTERPRISE', label: 'Individual', price: 'Xususi' },
    ];

    const inputClass = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold';

    return (
        <Modal isOpen onClose={onClose} title={`Plan deyis: ${org.name}`}>
            <div className="space-y-4">
                <div className="p-3 rounded-lg bg-surface/50 border border-border text-sm text-muted">
                    Cari plan: <span className="font-bold text-text">{PLAN_LABELS[org.subscriptionPlan] || org.subscriptionPlan}</span>
                </div>

                <div>
                    <p className="text-sm font-semibold text-muted mb-3">Yeni plan sec:</p>
                    <div className="space-y-2">
                        {plans.map((p) => (
                            <label key={p.value} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${plan === p.value ? 'border-gold bg-gold/10' : 'border-border bg-surface/30 hover:bg-surface'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${plan === p.value ? 'border-gold' : 'border-muted'}`}>
                                        {plan === p.value && <div className="w-2 h-2 rounded-full bg-gold" />}
                                    </div>
                                    <input type="radio" value={p.value} checked={plan === p.value} onChange={() => setPlan(p.value)} className="hidden" />
                                    <span className="font-medium text-text">
                                        {p.value === 'ENTERPRISE' && <span className="mr-1">&#11088;</span>}
                                        {p.label}
                                    </span>
                                </div>
                                <span className={`text-xs font-bold ${p.value === 'ENTERPRISE' ? 'text-amber-600' : 'text-gold'}`}>{p.price}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ENTERPRISE extra fields */}
                {plan === 'ENTERPRISE' && (
                    <div className="space-y-3 p-4 rounded-xl border-2 border-amber-300/50 bg-amber-50/30">
                        <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                            <span>&#11088;</span> Individual plan melumatlari
                        </p>
                        <div>
                            <label className="block text-sm font-semibold text-muted mb-1">Xususi qiymet (AZN/ay)</label>
                            <input
                                type="number"
                                value={customPrice}
                                onChange={(e) => setCustomPrice(e.target.value)}
                                placeholder="Meselen: 250"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-muted mb-1">Muqavile nomresi</label>
                            <input
                                type="text"
                                value={contractNumber}
                                onChange={(e) => setContractNumber(e.target.value)}
                                placeholder="Meselen: ENT-2026-001"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-muted mb-1">Account menecer</label>
                            <input
                                type="text"
                                value={accountManager}
                                onChange={(e) => setAccountManager(e.target.value)}
                                placeholder="Ad Soyad"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-muted mb-1">Elave qeydler</label>
                            <textarea
                                value={enterpriseNotes}
                                onChange={(e) => setEnterpriseNotes(e.target.value)}
                                placeholder="Xususi sertler, endirim ve s."
                                rows={2}
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-semibold text-muted mb-1">Bitme tarixi</label>
                    <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className={inputClass}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-muted mb-1">Qeyd (daxili)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ixtiyari qeyd..."
                        rows={2}
                        className={`${inputClass} resize-none`}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Legv et</Button>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? 'Yenilendir...' : 'Plani yenile'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
