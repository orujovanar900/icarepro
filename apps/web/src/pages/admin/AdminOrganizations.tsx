import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, Building2, Users, Search, AlertCircle, X, ArrowUpDown, Play, Pause, Clock, PencilLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToastStore } from '@/store/toast';
import { Link } from 'react-router-dom';
import { PlanModal } from '@/components/admin/PlanModal';

export function AdminOrganizations() {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);

    // Plan Modal
    const [planModalOrg, setPlanModalOrg] = useState<any>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('Hamısı');
    const [propCountFilter, setPropCountFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');

    // Sorting
    const [sortKey, setSortKey] = useState<'name' | 'properties' | 'createdAt' | 'plan'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data: orgsData, isLoading } = useQuery({
        queryKey: ['admin-organizations'],
        queryFn: async () => {
            const res = await api.get('/admin/users');
            return res.data;
        }
    });

    const subscriptionMutation = useMutation({
        mutationFn: ({ id, status, additionalDays }: { id: string, status: string, additionalDays?: number }) =>
            api.patch(`/admin/organizations/${id}/subscription`, { status, additionalDays }),
        onSuccess: () => {
            addToast({ message: 'Abunəlik statusu yeniləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' })
    });

    const orgs = Array.isArray(orgsData?.data) ? orgsData.data : [];

    // Filter Logic
    const filteredOrgs = orgs.filter((o: any) => {
        // Search
        const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
            o.ownerEmail.toLowerCase().includes(search.toLowerCase());

        // Plan Filter (Assuming Hamısı | Başlanğıc (PRO) | Biznes | Korporativ | Pulsuz (FREE/FREE_TRIAL))
        let matchesPlan = true;
        if (planFilter !== 'Hamısı') {
            matchesPlan =
                (planFilter === 'Pulsuz' && (o.subscriptionPlan === 'FREE_TRIAL' || o.subscriptionPlan === 'FREE')) ||
                (planFilter === 'Başlanğıc' && o.subscriptionPlan === 'BASHLANQIC') ||
                (planFilter === 'Biznes' && o.subscriptionPlan === 'BIZNES') ||
                (planFilter === 'Korporativ' && o.subscriptionPlan === 'KORPORATIV') ||
                (planFilter === o.plan); // Fallback to old plan ENUM if needed
        }

        // Property Count Filter
        let matchesPropCount = true;
        if (propCountFilter === '1-5') matchesPropCount = o.propertiesCount >= 1 && o.propertiesCount <= 5;
        if (propCountFilter === '6-15') matchesPropCount = o.propertiesCount >= 6 && o.propertiesCount <= 15;
        if (propCountFilter === '16-50') matchesPropCount = o.propertiesCount >= 16 && o.propertiesCount <= 50;
        if (propCountFilter === '50+') matchesPropCount = o.propertiesCount > 50;

        // Date Filter
        let matchesDate = true;
        const orgDate = new Date(o.createdAt);
        const today = new Date();
        if (dateFilter === 'Bu gün') {
            matchesDate = orgDate.toDateString() === today.toDateString();
        } else if (dateFilter === 'Bu həftə') {
            const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
            matchesDate = orgDate >= weekAgo;
        } else if (dateFilter === 'Bu ay') {
            matchesDate = orgDate.getMonth() === today.getMonth() && orgDate.getFullYear() === today.getFullYear();
        } else if (dateFilter === 'Bu il') {
            matchesDate = orgDate.getFullYear() === today.getFullYear();
        } else if (dateFilter === 'Xüssüsi') {
            if (customDateStart) matchesDate = orgDate >= new Date(customDateStart);
            if (customDateEnd) matchesDate = matchesDate && orgDate <= new Date(new Date(customDateEnd).setHours(23, 59, 59));
        }

        // Status Filter
        let matchesStatus = true;
        if (statusFilter === 'Aktiv') matchesStatus = o.subscriptionStatus === 'ACTIVE';
        if (statusFilter === 'Möhlət') matchesStatus = o.subscriptionStatus === 'GRACE_PERIOD';
        if (statusFilter === 'Dayandırılıb') matchesStatus = o.subscriptionStatus === 'SUSPENDED';

        return matchesSearch && matchesPlan && matchesPropCount && matchesDate && matchesStatus;
    });

    // Sort Logic
    filteredOrgs.sort((a: any, b: any) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        if (sortKey === 'properties') cmp = a.propertiesCount - b.propertiesCount;
        if (sortKey === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortKey === 'plan') cmp = (a.subscriptionPlan || a.plan).localeCompare(b.subscriptionPlan || b.plan);
        return sortOrder === 'asc' ? cmp : -cmp;
    });

    const handleSort = (key: typeof sortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const hasActiveFilters = planFilter !== 'Hamısı' || propCountFilter !== 'all' ||
        dateFilter !== 'all' || statusFilter !== 'all' || search !== '' ||
        (customDateStart !== '' || customDateEnd !== '');

    const resetFilters = () => {
        setSearch(''); setPlanFilter('Hamısı'); setPropCountFilter('all');
        setDateFilter('all'); setStatusFilter('all');
        setCustomDateStart(''); setCustomDateEnd('');
    };

    const renderSubscriptionBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <Badge variant="aktiv">Aktiv</Badge>;
            case 'GRACE_PERIOD': return <Badge className="bg-orange/10 text-orange border-orange/20">Möhlət</Badge>;
            case 'SUSPENDED': return <Badge variant="danger">Dayandırılıb</Badge>;
            default: return <Badge variant="danger">{status}</Badge>;
        }
    };

    if (isLoading) return <div className="p-6">Yüklənir...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                        <Shield className="w-6 h-6 text-gold" />
                        Təşkilatlar (Admin)
                    </h1>
                    <p className="text-sm text-muted mt-1">Platformadakı bütüm təşkilatların siyahısı və abunəlik idarəsi.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <Input
                                placeholder="Təşkilat və ya email ilə axtarış..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                rightElement={<Search className="w-4 h-4 text-muted" />}
                            />
                        </div>
                        <Select
                            value={planFilter}
                            onChange={(e) => setPlanFilter(e.target.value)}
                            options={[
                                { label: 'Bütün Planlar', value: 'Hamısı' },
                                { label: 'Pulsuz', value: 'Pulsuz' },
                                { label: 'Başlanğıc', value: 'Başlanğıc' },
                                { label: 'Biznes', value: 'Biznes' },
                                { label: 'Korporativ', value: 'Korporativ' },
                            ]}
                        />
                        <Select
                            value={propCountFilter}
                            onChange={(e) => setPropCountFilter(e.target.value)}
                            options={[
                                { label: 'Bütün Obyektlər', value: 'all' },
                                { label: '1-5 obyekt', value: '1-5' },
                                { label: '6-15 obyekt', value: '6-15' },
                                { label: '16-50 obyekt', value: '16-50' },
                                { label: '50+ obyekt', value: '50+' },
                            ]}
                        />
                        <Select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            options={[
                                { label: 'Bütün Tarixlər', value: 'all' },
                                { label: 'Bu gün', value: 'Bu gün' },
                                { label: 'Bu həftə', value: 'Bu həftə' },
                                { label: 'Bu ay', value: 'Bu ay' },
                                { label: 'Bu il', value: 'Bu il' },
                            ]}
                        />
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { label: 'Bütün Statuslar', value: 'all' },
                                { label: 'Aktiv', value: 'Aktiv' },
                                { label: 'Möhlət', value: 'Möhlət' },
                                { label: 'Dayandırılıb', value: 'Dayandırılıb' },
                            ]}
                        />
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                            <span className="text-sm text-muted">Aktiv filtrlər:</span>
                            {search && <Badge className="bg-surface border-border gap-1 pr-1">{search} <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch('')} /></Badge>}
                            {planFilter !== 'all' && <Badge className="bg-surface border-border gap-1 pr-1">{planFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setPlanFilter('all')} /></Badge>}
                            {propCountFilter !== 'all' && <Badge className="bg-surface border-border gap-1 pr-1">{propCountFilter} obyekt <X className="w-3 h-3 cursor-pointer" onClick={() => setPropCountFilter('all')} /></Badge>}
                            {dateFilter !== 'all' && <Badge className="bg-surface border-border gap-1 pr-1">{dateFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFilter('all')} /></Badge>}
                            {statusFilter !== 'all' && <Badge className="bg-surface border-border gap-1 pr-1">{statusFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('all')} /></Badge>}

                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-red h-6 px-2 text-xs hover:bg-red/10 hover:text-red">
                                Filtrləri sıfırla
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Organizations Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface border-b border-border text-muted">
                            <tr>
                                <th className="p-4 font-medium cursor-pointer hover:text-text" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">Təşkilat adı <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="p-4 font-medium">Sahib</th>
                                <th className="p-4 font-medium cursor-pointer hover:text-text" onClick={() => handleSort('properties')}>
                                    <div className="flex items-center gap-1">Obyekt sayı <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-text" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-1">Yaradılma tarixi <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="p-4 font-medium cursor-pointer hover:text-text" onClick={() => handleSort('plan')}>
                                    <div className="flex items-center gap-1">Plan <ArrowUpDown className="w-3 h-3" /></div>
                                </th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Əməliyyatlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredOrgs.map((org: any) => (
                                <tr key={org.id} className="hover:bg-surface/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <Link to={`/admin/organizations/${org.id}`} className="font-bold text-text hover:text-gold transition-colors">{org.name}</Link>
                                                <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {org.usersCount}</span>
                                                    <span>•</span>
                                                    <span>{org.tenantsCount} Kirayəçi</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted">{org.ownerEmail}</td>
                                    <td className="p-4 font-medium text-text">{org.propertiesCount}</td>
                                    <td className="p-4 text-muted">{new Date(org.createdAt).toLocaleDateString('az-AZ')}</td>
                                    <td className="p-4">
                                        <Badge className="bg-surface border-border text-muted">
                                            {org.subscriptionPlan || org.plan}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        {renderSubscriptionBadge(org.subscriptionStatus || 'N/A')}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {org.subscriptionStatus !== 'ACTIVE' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-green hover:bg-green/10 hover:text-green cursor-pointer"
                                                    onClick={() => subscriptionMutation.mutate({ id: org.id, status: 'ACTIVE' })}
                                                    title="Aktivləşdir"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {org.subscriptionStatus !== 'GRACE_PERIOD' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-orange hover:bg-orange/10 hover:text-orange cursor-pointer"
                                                    onClick={() => subscriptionMutation.mutate({ id: org.id, status: 'GRACE_PERIOD', additionalDays: 10 })}
                                                    title="10 gün möhlət ver"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {org.subscriptionStatus !== 'SUSPENDED' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-red hover:bg-red/10 hover:text-red cursor-pointer"
                                                    onClick={() => {
                                                        if (confirm('Təşkilatı dayandırmaq istədiyinizə əminsiniz?')) {
                                                            subscriptionMutation.mutate({ id: org.id, status: 'SUSPENDED' });
                                                        }
                                                    }}
                                                    title="Dayandır"
                                                >
                                                    <Pause className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 px-2 text-gold hover:bg-gold/10 hover:text-gold cursor-pointer"
                                                onClick={() => setPlanModalOrg(org)}
                                                title="Plan dəyiş"
                                            >
                                                <PencilLine className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrgs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted border-dashed border border-border mt-4 rounded-xl">
                                        Heç bir təşkilat tapılmadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {planModalOrg && <PlanModal org={planModalOrg} onClose={() => setPlanModalOrg(null)} />}
        </div>
    );
}
