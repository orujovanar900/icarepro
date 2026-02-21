import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Phone, Mail, Building, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function TenantDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['tenant', id],
        queryFn: async () => {
            const res = await api.get(`/tenants/${id}`);
            return res.data;
        },
    });

    if (isLoading) {
        return <div className="p-6 max-w-7xl mx-auto"><TableSkeleton rows={8} columns={4} /></div>;
    }

    if (isError || !data?.success) {
        return (
            <div className="p-6 max-w-7xl mx-auto text-center py-24">
                <User className="w-16 h-16 text-red mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red">Xəta baş verdi və ya icarəçi tapılmadı</h1>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/tenants')}>Geri qayıt</Button>
            </div>
        );
    }

    const tenant = data.data;

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

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <Button variant="ghost" onClick={() => navigate('/tenants')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                İcarəçilərə qayıt
            </Button>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-3">
                        {tenant.fullName}
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-1">
                    {/* Info */}
                    <Card variant="default">
                        <CardHeader>
                            <CardTitle>Şəxsi Məlumatlar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted flex items-center">
                                    <User className="w-4 h-4 mr-2" /> VÖEN
                                </h3>
                                <p className="text-lg font-bold text-text mt-1">{tenant.voen || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted flex items-center">
                                    <Phone className="w-4 h-4 mr-2" /> Telefon
                                </h3>
                                <p className="text-lg font-bold text-text mt-1">{tenant.phone}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-muted flex items-center">
                                    <Mail className="w-4 h-4 mr-2" /> Email
                                </h3>
                                <p className="text-lg font-bold text-text mt-1">{tenant.email || '-'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats or extra details can go here */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle>Xülasə</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm py-2">
                                <span className="text-muted">Aktiv Müqavilə</span>
                                <span className="font-bold text-text">
                                    {tenant.contracts.filter((c: any) => c.status === 'ACTIVE').length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm py-2">
                                <span className="text-muted">Ümumi Müqavilə</span>
                                <span className="font-bold text-text">
                                    {tenant.contracts.length}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {/* Contracts History */}
                    <Card variant="default">
                        <CardHeader>
                            <CardTitle>Müqavilə Tarixçəsi</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {tenant.contracts.length === 0 ? (
                                <div className="text-center py-8 text-muted">Heç bir müqavilə yoxdur.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Obyekt (Nömrə)</TableHead>
                                            <TableHead>Müddət</TableHead>
                                            <TableHead className="text-right">Aylıq İcarə</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenant.contracts.map((contract: any) => (
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
                                                    <p className="font-medium text-text group-hover:text-gold transition-colors">
                                                        {contract.property.name}
                                                    </p>
                                                    <p className="text-xs text-muted">Müq. {contract.number}</p>
                                                </TableCell>
                                                <TableCell className="text-sm text-text">
                                                    {new Date(contract.startDate).toLocaleDateString('az-AZ')} -{' '}
                                                    {new Date(contract.endDate).toLocaleDateString('az-AZ')}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-text">
                                                    {formatMoney(contract.monthlyRent)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Document references if any via tenantDocuments but design does not strictly demand it inside TenantDetail besides Contracts */}
                </div>
            </div>
        </div>
    );
}
