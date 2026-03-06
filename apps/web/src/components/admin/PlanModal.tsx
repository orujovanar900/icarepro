import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export const PLAN_LABELS: Record<string, string> = {
    FREE_TRIAL: 'Pulsuz Sınaq',
    BASHLANQIC: 'Başlanğıc',
    BIZNES: 'Biznes',
    KORPORATIV: 'Korporativ',
    PROFESSIONAL: 'Professional',
};

export function PlanModal({ org, onClose }: { org: any; onClose: () => void }) {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);
    const [plan, setPlan] = useState(org.subscriptionPlan || 'FREE_TRIAL');
    const [expiresAt, setExpiresAt] = useState(
        org.planExpiresAt ? new Date(org.planExpiresAt).toISOString().split('T')[0] : ''
    );
    const [note, setNote] = useState('');

    const mutation = useMutation({
        mutationFn: () =>
            api.patch(`/admin/organizations/${org.id}/subscription`, {
                subscriptionPlan: plan,
                ...(expiresAt ? { expiresAt } : {}),
                ...(note ? { note } : {}),
            }),
        onSuccess: () => {
            addToast({ message: 'Plan uğurla yeniləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
            queryClient.invalidateQueries({ queryKey: ['admin-organization', org.id] });
            onClose();
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    const plans = [
        { value: 'FREE_TRIAL', label: 'Pulsuz (14 gün sınaq)', price: '0 AZN' },
        { value: 'BASHLANQIC', label: 'Başlanğıc', price: '29 AZN/ay' },
        { value: 'BIZNES', label: 'Biznes', price: '69 AZN/ay' },
        { value: 'KORPORATIV', label: 'Korporativ', price: '149 AZN/ay' },
    ];

    return (
        <Modal isOpen onClose={onClose} title={`Plan dəyiş: ${org.name}`}>
            <div className="space-y-4">
                <div className="p-3 rounded-lg bg-surface/50 border border-border text-sm text-muted">
                    Cari plan: <span className="font-bold text-text">{PLAN_LABELS[org.subscriptionPlan] || org.subscriptionPlan}</span>
                </div>

                <div>
                    <p className="text-sm font-semibold text-muted mb-3">Yeni plan seç:</p>
                    <div className="space-y-2">
                        {plans.map((p) => (
                            <label key={p.value} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${plan === p.value ? 'border-gold bg-gold/10' : 'border-border bg-surface/30 hover:bg-surface'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${plan === p.value ? 'border-gold' : 'border-muted'}`}>
                                        {plan === p.value && <div className="w-2 h-2 rounded-full bg-gold" />}
                                    </div>
                                    <input type="radio" value={p.value} checked={plan === p.value} onChange={() => setPlan(p.value)} className="hidden" />
                                    <span className="font-medium text-text">{p.label}</span>
                                </div>
                                <span className="text-xs text-gold font-bold">{p.price}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-muted mb-1">Bitmə tarixi</label>
                    <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-muted mb-1">Qeyd (daxili)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="İxtiyari qeyd..."
                        rows={2}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-gold resize-none"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border mt-2">
                    <Button type="button" variant="outline" onClick={onClose}>Ləğv et</Button>
                    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                        {mutation.isPending ? 'Yenilənir...' : 'Planı yenilə'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
