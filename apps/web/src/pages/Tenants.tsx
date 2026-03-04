import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Plus, ChevronLeft, ChevronRight, Trash2, Eye, Pencil, Building2, User, ArchiveRestore } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToastStore } from '@/store/toast';

const formatMoney = (amount: number) =>
    new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(amount);

const getTenantName = (t: any): string => {
    if (t.fullName) return t.fullName; // backward compat
    if (t.tenantType === 'fiziki') return `${t.firstName || ''} ${t.lastName || ''}`.trim() || '—';
    return t.companyName || '—';
};

type TabKey = 'all' | 'fiziki' | 'huquqi' | 'aktiv' | 'passiv' | 'blacklist';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Hamısı' },
    { key: 'aktiv', label: '🟢 Aktiv' },
    { key: 'passiv', label: '⚪ Passiv' },
    { key: 'fiziki', label: '👤 Fiziki Şəxs' },
    { key: 'huquqi', label: '🏢 Hüquqi Şəxs' },
    { key: 'blacklist', label: '🚫 Qara siyahı' },
];

export function Tenants() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [page, setPage] = useState(1);
    const [showDeleted, setShowDeleted] = useState(false);
    const limit = 20;

    React.useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const { data: tenantsData, isLoading, isError, refetch } = useQuery({
        queryKey: ['tenants', debouncedSearch, page, showDeleted],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (showDeleted) params.append('deleted', 'true');
            const res = await api.get(`/tenants?${params}`);
            return res.data;
        },
    });

    const { data: contractsData } = useQuery({
        queryKey: ['all-active-contracts-for-tenants'],
        queryFn: async () => (await api.get('/contracts?status=ACTIVE&limit=1000')).data,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/tenants/${id}`),
        onSuccess: () => { addToast({ message: 'İcarəçi silindi', type: 'success' }); queryClient.invalidateQueries({ queryKey: ['tenants'] }); },
        onError: (err: any) => addToast({ message: err?.response?.data?.error || 'Silinmə xətası', type: 'error' }),
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/tenants/${id}/restore`),
        onSuccess: () => { addToast({ message: 'İcarəçi bərpa edildi', type: 'success' }); queryClient.invalidateQueries({ queryKey: ['tenants'] }); },
        onError: (err: any) => addToast({ message: 'Bərpa xətası', type: 'error' }),
    });

    const rawTenants: any[] = Array.isArray(tenantsData?.data) ? tenantsData.data : [];
    const activeContracts: any[] = Array.isArray(contractsData?.data) ? contractsData.data : [];
    const meta = tenantsData?.meta || { total: 0 };
    const totalPages = Math.ceil((meta.total || 0) / limit);
    const canAdd = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'].includes(user?.role || '');
    const isOwner = user?.role === 'OWNER';

    // Attach debt and active status from contracts query
    const tenants = rawTenants.map((t: any) => {
        const debt = activeContracts
            .filter((c: any) => c.tenantId === t.id)
            .reduce((sum: number, c: any) => sum + (c.debt || 0), 0);
        const hasActiveContract = activeContracts.some((c: any) => c.tenantId === t.id);
        return { ...t, calculatedDebt: debt, fullName: getTenantName(t), hasActiveContract };
    });

    // Client-side tab filter
    const filtered = tenants.filter((t: any) => {
        if (activeTab === 'fiziki') return t.tenantType === 'fiziki';
        if (activeTab === 'huquqi') return t.tenantType === 'huquqi';
        if (activeTab === 'blacklist') return t.isBlacklisted;
        if (activeTab === 'aktiv') return t.hasActiveContract;
        if (activeTab === 'passiv') return !t.hasActiveContract;
        return true;
    });

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Users className="w-8 h-8 text-gold" />
                    İcarəçilər
                    <span className="text-base font-normal text-muted ml-2">({meta.total || 0})</span>
                </h1>
                {canAdd && (
                    <Button onClick={() => navigate('/tenants/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni İcarəçi
                    </Button>
                )}
            </div>

            {/* Search */}
            <Card variant="elevated">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Ad, FİN, VÖEN, telefon ilə axtarış..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant={showDeleted ? undefined : 'outline'}
                            onClick={() => {
                                setShowDeleted(!showDeleted);
                                setPage(1);
                            }}
                            className={showDeleted ? 'bg-red/10 text-red border-red/20 hover:bg-red/20' : ''}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {showDeleted ? 'Aktivləri Göstər' : 'Silinmişləri Göstər'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${activeTab === tab.key
                            ? 'bg-gold text-black border-gold'
                            : 'bg-surface text-muted border-border hover:border-gold hover:text-text'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <Card variant="default">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={10} columns={6} /></div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red">
                            <p>Məlumatları yükləmək mümkün olmadı.</p>
                            <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>İcarəçi tapılmadı.</p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ad / Şirkət</TableHead>
                                            <TableHead>FİN / VÖEN</TableHead>
                                            <TableHead>Telefon</TableHead>
                                            <TableHead>Aktiv müqavilələr</TableHead>
                                            <TableHead className="text-right">Ümumi borc</TableHead>
                                            <TableHead className="text-right">Əməliyyatlar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((t: any) => {
                                            const activeCount = t.contracts?.length || 0;
                                            const isFiziki = t.tenantType === 'fiziki';

                                            return (
                                                <TableRow
                                                    key={t.id}
                                                    className="cursor-pointer hover:bg-surface transition-colors"
                                                    onClick={() => navigate(`/tenants/${t.id}`)}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg" title={isFiziki ? 'Fiziki şəxs' : 'Hüquqi şəxs'}>
                                                                {isFiziki ? '👤' : '🏢'}
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-text">{t.fullName}</p>
                                                                <div className="flex gap-1 flex-wrap mt-0.5">
                                                                    {t.hasActiveContract
                                                                        ? <Badge variant="aktiv" className="text-xs">Aktiv</Badge>
                                                                        : <Badge variant="arxiv" className="text-xs">Passiv</Badge>
                                                                    }
                                                                    {t.isBlacklisted && (
                                                                        <Badge variant="danger" className="text-xs">🚫 Qara siyahı</Badge>
                                                                    )}
                                                                    {showDeleted && (
                                                                        <Badge variant="arxiv" className="text-xs bg-red/10 text-red border-red/20">Silinib</Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted font-mono">
                                                        {isFiziki ? (t.fin || '—') : (t.voen || '—')}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-text">{t.phone || '—'}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {activeCount > 0
                                                            ? <Badge variant="aktiv">{activeCount} müqavilə</Badge>
                                                            : <span className="text-muted">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {t.calculatedDebt > 0
                                                            ? <span className="font-bold text-red">{formatMoney(t.calculatedDebt)}</span>
                                                            : <span className="text-green font-medium">Yoxdur</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {showDeleted ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-green/50 text-green hover:bg-green/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        restoreMutation.mutate(t.id);
                                                                    }}
                                                                    disabled={restoreMutation.isPending}
                                                                >
                                                                    <ArchiveRestore className="w-4 h-4 mr-2" />
                                                                    Bərpa et
                                                                </Button>
                                                            ) : (
                                                                <>
                                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/tenants/${t.id}`)}>
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                    {canAdd && (
                                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/tenants/${t.id}/edit`)}>
                                                                            <Pencil className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                    {isOwner && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-red hover:text-red"
                                                                            onClick={() => {
                                                                                if (confirm(`"${t.fullName}" silinsin?`)) deleteMutation.mutate(t.id);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden flex flex-col divide-y divide-border">
                                {filtered.map((t: any) => {
                                    const activeCount = t.contracts?.length || 0;
                                    const isFiziki = t.tenantType === 'fiziki';
                                    return (
                                        <div
                                            key={`mob-${t.id}`}
                                            className="p-4 cursor-pointer hover:bg-surface transition-colors flex items-center justify-between group"
                                            onClick={() => navigate(`/tenants/${t.id}`)}
                                        >
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-base shrink-0" title={isFiziki ? 'Fiziki şəxs' : 'Hüquqi şəxs'}>
                                                            {isFiziki ? '👤' : '🏢'}
                                                        </span>
                                                        <span className="text-sm font-bold text-text truncate group-hover:text-gold transition-colors">{t.fullName}</span>
                                                    </div>
                                                    {t.isBlacklisted && <Badge variant="danger" className="text-[10px] px-1.5 py-0 h-4 ml-2 shrink-0">🚫</Badge>}
                                                    {showDeleted && <Badge variant="arxiv" className="text-[10px] px-1.5 py-0 h-4 ml-2 shrink-0 bg-red/10 text-red border-red/20">Silinib</Badge>}
                                                </div>
                                                <div className="text-xs text-muted mb-3 flex flex-col gap-1">
                                                    <span>{isFiziki ? 'FİN' : 'VÖEN'}: <span className="text-text font-mono">{isFiziki ? (t.fin || '—') : (t.voen || '—')}</span></span>
                                                    <span>Tel: <span className="text-text">{t.phone || '—'}</span></span>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between gap-y-2">
                                                    {activeCount > 0 ? (
                                                        <Badge variant="aktiv" className="text-[10px] py-0 h-5 shrink-0">{activeCount} müqavilə</Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted">Aktiv müqavilə yoxdur</span>
                                                    )}
                                                    {t.calculatedDebt > 0 && (
                                                        <span className="font-bold text-red text-sm shrink-0">Borc: {formatMoney(t.calculatedDebt)}</span>
                                                    )}
                                                </div>
                                                {showDeleted ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-green/50 text-green hover:bg-green/10 mt-2 w-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            restoreMutation.mutate(t.id);
                                                        }}
                                                        disabled={restoreMutation.isPending}
                                                    >
                                                        <ArchiveRestore className="w-4 h-4 mr-2" />
                                                        Bərpa et
                                                    </Button>
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-muted shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Əvvəlki
                    </Button>
                    <span className="text-sm text-muted">Səhifə {page} / {totalPages}</span>
                    <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        Sonrakı <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
