import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Contracts() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // We keep a debounced search value to prevent fetching on every keystroke, or just fetch on enter/blur.
    // For simplicity, we fetch every time search state changes but we could use a useDebounce hook.
    // Let's implement a simple debounce via React state or just depend on search string for now.
    const [debouncedSearch, setDebouncedSearch] = useState('');

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['contracts', status, debouncedSearch, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String((page - 1) * limit),
            });
            if (status) params.append('status', status);
            if (debouncedSearch) params.append('search', debouncedSearch);

            const res = await api.get(`/contracts?${params.toString()}`);
            console.log('Contracts page API response:', res.data);
            return res.data;
        },
    });

    const contracts = Array.isArray(data?.data) ? data.data : (data?.data?.data || []);
    const meta = data?.meta || data?.data?.meta || { total: 0 };
    const totalPages = Math.ceil(meta.total / limit);

    const getStatusBadgeVariant = (statusString: string) => {
        switch (statusString) {
            case 'ACTIVE': return 'aktiv';
            case 'ARCHIVED': return 'arxiv';
            case 'DRAFT': return 'draft';
            default: return 'draft';
        }
    };

    const getStatusText = (statusString: string) => {
        switch (statusString) {
            case 'ACTIVE': return 'Aktiv';
            case 'ARCHIVED': return 'Arxiv';
            case 'DRAFT': return 'Qaralama';
            default: return statusString;
        }
    };

    const canAddContract = user?.role === 'OWNER' || user?.role === 'STAFF';

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <FileText className="w-8 h-8 text-gold" />
                    Müqavilələr
                </h1>
                {canAddContract && (
                    <Button onClick={() => navigate('/contracts/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Müqavilə
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card variant="elevated">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            placeholder="İcarəçi adı və ya müqavilə nömrəsi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            value={status}
                            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                            options={[
                                { label: 'Bütün statuslar', value: '' },
                                { label: 'Aktiv', value: 'ACTIVE' },
                                { label: 'Qaralama', value: 'DRAFT' },
                                { label: 'Arxiv', value: 'ARCHIVED' },
                            ]}
                        />
                    </div>
                </CardContent>
            </Card>

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
                    ) : contracts.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Müqavilə tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Obyekt / İcarəçi</TableHead>
                                    <TableHead>Məbləğ (Aylıq)</TableHead>
                                    <TableHead>Müddət</TableHead>
                                    <TableHead className="text-right">Borc</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract: any) => (
                                    <TableRow
                                        key={contract.id}
                                        className="cursor-pointer hover:bg-surface transition-colors"
                                        onClick={() => navigate(`/contracts/${contract.id}`)}
                                    >
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(contract.status)}>
                                                {getStatusText(contract.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-text group-hover:text-gold transition-colors">{contract.property.name}</p>
                                            <p className="text-xs text-muted flex items-center gap-1 mt-1">
                                                {contract.tenant.fullName} • N: {contract.number}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-text">{formatMoney(contract.monthlyRent)}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted">
                                            {new Date(contract.startDate).toLocaleDateString('az-AZ')} - <br />
                                            {new Date(contract.endDate).toLocaleDateString('az-AZ')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {contract.debt > 0 ? (
                                                <span className="font-bold text-red">{formatMoney(contract.debt)}</span>
                                            ) : (
                                                <span className="text-muted">Yoxdur</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Əvvəlki
                    </Button>
                    <span className="text-sm text-muted">
                        Səhifə {page} / {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Sonrakı <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
}
