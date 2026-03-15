import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, AlertCircle, Clock, CheckCircle2, XCircle, List, Send, HandshakeIcon, X, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Qaralama',
    PENDING: 'Gözləyir',
    ACTIVE: 'Aktiv',
    CLOSING_PENDING: 'Bağlanır',
    REJECTED: 'Rədd edildi',
    DEACTIVATED: 'Deaktiv',
};

const TYPE_LABELS: Record<string, string> = {
    MENZIL: 'Mənzil',
    OFIS: 'Ofis',
    OBYEKT: 'Obyekt',
    ANBAR: 'Anbar',
    GARAJ: 'Qaraj',
    TORPAQ: 'Torpaq',
    HEYET_EVI: 'Həyət evi',
};

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE':
            return <Badge variant="aktiv">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'PENDING':
            return <Badge variant="draft">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'REJECTED':
            return <Badge variant="danger">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'DRAFT':
            return <Badge variant="arxiv">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'CLOSING_PENDING':
            // blue-ish — reuse draft badge tinted differently via inline
            return (
                <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: 'rgba(59,130,246,0.12)', color: '#3B82F6',
                    border: '1px solid rgba(59,130,246,0.25)',
                }}>
                    {STATUS_LABELS[status] ?? status}
                </span>
            );
        case 'DEACTIVATED':
        default:
            return <Badge variant="arxiv">{STATUS_LABELS[status] ?? status}</Badge>;
    }
}

/* ─── Cancel-deal modal ─── */
interface CancelDealModalProps {
    listingId: string;
    onClose: () => void;
    onSuccess: () => void;
}

