import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, User, Building2, Phone, Mail, MapPin, FileText,
    CreditCard, AlertTriangle, Pencil, Calendar, IdCard, Briefcase, Landmark
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';

const formatMoney = (n: number) =>
    new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('az-AZ') : '—';

type Tab = 'info' | 'contracts' | 'payments' | 'debts';

const CONTRACT_STATUS: Record<string, { label: string; variant: any }> = {
    ACTIVE: { label: 'Aktiv', variant: 'aktiv' },
    ARCHIVED: { label: 'Arxiv', variant: 'arxiv' },
    DRAFT: { label: 'Qaralama', variant: 'draft' },
};

function Field({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
            {Icon && <Icon className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />}
            <div className="min-w-0">
                <p className="text-xs text-muted mb-0.5">{label}</p>
                <p className="text-sm font-medium text-text break-words">{value}</p>
            </div>
        </div>
    );
}

export function TenantDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('info');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['tenant', id],
        queryFn: async () => {
            const res = await api.get(`/tenants/${id}`);
            return res.data;
        },
    });

    // Fetch payments for this tenant's contracts
    const { data: paymentsData } = useQuery({
        queryKey: ['tenant-payments', id],
        queryFn: async () => {
            const res = await api.get(`/payments?limit=200&offset=0`);
            return res.data;
        },
        enabled: activeTab === 'payments' || activeTab === 'debts',
    });

    if (isLoading) return <div className="p-6 max-w-7xl mx-auto"><TableSkeleton rows={8} columns={4} /></div>;

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
    const isFiziki = tenant.tenantType === 'fiziki';
    const displayName = isFiziki
        ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
        : (tenant.companyName || '—');

    const activeContracts = tenant.contracts?.filter((c: any) => c.status === 'ACTIVE') || [];
    const allPayments = Array.isArray(paymentsData?.data) ? paymentsData.data : [];

    // Get payments for this tenant's contracts
    const contractIds = new Set((tenant.contracts || []).map((c: any) => c.id));
    const tenantPayments = allPayments.filter((p: any) => contractIds.has(p.contractId));

    // Compute debts per contract
    const debts = (tenant.contracts || [])
        .filter((c: any) => c.status === 'ACTIVE')
        .map((c: any) => {
            const totalPaid = tenantPayments
                .filter((p: any) => p.contractId === c.id)
                .reduce((s: number, p: any) => s + Number(p.amount), 0);
            const now = new Date();
            const start = new Date(c.startDate);
            const end = new Date(c.endDate) < now ? new Date(c.endDate) : now;
            const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
            const expected = Number(c.monthlyRent) * months;
            const debt = Math.max(0, expected - totalPaid);
            const daysOverdue = debt > 0
                ? Math.floor((now.getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return { contract: c, expected, totalPaid, debt, daysOverdue };
        })
        .filter((d: any) => d.debt > 0);

    const TABS: { key: Tab; label: string }[] = [
        { key: 'info', label: 'Məlumatlar' },
        { key: 'contracts', label: `Müqavilələr (${tenant.contracts?.length || 0})` },
        { key: 'payments', label: 'Ödənişlər' },
        { key: 'debts', label: `Borclar${debts.length > 0 ? ` (${debts.length})` : ''}` },
    ];

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <Button variant="ghost" onClick={() => navigate('/tenants')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                İcarəçilərə qayıt
            </Button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                <div className="flex items-start gap-3">
                    <div className={`p-3 rounded-xl ${isFiziki ? 'bg-blue-500/10' : 'bg-purple-500/10'}`}>
                        {isFiziki
                            ? <User className="w-7 h-7 text-blue-400" />
                            : <Building2 className="w-7 h-7 text-purple-400" />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold font-heading text-text">{displayName}</h1>
                        <p className="text-sm text-muted mt-0.5">
                            {isFiziki ? '👤 Fiziki Şəxs' : '🏢 Hüquqi Şəxs'}
                            {tenant.isBlacklisted && (
                                <span className="ml-3 inline-flex items-center gap-1 text-red text-xs font-medium">
                                    <AlertTriangle className="w-3 h-3" /> Qara Siyahı
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                {['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'].includes(user?.role || '') && (
                    <Button onClick={() => navigate(`/tenants/${tenant.id}/edit`)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Düzəliş et
                    </Button>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Aktiv Müqavilə', value: activeContracts.length, color: 'text-green' },
                    { label: 'Ümumi Müqavilə', value: tenant.contracts?.length || 0, color: 'text-text' },
                    { label: 'Borc Sayı', value: debts.length, color: debts.length > 0 ? 'text-red' : 'text-green' },
                    {
                        label: 'Ümumi Borc',
                        value: formatMoney(debts.reduce((s: number, d: any) => s + d.debt, 0)),
                        color: debts.length > 0 ? 'text-red' : 'text-green'
                    },
                ].map(stat => (
                    <Card key={stat.label} variant="elevated">
                        <CardContent className="p-4">
                            <p className="text-xs text-muted">{stat.label}</p>
                            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border pb-0">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                            activeTab === tab.key
                                ? 'border-gold text-gold'
                                : 'border-transparent text-muted hover:text-text',
                        ].join(' ')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'info' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {isFiziki ? (
                        <>
                            <Card variant="default">
                                <CardHeader><CardTitle>Şəxsi Məlumatlar</CardTitle></CardHeader>
                                <CardContent className="space-y-1">
                                    <Field label="Ad" value={tenant.firstName} icon={User} />
                                    <Field label="Soyad" value={tenant.lastName} />
                                    <Field label="Ata adı" value={tenant.fatherName} />
                                    <Field label="Doğum tarixi" value={fmtDate(tenant.birthDate)} icon={Calendar} />
                                    <Field label="FİN kod" value={tenant.fin} icon={IdCard} />
                                    <Field label="Pasport seriyası" value={tenant.passportSeries} />
                                    <Field label="Pasportu verən" value={tenant.passportIssuedBy} />
                                    <Field label="Pasport tarixi" value={fmtDate(tenant.passportIssuedAt)} />
                                </CardContent>
                            </Card>
                            <Card variant="default">
                                <CardHeader><CardTitle>Əlaqə Məlumatları</CardTitle></CardHeader>
                                <CardContent className="space-y-1">
                                    <Field label="Telefon" value={tenant.phone} icon={Phone} />
                                    <Field label="Əlavə telefon" value={tenant.phone2} icon={Phone} />
                                    <Field label="Email" value={tenant.email} icon={Mail} />
                                    <Field label="Ünvan" value={tenant.address} icon={MapPin} />
                                    <Field label="Qeyd" value={tenant.notes} icon={FileText} />
                                    {tenant.isBlacklisted && (
                                        <div className="mt-3 p-3 bg-red/10 rounded-lg border border-red/20">
                                            <p className="text-xs font-semibold text-red flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Qara Siyahı Səbəbi
                                            </p>
                                            <p className="text-sm text-red mt-1">{tenant.blacklistReason || 'Göstərilməyib'}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <>
                            <Card variant="default">
                                <CardHeader><CardTitle>Şirkət Məlumatları</CardTitle></CardHeader>
                                <CardContent className="space-y-1">
                                    <Field label="Şirkət adı" value={tenant.companyName} icon={Building2} />
                                    <Field label="VÖEN" value={tenant.voen} icon={Briefcase} />
                                    <Field label="Direktor adı" value={tenant.directorName} icon={User} />
                                    <Field label="Şirkət ünvanı" value={tenant.companyAddress} icon={MapPin} />
                                    <Field label="Qeyd" value={tenant.notes} icon={FileText} />
                                </CardContent>
                            </Card>
                            <Card variant="default">
                                <CardHeader><CardTitle>Bank & Əlaqə</CardTitle></CardHeader>
                                <CardContent className="space-y-1">
                                    <Field label="Telefon" value={tenant.phone} icon={Phone} />
                                    <Field label="Əlavə telefon" value={tenant.phone2} icon={Phone} />
                                    <Field label="Email" value={tenant.email} icon={Mail} />
                                    <Field label="Bank adı" value={tenant.bankName} icon={Landmark} />
                                    <Field label="Müxbir hesab" value={tenant.bankCode} />
                                    <Field label="IBAN" value={tenant.iban} icon={CreditCard} />
                                    {tenant.isBlacklisted && (
                                        <div className="mt-3 p-3 bg-red/10 rounded-lg border border-red/20">
                                            <p className="text-xs font-semibold text-red flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> Qara Siyahı Səbəbi
                                            </p>
                                            <p className="text-sm text-red mt-1">{tenant.blacklistReason || 'Göstərilməyib'}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'contracts' && (
                <Card variant="default">
                    <CardContent className="p-0">
                        {!tenant.contracts?.length ? (
                            <div className="text-center py-12 text-muted">
                                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>Heç bir müqavilə yoxdur.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Müqavilə №</TableHead>
                                        <TableHead>Obyekt</TableHead>
                                        <TableHead>Müddət</TableHead>
                                        <TableHead className="text-right">Aylıq İcarə</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenant.contracts.map((c: any) => (
                                        <TableRow
                                            key={c.id}
                                            className="cursor-pointer hover:bg-surface transition-colors"
                                            onClick={() => navigate(`/contracts/${c.id}`)}
                                        >
                                            <TableCell>
                                                <Badge variant={CONTRACT_STATUS[c.status]?.variant ?? 'draft'}>
                                                    {CONTRACT_STATUS[c.status]?.label ?? c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{c.number}</TableCell>
                                            <TableCell>{c.property?.name || '—'}</TableCell>
                                            <TableCell className="text-sm text-muted">
                                                {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatMoney(c.monthlyRent)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'payments' && (
                <Card variant="default">
                    <CardContent className="p-0">
                        {tenantPayments.length === 0 ? (
                            <div className="text-center py-12 text-muted">
                                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>Ödəniş tapılmadı.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarix</TableHead>
                                        <TableHead>Müqavilə</TableHead>
                                        <TableHead>Növü</TableHead>
                                        <TableHead className="text-right">Məbləğ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tenantPayments.slice(0, 50).map((p: any) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="text-sm">{fmtDate(p.paymentDate)}</TableCell>
                                            <TableCell className="text-sm font-mono">{p.contract?.number || '—'}</TableCell>
                                            <TableCell className="text-sm text-muted">{p.paymentType}</TableCell>
                                            <TableCell className="text-right font-bold text-green">
                                                {formatMoney(Number(p.amount))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'debts' && (
                <div className="space-y-4">
                    {debts.length === 0 ? (
                        <Card variant="default">
                            <CardContent className="text-center py-12 text-muted">
                                <p className="text-green font-medium">✓ Heç bir borc yoxdur</p>
                            </CardContent>
                        </Card>
                    ) : (
                        debts.map((d: any) => (
                            <Card key={d.contract.id} variant="default" className="border border-red/20">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-text">{d.contract.property?.name}</p>
                                            <p className="text-xs font-mono text-muted">Müq. {d.contract.number}</p>
                                        </div>
                                        <span className="text-xl font-bold text-red">{formatMoney(d.debt)}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted">Gözlənilən</p>
                                            <p className="font-medium">{formatMoney(d.expected)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted">Ödənilib</p>
                                            <p className="font-medium text-green">{formatMoney(d.totalPaid)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted">Borc</p>
                                            <p className="font-bold text-red">{formatMoney(d.debt)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
