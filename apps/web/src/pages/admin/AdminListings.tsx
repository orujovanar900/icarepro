import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, CheckCircle2, XCircle, ShieldAlert, Flag, ExternalLink, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

/* ──────────── Types ──────────── */
type ListingStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'ALL';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Gözləyir',
    ACTIVE: 'Aktiv',
    REJECTED: 'Rədd edildi',
    DEACTIVATED: 'Deaktiv',
};

const REJECT_REASONS = [
    'Dublikat elan',
    'Yanlış/natamam məlumat',
    'Saxtakarlıq şübhəsi',
    'Qaydalar pozuntusu',
    'Digər',
];

const TYPE_LABELS: Record<string, string> = {
    MENZIL: 'Mənzil', OFIS: 'Ofis', MAGAZA: 'Mağaza', ANBAR: 'Anbar',
    KOMERSIYA: 'Komersiya', TORPAQ: 'Torpaq', HEYET_EVI: 'Həyət evi', VILLA: 'Villa',
};

function ListingStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE': return <Badge variant="aktiv">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'PENDING': return <Badge variant="draft">{STATUS_LABELS[status] ?? status}</Badge>;
        case 'REJECTED': return <Badge variant="danger">{STATUS_LABELS[status] ?? status}</Badge>;
        default: return <Badge variant="arxiv">{STATUS_LABELS[status] ?? status}</Badge>;
    }
}