function CancelDealModal({ listingId, onClose, onSuccess }: CancelDealModalProps) {
    const addToast = useToastStore((s) => s.addToast);
    const [availStatus, setAvailStatus] = useState('BOSHDUR');
    const [expectedFreeDate, setExpectedFreeDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await api.patch(`/listings/${listingId}/cancel-deal`);
            // Also update availability status
            await api.patch(`/listings/${listingId}/availability`, {
                availStatus,
                ...(availStatus !== 'BOSHDUR' && expectedFreeDate ? { expectedFreeDate } : {}),
            });
            addToast({ message: 'Sövdələşmə ləğv edildi, elan yenidən aktivdir.', type: 'success' });
            onSuccess();
        } catch (err: any) {
            addToast({ message: err.response?.data?.message || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Sövdələşməni ləğv et</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>
                        <X size={20} />
                    </button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 20 }}>
                    Elan yenidən "Aktiv" statusuna keçəcək. Seçilmiş namizəd növbəyə qaytarılacaq.
                </p>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 8 }}>
                        Yeni mövcudluq statusu
                    </label>
                    <Select
                        value={availStatus}
                        onChange={(e) => setAvailStatus(e.target.value)}
                        options={[
                            { value: 'BOSHDUR', label: '🟢 Boşdur' },
                            { value: 'BOSHALIR', label: '🟡 Boşalır' },
                            { value: 'INSAAT', label: '⚫ İnşaat/Təmir' },
                        ]}
                    />
                </div>

                {availStatus !== 'BOSHDUR' && (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 8 }}>
                            Gözlənilən boşalma tarixi
                        </label>
                        <Input
                            type="date"
                            value={expectedFreeDate}
                            onChange={(e) => setExpectedFreeDate(e.target.value)}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Ləğv et</Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                        Təsdiq et
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function DashboardElanlar() {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);
    const navigate = useNavigate();

    const [cancelDealListingId, setCancelDealListingId] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['my-listings'],
        queryFn: async () => {
            const res = await api.get('/listings/mine');
            return res.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/listings/${id}`),
        onSuccess: () => {
            addToast({ message: 'Elan silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.post(`/listings/${id}/publish`),
        onSuccess: () => {
            addToast({ message: 'Elan moderasiyaya göndərildi!', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
        },
        onError: (err: any) => addToast({ message: err.response?.data?.message || 'Xəta baş verdi', type: 'error' }),
    });

    const confirmDealMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/listings/${id}/confirm-deal`),
        onSuccess: () => {
            addToast({ message: 'Sövdələşmə təsdiqləndi! Elan arxivləşdirildi.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['my-listings'] });
        },
        onError: (err: any) => addToast({ message: err.response?.data?.message || 'Xəta baş verdi', type: 'error' }),
    });

    const listings: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    const stats = {
        total: listings.length,
        active: listings.filter((l) => l.status === 'ACTIVE').length,
        pending: listings.filter((l) => l.status === 'PENDING').length,
        draft: listings.filter((l) => l.status === 'DRAFT').length,
        closing: listings.filter((l) => l.status === 'CLOSING_PENDING').length,
    };

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-surface animate-pulse rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Cancel-deal modal */}
            {cancelDealListingId && (
                <CancelDealModal
                    listingId={cancelDealListingId}
                    onClose={() => setCancelDealListingId(null)}
                    onSuccess={() => {
                        setCancelDealListingId(null);
                        queryClient.invalidateQueries({ queryKey: ['my-listings'] });
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                        <List className="w-6 h-6 text-gold" />
                        Elanlarım
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        Yerləşdirdiyiniz elanları idarə edin.
                    </p>
                </div>
                <Button onClick={() => navigate('/dashboard/elanlar/yeni')} className="shrink-0">
                    <Plus className="w-4 h-4 mr-1" />
                    Yeni elan
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard icon={<List className="w-5 h-5 text-gold" />} label="Cəmi" value={stats.total} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} label="Aktiv" value={stats.active} />
                <StatCard icon={<Clock className="w-5 h-5 text-yellow-400" />} label="Gözləyir" value={stats.pending} />
                <StatCard icon={<FileText className="w-5 h-5 text-muted" />} label="Qaralama" value={stats.draft} />
                <StatCard icon={<HandshakeIcon className="w-5 h-5 text-blue-400" />} label="Bağlanır" value={stats.closing} />
            </div>

            {/* Empty state */}
            {listings.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <List className="w-12 h-12 text-muted mx-auto mb-4 opacity-40" />
                        <p className="text-muted mb-4">Hələ elan yerləşdirməmisiniz</p>
                        <Button onClick={() => navigate('/dashboard/elanlar/yeni')}>
                            <Plus className="w-4 h-4 mr-1" />
                            İlk elanı yarat
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Table */}
            {listings.length > 0 && (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border text-muted">
                                <tr>
                                    <th className="p-4 font-medium">Başlıq</th>
                                    <th className="p-4 font-medium">Növ</th>
                                    <th className="p-4 font-medium">Rayon</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Növbə</th>
                                    <th className="p-4 font-medium">Tarix</th>
                                    <th className="p-4 font-medium text-right">Əməliyyat</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {listings.map((listing: any) => (
                                    <React.Fragment key={listing.id}>
                                        {/* DRAFT banner */}
                                        {listing.status === 'DRAFT' && (
                                            <tr>
                                                <td colSpan={7} className="px-4 pt-3 pb-0">
                                                    <div className="flex items-center gap-2 text-xs text-muted bg-surface border border-border rounded-lg px-3 py-2">
                                                        <FileText className="w-3.5 h-3.5 shrink-0" />
                                                        Qaralama — hələ dərc edilməyib. "Dərc et" düyməsini sıxın.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {/* PENDING banner */}
                                        {listing.status === 'PENDING' && (
                                            <tr>
                                                <td colSpan={7} className="px-4 pt-3 pb-0">
                                                    <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
                                                        <Clock className="w-3.5 h-3.5 shrink-0" />
                                                        Moderasiyada — 24 saat ərzində yoxlanılacaq
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {/* CLOSING_PENDING banner */}
                                        {listing.status === 'CLOSING_PENDING' && (
                                            <tr>
                                                <td colSpan={7} className="px-4 pt-3 pb-0">
                                                    <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg px-3 py-2">
                                                        <HandshakeIcon className="w-3.5 h-3.5 shrink-0" />
                                                        Sövdələşmə gözlənilir — Namizəd seçildi. Sövdələşməni təsdiqlə və ya ləğv et.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {/* REJECTED banner */}
                                        {listing.status === 'REJECTED' && listing.rejectionReason && (
                                            <tr>
                                                <td colSpan={7} className="px-4 pt-3 pb-0">
                                                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        Rədd səbəbi: {listing.rejectionReason}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {/* Row */}
                                        <tr className="hover:bg-surface/50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-medium text-text max-w-[200px] truncate">
                                                    {listing.title}
                                                </div>
                                            </td>
                                            <td className="p-4 text-muted">
                                                {TYPE_LABELS[listing.type] ?? listing.type}
                                            </td>
                                            <td className="p-4 text-muted">{listing.district ?? '—'}</td>
                                            <td className="p-4">
                                                <StatusBadge status={listing.status} />
                                            </td>
                                            <td className="p-4 text-muted">
                                                {listing.queueCount ?? 0} nəfər
                                            </td>
                                            <td className="p-4 text-muted text-xs">
                                                {new Date(listing.createdAt).toLocaleDateString('az-AZ')}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                                    {/* DRAFT: Publish button */}
                                                    {listing.status === 'DRAFT' && (
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="h-8 px-3 text-xs"
                                                            title="Dərc et"
                                                            isLoading={publishMutation.isPending}
                                                            onClick={() => publishMutation.mutate(listing.id)}
                                                        >
                                                            <Send className="w-3.5 h-3.5 mr-1" />
                                                            Dərc et
                                                        </Button>
                                                    )}
                                                    {/* CLOSING_PENDING: Confirm + Cancel */}
                                                    {listing.status === 'CLOSING_PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                className="h-8 px-3 text-xs"
                                                                title="Sövdələşməni təsdiqlə"
                                                                isLoading={confirmDealMutation.isPending}
                                                                onClick={() => {
                                                                    if (confirm('Sövdələşməni təsdiqləmək istədiyinizə əminsiniz? Elan arxivə keçəcək.')) {
                                                                        confirmDealMutation.mutate(listing.id);
                                                                    }
                                                                }}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                                Təsdiqlə
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-3 text-xs text-red hover:bg-red/10"
                                                                title="Sövdələşməni ləğv et"
                                                                onClick={() => setCancelDealListingId(listing.id)}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                                                Ləğv et
                                                            </Button>
                                                        </>
                                                    )}
                                                    {/* View */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        title="Bax"
                                                        onClick={() => window.open(`/elan/${listing.id}`, '_blank')}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {/* Delete */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red hover:text-red hover:bg-red/10"
                                                        title="Sil"
                                                        onClick={() => {
                                                            if (confirm('Bu elanı silmək istədiyinizə əminsiniz?')) {
                                                                deleteMutation.mutate(listing.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <Card>
            <CardContent className="p-4 flex items-center gap-3">
                {icon}
                <div>
                    <div className="text-2xl font-bold text-text">{value}</div>
                    <div className="text-xs text-muted">{label}</div>
                </div>
            </CardContent>
        </Card>
    );
}
