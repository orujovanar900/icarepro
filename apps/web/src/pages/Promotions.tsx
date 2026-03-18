import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Tv2, Star, CheckCircle2, Clock, XCircle, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

// ── Types ─────────────────────────────────────────────────────────────────────

type PromoType = 'LED_TICKER' | 'FEATURED_LISTING' | null;
type PromoStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PromotionRequest {
    id:           string;
    type:         'LED_TICKER' | 'FEATURED_LISTING';
    durationDays: number;
    customText:   string | null;
    listingId:    string | null;
    status:       PromoStatus;
    adminNote:    string | null;
    createdAt:    string;
    listing:      { id: string; title: string } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
    { label: '7 gün',  value: '7'  },
    { label: '14 gün', value: '14' },
    { label: '30 gün', value: '30' },
];

function StatusBadge({ status }: { status: PromoStatus }) {
    if (status === 'APPROVED') return (
        <Badge variant="aktiv" className="flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Təsdiqləndi
        </Badge>
    );
    if (status === 'REJECTED') return (
        <Badge variant="danger" className="flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" /> Rədd edildi
        </Badge>
    );
    return (
        <Badge variant="draft" className="flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" /> Gözləyir
        </Badge>
    );
}

function fmtDate(str: string) {
    return new Date(str).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Promotions() {
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const queryClient = useQueryClient();

    // Form state
    const [selectedType, setSelectedType] = useState<PromoType>(null);
    const [duration, setDuration]         = useState('7');
    const [customText, setCustomText]     = useState('');
    const [listingId, setListingId]       = useState('');
    const [submitted, setSubmitted]       = useState(false);

    // Fetch user's own promotion requests
    const { data: myRequestsData, isLoading: isLoadingRequests } = useQuery({
        queryKey: ['promotions-mine'],
        queryFn: async () => {
            const res = await api.get('/promotions/mine');
            return res.data;
        },
    });
    const myRequests: PromotionRequest[] = myRequestsData?.data || [];

    // Fetch user's active listings for dropdown
    const { data: listingsData } = useQuery({
        queryKey: ['my-active-listings-for-promo'],
        queryFn: async () => {
            const res = await api.get('/listings?status=ACTIVE&limit=100');
            return res.data;
        },
        enabled: selectedType === 'FEATURED_LISTING',
    });
    const myListings: { id: string; title: string }[] = listingsData?.data || [];

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (payload: object) => {
            const res = await api.post('/promotions', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions-mine'] });
            setSubmitted(true);
            setSelectedType(null);
            setCustomText('');
            setListingId('');
            setDuration('7');
        },
        onError: (err: any) => {
            addToast({ message: err?.response?.data?.error || 'Müraciət göndərilə bilmədi', type: 'error' });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType) return;
        if (selectedType === 'LED_TICKER' && !customText.trim()) {
            addToast({ message: 'Lütfən mətn daxil edin', type: 'error' });
            return;
        }
        if (selectedType === 'FEATURED_LISTING' && !listingId) {
            addToast({ message: 'Lütfən elan seçin', type: 'error' });
            return;
        }
        submitMutation.mutate({
            type: selectedType,
            durationDays: parseInt(duration, 10),
            customText: selectedType === 'LED_TICKER' ? customText : null,
            listingId:  selectedType === 'FEATURED_LISTING' ? listingId : null,
        });
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-3">
                    <Megaphone className="w-8 h-8 text-gold" />
                    Reklam və Promosyon
                </h1>
                <p className="text-muted text-sm">Elanınızı öncülləştirin, daha çox icarəçiyə çatın.</p>
            </div>

            {/* Success banner (after submit) */}
            {submitted && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-green/10 border border-green/20">
                    <CheckCircle2 className="w-5 h-5 text-green shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-text">Müraciətiniz göndərildi!</p>
                        <p className="text-sm text-muted mt-0.5">Admin tərəfindən nəzərdən keçiriləcək və sizə bildiriş göndəriləcək.</p>
                    </div>
                    <button onClick={() => setSubmitted(false)} className="ml-auto text-muted hover:text-text text-lg leading-none">×</button>
                </div>
            )}

            {/* Promotion type cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LED Ticker */}
                <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === 'LED_TICKER' ? null : 'LED_TICKER')}
                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                        selectedType === 'LED_TICKER'
                            ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                            : 'border-border bg-surface hover:border-gold/40'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                            <Tv2 className="w-6 h-6 text-gold" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-text text-lg">LED Ticker</h3>
                                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${selectedType === 'LED_TICKER' ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-sm text-muted mt-1">Portal ana səhifəsindəki hərəkətli bannerdə göstərin</p>
                        </div>
                    </div>

                    {selectedType === 'LED_TICKER' && (
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4" onClick={e => e.stopPropagation()}>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-text">Banner mətni <span className="text-muted">(maks. 100 simvol)</span></label>
                                <textarea
                                    value={customText}
                                    onChange={e => setCustomText(e.target.value)}
                                    maxLength={100}
                                    rows={2}
                                    placeholder="Məs: Bakı mərkəzdə 3 otaqlı mənzil icarəyə verilir..."
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                                    required
                                />
                                <p className="text-xs text-muted text-right">{customText.length}/100</p>
                            </div>
                            <Select
                                label="Müddət"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                options={DURATION_OPTIONS}
                            />
                            <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                                {submitMutation.isPending ? 'Göndərilir...' : 'Müraciət Göndər'}
                            </Button>
                        </form>
                    )}
                </button>

                {/* Featured Listing */}
                <button
                    type="button"
                    onClick={() => setSelectedType(selectedType === 'FEATURED_LISTING' ? null : 'FEATURED_LISTING')}
                    className={`text-left p-5 rounded-2xl border-2 transition-all ${
                        selectedType === 'FEATURED_LISTING'
                            ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                            : 'border-border bg-surface hover:border-gold/40'
                    }`}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center shrink-0">
                            <Star className="w-6 h-6 text-gold" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-text text-lg">Öncülləşdirilmiş Elan</h3>
                                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${selectedType === 'FEATURED_LISTING' ? 'rotate-180' : ''}`} />
                            </div>
                            <p className="text-sm text-muted mt-1">Elanınız siyahının ən üstündə görünsün</p>
                        </div>
                    </div>

                    {selectedType === 'FEATURED_LISTING' && (
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4" onClick={e => e.stopPropagation()}>
                            <Select
                                label="Elan seçin"
                                value={listingId}
                                onChange={e => setListingId(e.target.value)}
                                options={[
                                    { label: 'Elan seçin...', value: '' },
                                    ...myListings.map(l => ({ label: l.title, value: l.id })),
                                ]}
                                required
                            />
                            {myListings.length === 0 && (
                                <p className="text-xs text-muted">Aktiv elanınız yoxdur. Əvvəlcə elan əlavə edin.</p>
                            )}
                            <Select
                                label="Müddət"
                                value={duration}
                                onChange={e => setDuration(e.target.value)}
                                options={DURATION_OPTIONS}
                            />
                            <Button type="submit" className="w-full" disabled={submitMutation.isPending || !listingId}>
                                {submitMutation.isPending ? 'Göndərilir...' : 'Müraciət Göndər'}
                            </Button>
                        </form>
                    )}
                </button>
            </div>

            {/* My past requests */}
            <Card variant="elevated">
                <CardHeader>
                    <CardTitle>Müraciət Tarixçəsi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingRequests ? (
                        <div className="p-6 space-y-3">
                            {[1,2,3].map(i => <div key={i} className="h-10 bg-surface animate-pulse rounded-lg" />)}
                        </div>
                    ) : myRequests.length === 0 ? (
                        <div className="p-10 text-center text-muted">
                            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p>Hələ heç bir müraciət göndərməmisiniz.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-left">
                                            <th className="px-4 py-3 font-semibold text-muted">Tarix</th>
                                            <th className="px-4 py-3 font-semibold text-muted">Növ</th>
                                            <th className="px-4 py-3 font-semibold text-muted">Müddət</th>
                                            <th className="px-4 py-3 font-semibold text-muted">Status</th>
                                            <th className="px-4 py-3 font-semibold text-muted">Qeyd</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {myRequests.map(r => (
                                            <tr key={r.id} className="hover:bg-surface/50">
                                                <td className="px-4 py-3 text-muted">{fmtDate(r.createdAt)}</td>
                                                <td className="px-4 py-3 font-medium text-text">
                                                    {r.type === 'LED_TICKER' ? (
                                                        <span className="flex items-center gap-1.5"><Tv2 className="w-3.5 h-3.5 text-gold" /> LED Ticker</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-gold" /> Öncülləşdirilmiş</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-text">{r.durationDays} gün</td>
                                                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                                <td className="px-4 py-3 text-muted max-w-[200px] truncate">{r.adminNote || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden divide-y divide-border">
                                {myRequests.map(r => (
                                    <div key={r.id} className="p-4 flex justify-between items-start gap-3">
                                        <div>
                                            <p className="font-medium text-text text-sm">
                                                {r.type === 'LED_TICKER' ? 'LED Ticker' : 'Öncülləşdirilmiş Elan'}
                                            </p>
                                            <p className="text-xs text-muted mt-0.5">{fmtDate(r.createdAt)} · {r.durationDays} gün</p>
                                            {r.adminNote && <p className="text-xs text-muted mt-1 italic">{r.adminNote}</p>}
                                        </div>
                                        <StatusBadge status={r.status} />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
