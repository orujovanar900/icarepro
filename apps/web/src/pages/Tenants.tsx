import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Tenants() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: tenantsData, isLoading, isError, refetch } = useQuery({
        queryKey: ['tenants', debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            const res = await api.get(`/tenants?${params.toString()}`);
            return res.data;
        },
    });

    const tenants = Array.isArray(tenantsData?.data) ? tenantsData.data : (tenantsData?.data?.data || []);
    const canAddTenant = user?.role === 'OWNER' || user?.role === 'STAFF';

    // Calculate Debt for each tenant based on their ACTIVE contracts' payments
    const tenantsWithDebt = tenants.map((tenant: any) => {
        let totalDebt = 0;
        let activeContractNames: string[] = [];

        tenant.contracts?.forEach((c: any) => {
            activeContractNames.push(`${c.property.name} (${c.number})`);

            // Note: Since GET /tenants does not include payments eagerly,
            // we will fetch all payments in another query or assume debt is 0 here and fetch in detail.
            // But the requirement says "Debt" column in the table. 
            // We'll show "Hesablanır..." or we can fetch contracts with debt.
            // Let's just output their active contracts count for now, if we can't get debt.
            // Wait, `/contracts` endpoint gives debt. I'll fetch `/contracts?status=ACTIVE` globally and match.
        });

        return { ...tenant, activeContractNames, totalDebt };
    });

    const { data: contractsData } = useQuery({
        queryKey: ['all-active-contracts'],
        queryFn: async () => {
            const res = await api.get('/contracts?status=ACTIVE&limit=1000');
            return res.data;
        }
    });

    const activeContractsList = Array.isArray(contractsData?.data) ? contractsData.data : (contractsData?.data?.data || []);

    const finalTenants = tenantsWithDebt.map((t: any) => {
        let calculatedDebt = 0;
        const matchedContracts = activeContractsList.filter((c: any) => c.tenantId === t.id);
        matchedContracts.forEach((c: any) => {
            calculatedDebt += c.debt || 0;
        });
        return { ...t, calculatedDebt };
    });

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Users className="w-8 h-8 text-gold" />
                    İcarəçilər
                </h1>
                {canAddTenant && (
                    <Button onClick={() => navigate('/tenants/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni İcarəçi
                    </Button>
                )}
            </div>

            <Card variant="elevated">
                <CardContent className="p-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            placeholder="Ad, VÖEN və ya Telefon ilə axtarış..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card variant="default">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={10} columns={5} /></div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red">
                            <p>Məlumatları yükləmək mümkün olmadı.</p>
                            <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                        </div>
                    ) : finalTenants.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>İcarəçi tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ad / Şirkət</TableHead>
                                    <TableHead>VÖEN</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Aktiv Obyektlər</TableHead>
                                    <TableHead className="text-right">Ümumi Borc</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {finalTenants.map((tenant: any) => (
                                    <TableRow
                                        key={tenant.id}
                                        className="cursor-pointer hover:bg-surface transition-colors"
                                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                                    >
                                        <TableCell>
                                            <p className="font-bold text-text group-hover:text-gold transition-colors">{tenant.fullName}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted">{tenant.voen || '-'}</TableCell>
                                        <TableCell className="text-sm text-text">{tenant.phone}</TableCell>
                                        <TableCell className="text-sm text-muted max-w-[200px] truncate">
                                            {tenant.activeContractNames.length > 0
                                                ? tenant.activeContractNames.join(', ')
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {tenant.calculatedDebt > 0 ? (
                                                <span className="font-bold text-red">{formatMoney(tenant.calculatedDebt)}</span>
                                            ) : (
                                                <span className="text-green font-medium">Yoxdur</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