/* ──────────── Main Component ──────────── */
export function AdminListings() {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);

    const [mainTab, setMainTab] = useState<'listings' | 'reports'>('listings');
    const [statusFilter, setStatusFilter] = useState<ListingStatus>('PENDING');

    // Preview modal state
    const [previewListing, setPreviewListing] = useState<any>(null);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState<{ id: string; listingId?: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectNote, setRejectNote] = useState('');

    /* ── Listings query ── */
    const { data: listingsData, isLoading: listingsLoading } = useQuery({
        queryKey: ['admin-listings', statusFilter],
        queryFn: async () => {
            const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            const res = await api.get(`/admin/listings${params}`);
            return res.data;
        },
    });

    /* ── Listings stats query ── */
    const { data: statsData } = useQuery({
        queryKey: ['admin-listings-stats'],
        queryFn: async () => {
            const res = await api.get('/admin/listings/stats');
            return res.data;
        },
    });

    /* ── Reports query ── */
    const { data: reportsData, isLoading: reportsLoading } = useQuery({
        queryKey: ['admin-reports'],
        queryFn: async () => {
            const res = await api.get('/admin/reports?status=PENDING');
            return res.data;
        },
        enabled: mainTab === 'reports',
    });

    /* ── Moderate mutation ── */
    const moderateMutation = useMutation({
        mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
            api.patch(`/admin/listings/${id}/moderate`, { action, reason }),
        onSuccess: (_, vars) => {
            const msg = vars.action === 'approve' ? 'Elan təsdiqləndi' : 'Elan rədd edildi';
            addToast({ message: msg, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
            queryClient.invalidateQueries({ queryKey: ['admin-listings-stats'] });
            setPreviewListing(null);
            setRejectTarget(null);
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    /* ── Resolve report mutation ── */
    const resolveReportMutation = useMutation({
        mutationFn: (reportId: string) =>
            api.patch(`/admin/reports/${reportId}`, { action: 'resolve' }),
        onSuccess: () => {
            addToast({ message: 'Şikayət həll edildi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    const handleReject = () => {
        if (!rejectTarget || !rejectReason) return;
        const finalReason = rejectNote ? `${rejectReason}: ${rejectNote}` : rejectReason;
        moderateMutation.mutate({ id: rejectTarget.id, action: 'reject', reason: finalReason });
        setRejectReason('');
        setRejectNote('');
    };

    const listings: any[] = Array.isArray(listingsData?.data) ? listingsData.data : (Array.isArray(listingsData) ? listingsData : []);
    const reports: any[] = Array.isArray(reportsData?.data) ? reportsData.data : (Array.isArray(reportsData) ? reportsData : []);
    const stats = statsData?.data ?? statsData ?? {};

    const STATUS_TABS: { key: ListingStatus; label: string }[] = [
        { key: 'PENDING', label: `⏳ Gözləyir${stats.pending ? ` (${stats.pending})` : ''}` },
        { key: 'ACTIVE', label: `✅ Aktiv${stats.active ? ` (${stats.active})` : ''}` },
        { key: 'REJECTED', label: `❌ Rədd edildi${stats.rejected ? ` (${stats.rejected})` : ''}` },
        { key: 'ALL', label: 'Hamısı' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-gold" />
                    Elan Moderasiyası
                </h1>
                <p className="text-sm text-muted mt-1">Elanları yoxlayın və şikayətləri idarə edin.</p>
            </div>

            {/* Main tabs */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setMainTab('listings')}
                    className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                        mainTab === 'listings' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'
                    }`}
                >
                    📢 Elanlar
                </button>
                <button
                    onClick={() => setMainTab('reports')}
                    className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
                        mainTab === 'reports' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'
                    }`}
                >
                    🚩 Şikayətlər
                </button>
            </div>

            {/* ── LISTINGS TAB ── */}
            {mainTab === 'listings' && (
                <>
                    {/* Status sub-tabs */}
                    <div className="flex flex-wrap gap-2">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                    statusFilter === tab.key
                                        ? 'bg-gold/10 border-gold/50 text-gold'
                                        : 'border-border text-muted hover:border-gold/30'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {listingsLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface animate-pulse rounded-xl" />)}
                        </div>
                    ) : (
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface border-b border-border text-muted">
                                        <tr>
                                            <th className="p-4 font-medium">Elan</th>
                                            <th className="p-4 font-medium">Sahibi / Org</th>
                                            <th className="p-4 font-medium">Rayon</th>
                                            <th className="p-4 font-medium">Növbə</th>
                                            <th className="p-4 font-medium">Tarix</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium text-right">Əməliyyat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {listings.map((listing: any) => (
                                            <tr key={listing.id} className="hover:bg-surface/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 overflow-hidden"
                                                        >
                                                            {listing.photos?.[0] ? (
                                                                <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-gold text-xs font-bold">
                                                                    {(listing.type ?? '?').slice(0, 2)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="max-w-[180px]">
                                                            <div className="font-medium text-text truncate">{listing.title}</div>
                                                            <div className="text-xs text-muted">{TYPE_LABELS[listing.type] ?? listing.type}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-muted text-sm">
                                                    <div>{listing.organization?.name ?? '—'}</div>
                                                    <div className="text-xs">{listing.publisher?.name ?? listing.owner?.name ?? '—'}</div>
                                                </td>
                                                <td className="p-4 text-muted">{listing.district ?? '—'}</td>
                                                <td className="p-4 text-muted">{listing.queueCount ?? 0} nəfər</td>
                                                <td className="p-4 text-muted text-xs">
                                                    {new Date(listing.createdAt).toLocaleDateString('az-AZ')}
                                                </td>
                                                <td className="p-4">
                                                    <ListingStatusBadge status={listing.status} />
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="h-8 w-8 p-0" title="Bax"
                                                            onClick={() => setPreviewListing(listing)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {listing.status !== 'ACTIVE' && (
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="h-8 px-2 text-green-400 hover:bg-green-400/10 hover:text-green-400 text-xs font-semibold"
                                                                onClick={() => moderateMutation.mutate({ id: listing.id, action: 'approve' })}
                                                                disabled={moderateMutation.isPending}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Təsdiqlə
                                                            </Button>
                                                        )}
                                                        {listing.status !== 'REJECTED' && (
                                                            <Button
                                                                size="sm" variant="ghost"
                                                                className="h-8 px-2 text-red hover:bg-red/10 hover:text-red text-xs font-semibold"
                                                                onClick={() => setRejectTarget({ id: listing.id })}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-1" /> Rədd et
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {listings.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-muted">
                                                    Bu filtrdə heç bir elan tapılmadı.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ── REPORTS TAB ── */}
            {mainTab === 'reports' && (
                <>
                    {reportsLoading ? (
                        <div className="space-y-2">
                            {[1, 2].map((i) => <div key={i} className="h-16 bg-surface animate-pulse rounded-xl" />)}
                        </div>
                    ) : (
                        <Card className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface border-b border-border text-muted">
                                        <tr>
                                            <th className="p-4 font-medium">Elan</th>
                                            <th className="p-4 font-medium">Şikayətçi ID</th>
                                            <th className="p-4 font-medium">Səbəb</th>
                                            <th className="p-4 font-medium">Tarix</th>
                                            <th className="p-4 font-medium text-right">Əməliyyat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reports.map((report: any) => (
                                            <tr key={report.id} className="hover:bg-surface/50 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-text max-w-[160px] truncate">
                                                        {report.listing?.title ?? report.listingId}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-muted text-xs font-mono">
                                                    {report.reporterId ?? report.userId ?? '—'}
                                                </td>
                                                <td className="p-4 text-muted text-sm max-w-[180px]">
                                                    {report.reason ?? '—'}
                                                </td>
                                                <td className="p-4 text-muted text-xs">
                                                    {new Date(report.createdAt).toLocaleDateString('az-AZ')}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="h-8 px-2 text-xs"
                                                            title="Elanı bax"
                                                            onClick={() => window.open(`/elan/${report.listingId}`, '_blank')}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Elanı bax
                                                        </Button>
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="h-8 px-2 text-green-400 hover:bg-green-400/10 text-xs font-semibold"
                                                            onClick={() => resolveReportMutation.mutate(report.id)}
                                                            disabled={resolveReportMutation.isPending}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Həll et
                                                        </Button>
                                                        <Button
                                                            size="sm" variant="ghost"
                                                            className="h-8 px-2 text-red hover:bg-red/10 hover:text-red text-xs font-semibold"
                                                            onClick={() => setRejectTarget({
                                                                id: report.listingId,
                                                                listingId: report.listingId,
                                                            })}
                                                        >
                                                            <Flag className="w-3.5 h-3.5 mr-1" /> Deaktiv et
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {reports.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-muted">
                                                    Aktiv şikayət yoxdur.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* ────────── Preview Modal ────────── */}
            {previewListing && (
                <Modal isOpen onClose={() => setPreviewListing(null)} title={previewListing.title ?? 'Elan'}>
                    <div className="space-y-4">
                        {/* Photos grid */}
                        {previewListing.photos?.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {previewListing.photos.slice(0, 3).map((url: string, i: number) => (
                                    <img
                                        key={i}
                                        src={url}
                                        alt={`Photo ${i + 1}`}
                                        className="w-full h-24 object-cover rounded-lg"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <InfoRow label="Növ" value={TYPE_LABELS[previewListing.type] ?? previewListing.type} />
                            <InfoRow label="Rayon" value={previewListing.district ?? '—'} />
                            <InfoRow label="Ünvan" value={previewListing.address ?? '—'} />
                            <InfoRow label="Sahə" value={previewListing.area ? `${previewListing.area} m²` : '—'} />
                            {previewListing.rooms && <InfoRow label="Otaqlar" value={`${previewListing.rooms} otaq`} />}
                            <InfoRow label="Mövcudluq" value={previewListing.availStatus ?? '—'} />
                            <InfoRow label="Təşkilat" value={previewListing.organization?.name ?? '—'} />
                            <InfoRow label="Status">
                                <ListingStatusBadge status={previewListing.status} />
                            </InfoRow>
                        </div>

                        {previewListing.description && (
                            <div>
                                <p className="text-xs text-muted font-medium mb-1">Açıqlama</p>
                                <p className="text-sm text-text">{previewListing.description}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 border-t border-border">
                            <Button
                                className="flex-1"
                                onClick={() => moderateMutation.mutate({ id: previewListing.id, action: 'approve' })}
                                disabled={moderateMutation.isPending || previewListing.status === 'ACTIVE'}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1" /> Təsdiqlə
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                onClick={() => {
                                    setRejectTarget({ id: previewListing.id });
                                    setPreviewListing(null);
                                }}
                            >
                                <XCircle className="w-4 h-4 mr-1" /> Rədd et
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ────────── Reject Modal ────────── */}
            {rejectTarget && (
                <Modal isOpen onClose={() => { setRejectTarget(null); setRejectReason(''); setRejectNote(''); }} title="Rədd etmə səbəbi">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            {REJECT_REASONS.map((reason) => (
                                <label
                                    key={reason}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                        rejectReason === reason
                                            ? 'border-red/50 bg-red/5 text-text'
                                            : 'border-border text-muted hover:border-red/30'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="rejectReason"
                                        value={reason}
                                        checked={rejectReason === reason}
                                        onChange={() => setRejectReason(reason)}
                                        className="accent-red-500"
                                    />
                                    <span className="text-sm">{reason}</span>
                                </label>
                            ))}
                        </div>
                        <div>
                            <label className="text-xs text-muted font-medium block mb-1">Əlavə qeyd (istəyə görə)</label>
                            <textarea
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="Əlavə izahat..."
                                rows={3}
                                className="w-full px-3 py-2 rounded-md border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-red resize-none"
                            />
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-border">
                            <Button
                                variant="ghost"
                                className="flex-1"
                                onClick={() => { setRejectTarget(null); setRejectReason(''); setRejectNote(''); }}
                            >
                                Ləğv et
                            </Button>
                            <Button
                                variant="danger"
                                className="flex-1"
                                onClick={handleReject}
                                disabled={!rejectReason || moderateMutation.isPending}
                                isLoading={moderateMutation.isPending}
                            >
                                <XCircle className="w-4 h-4 mr-1" /> Rədd et
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/* ── Helper ── */
function InfoRow({
    label, value, children,
}: {
    label: string;
    value?: string;
    children?: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-xs text-muted">{label}</p>
            {children ?? <p className="font-medium text-text mt-0.5">{value}</p>}
        </div>
    );
}
