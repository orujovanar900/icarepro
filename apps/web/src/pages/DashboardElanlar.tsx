import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, AlertCircle, Clock, CheckCircle2, XCircle, List } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Gözləyir',
    ACTIVE: 'Aktiv',
    REJECTED: 'Rədd edildi',
    DEACTIVATED: 'Deaktiv',
};

const TYPE_LABELS: Record<string, string> = {
    MENZIL: 'Mənzil',
    OFIS: 'Ofis',
    MAGAZA: 'Mağaza',
    ANBAR: 'Anbar',
    KOMERSIYA: 'Komersiya',
    TORPAQ: 'Torpaq',
    HEYET_EVI: 'Həyət evi',
    VILLA: 'Villa',
};

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE':
            return <Badge variant="aktiv">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'PENDING':
            return <Badge variant="draft">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'REJECTED':
            return <Badge variant="danger">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'DEACTIVATED':
        default:
            return <Badge variant="arxiv">{STATUS_LABELS[status] ?? status}</Badge>;
    }
}

export function DashboardElanlar() {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);
    const navigate = useNavigate();

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

    const listings: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    const stats = {
        total: listings.length,
        active: listings.filter((l) => l.status === 'ACTIVE').length,
        pending: listings.filter((l) => l.status === 'PENDING').length,
        rejected: listings.filter((l) => l.status === 'REJECTED').length,
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon={<List className="w-5 h-5 text-gold" />} label="Cəmi" value={stats.total} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-400" />} label="Aktiv" value={stats.active} />
                <StatCard icon={<Clock className="w-5 h-5 text-yellow-400" />} label="Gözləyir" value={stats.pending} />
                <StatCard icon={<XCircle className="w-5 h-5 text-red-400" />} label="Rədd edildi" value={stats.rejected} />
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
                                        {/* REJECTED banner */}
                                        {listing.status === 'REJECTED' && listing.rejectionReason && (
                                            <tr>
                                                <td colSpan={7} className="px-4 pt-3 pb-0">
                                                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        Rədd səbəbi: {listing.rejectionReason}
                                                        <button
                                                            className="ml-auto text-red-400 underline"
                                                            onClick={() => navigate(`/dashboard/elanlar/${listing.id}/edit`)}
                                                        >
                                                            Düzəlt
                                                        </button>
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
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        title="Bax"
                                                        onClick={() => window.open(`/elan/${listing.id}`, '_blank')}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        title="Düzəlt"
                                                        onClick={() => navigate(`/dashboard/elanlar/${listing.id}/edit`)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
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
