import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, User, Building2, Phone, Mail, FileText,
    AlertTriangle, Pencil, CreditCard, BadgeDollarSign, ClipboardList, UploadCloud, Trash2, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';

const fmt = (n: number) => new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('az-AZ') : '—';
const contractStatus: Record<string, { label: string; variant: any }> = {
    ACTIVE: { label: 'Aktiv', variant: 'aktiv' },
    ARCHIVED: { label: 'Arxiv', variant: 'arxiv' },
    DRAFT: { label: 'Qaralama', variant: 'draft' },
};

type Tab = 'info' | 'contracts' | 'payments' | 'debts' | 'documents';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-start py-2 border-b border-border last:border-0">
            <span className="text-sm text-muted">{label}</span>
            <span className="text-sm font-medium text-text text-right max-w-[60%]">{value}</span>
        </div>
    );
}

export function TenantDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);
    const [tab, setTab] = useState<Tab>('info');
    const canEdit = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'].includes(user?.role || '');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['tenant', id],
        queryFn: async () => (await api.get(`/tenants/${id}`)).data,
    });

    const { data: contractsResp } = useQuery({
        queryKey: ['tenant-contracts', id],
        queryFn: async () => (await api.get(`/contracts?status=ACTIVE&limit=1000`)).data,
        select: (d: any) => (Array.isArray(d?.data) ? d.data : []).filter((c: any) => c.tenantId === id),
    });

    const { data: paymentsResp } = useQuery({
        queryKey: ['tenant-payments', id],
        queryFn: async () => {
            const res = await api.get(`/tenants/${id}/payments`);
            return res.data;
        },
        select: (d: any) => Array.isArray(d?.data) ? d.data : [],
    });

    if (isLoading) return <div className="p-6 max-w-4xl mx-auto"><TableSkeleton rows={8} columns={4} /></div>;

    if (isError || !data?.success) {
        return (
            <div className="p-6 max-w-4xl mx-auto text-center py-24">
                <User className="w-16 h-16 text-red mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red">İcarəçi tapılmadı</h1>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/tenants')}>Geri qayıt</Button>
            </div>
        );
    }

    const tenant = data.data;
    const isFiziki = tenant.tenantType === 'fiziki';
    const displayName = isFiziki
        ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
        : tenant.companyName || '—';

    const contracts: any[] = contractsResp || tenant.contracts || [];
    const allContracts: any[] = tenant.contracts || [];
    const payments: any[] = paymentsResp || [];

    // Compute debts per active contract
    const debts = contracts.map((c: any) => {
        const now = new Date();
        const start = new Date(c.startDate);
        const end = c.endDate < now ? new Date(c.endDate) : now;
        const monthsElapsed = Math.max(0,
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
        );
        const totalExpected = Number(c.monthlyRent) * monthsElapsed;
        const debt = Math.max(0, totalExpected - (c.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0));
        return { ...c, debt };
    }).filter((c: any) => c.debt > 0);

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsUploadingDoc(true);
        try {
            await api.post(`/tenants/${id}/documents?type=${type}&name=${encodeURIComponent(file.name)}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            addToast({ message: 'Sənəd yükləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['tenant', id] });
        } catch {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Sənədi silmək istədiyinizə əminsiniz?')) return;
        try {
            await api.delete(`/tenants/${id}/documents/${docId}`);
            addToast({ message: 'Sənəd silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['tenant', id] });
        } catch {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        }
    };

    const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'info', label: 'Məlumatlar', icon: <ClipboardList className="w-4 h-4" /> },
        { key: 'contracts', label: 'Müqavilələr', icon: <FileText className="w-4 h-4" /> },
        { key: 'payments', label: 'Ödənişlər', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'debts', label: 'Borclar', icon: <BadgeDollarSign className="w-4 h-4" /> },
        { key: 'documents', label: 'Sənədlər', icon: <FileText className="w-4 h-4" /> },
    ];

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            {/* Back + Edit */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate('/tenants')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />İcarəçilərə qayıt
                </Button>
                {canEdit && (
                    <Button variant="outline" onClick={() => navigate(`/tenants/${id}/edit`)}>
                        <Pencil className="w-4 h-4 mr-2" />Düzəliş et
                    </Button>
                )}
            </div>

            {/* Header */}
            <div className="flex items-start gap-4 p-6 bg-surface rounded-2xl border border-border">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isFiziki ? 'bg-blue-500/10' : 'bg-gold/10'}`}>
                    {isFiziki ? <User className="w-7 h-7 text-blue-400" /> : <Building2 className="w-7 h-7 text-gold" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-extrabold font-heading text-text">{displayName}</h1>
                        <Badge variant={isFiziki ? 'aktiv' : 'arxiv'}>
                            {isFiziki ? 'Fiziki şəxs' : 'Hüquqi şəxs'}
                        </Badge>
                        {tenant.isBlacklisted && (
                            <Badge variant="danger">
                                <AlertTriangle className="w-3 h-3 mr-1" />Qara siyahı
                            </Badge>
                        )}
                    </div>
                    {tenant.phone && (
                        <p className="text-muted text-sm mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{tenant.phone}
                        </p>
                    )}
                    {tenant.email && (
                        <p className="text-muted text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3" />{tenant.email}
                        </p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-muted">Aktiv müqavilə</p>
                    <p className="text-2xl font-bold text-text">{contracts.filter((c: any) => c.status === 'ACTIVE').length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-gold text-black shadow-sm' : 'text-muted hover:text-text'
                            }`}
                    >
                        {t.icon}<span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab: Məlumatlar */}
            {tab === 'info' && (
                <div className="space-y-4">
                    {isFiziki ? (
                        <Card variant="default">
                            <CardHeader><CardTitle>👤 Fiziki Şəxs Məlumatları</CardTitle></CardHeader>
                            <CardContent>
                                <InfoRow label="Ad" value={tenant.firstName} />
                                <InfoRow label="Soyad" value={tenant.lastName} />
                                <InfoRow label="Ata adı" value={tenant.fatherName} />
                                <InfoRow label="FİN kod" value={tenant.fin} />
                                <InfoRow label="Pasport seriyası" value={tenant.passportSeries} />
                                <InfoRow label="Pasportu verən orqan" value={tenant.passportIssuedBy} />
                                <InfoRow label="Pasport tarixi" value={fmtDate(tenant.passportIssuedAt)} />
                                <InfoRow label="Doğum tarixi" value={fmtDate(tenant.birthDate)} />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card variant="default">
                            <CardHeader><CardTitle>🏢 Hüquqi Şəxs Məlumatları</CardTitle></CardHeader>
                            <CardContent>
                                <InfoRow label="Şirkət adı" value={tenant.companyName} />
                                <InfoRow label="VÖEN" value={tenant.voen} />
                                <InfoRow label="Direktor" value={tenant.directorName} />
                                <InfoRow label="Şirkət ünvanı" value={tenant.companyAddress} />
                                <InfoRow label="Bank adı" value={tenant.bankName} />
                                <InfoRow label="Müxbir hesab" value={tenant.bankCode} />
                                <InfoRow label="IBAN" value={tenant.iban} />
                            </CardContent>
                        </Card>
                    )}
                    <Card variant="default">
                        <CardHeader><CardTitle>Əlaqə</CardTitle></CardHeader>
                        <CardContent>
                            <InfoRow label="Telefon" value={tenant.phone} />
                            <InfoRow label="Əlavə telefon" value={tenant.phone2} />
                            <InfoRow label="Email" value={tenant.email} />
                            <InfoRow label="Ünvan" value={tenant.address} />
                            <InfoRow label="Qeyd" value={tenant.notes} />
                        </CardContent>
                    </Card>
                    {tenant.isBlacklisted && (
                        <Card variant="default" className="border-red/40">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-red">Qara siyahıda</p>
                                    <p className="text-sm text-muted mt-0.5">{tenant.blacklistReason || 'Səbəb qeyd edilməyib'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Tab: Müqavilələr */}
            {tab === 'contracts' && (
                <Card variant="default">
                    <CardContent className="p-0">
                        {allContracts.length === 0 ? (
                            <div className="text-center py-12 text-muted">
                                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>Müqavilə tapılmadı</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Müqavilə №</TableHead>
                                        <TableHead>Obyekt</TableHead>
                                        <TableHead>Müddət</TableHead>
                                        <TableHead className="text-right">Aylıq icarə</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allContracts.map((c: any) => {
                                        const cs = contractStatus[c.status] || { label: c.status, variant: 'draft' };
                                        return (
                                            <TableRow key={c.id} className="cursor-pointer hover:bg-surface" onClick={() => navigate(`/contracts/${c.id}`)}>
                                                <TableCell><Badge variant={cs.variant}>{cs.label}</Badge></TableCell>
                                                <TableCell className="font-mono text-sm">{c.number}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium">{c.property?.name || '—'}</p>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted">
                                                    {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{fmt(Number(c.monthlyRent))}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab: Ödənişlər */}
            {tab === 'payments' && (
                <Card variant="default">
                    <CardContent className="p-0">
                        {payments.length === 0 ? (
                            <div className="text-center py-12 text-muted">
                                <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p>Ödəniş tapılmadı</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarix</TableHead>
                                        <TableHead>Müqavilə</TableHead>
                                        <TableHead>Növ</TableHead>
                                        <TableHead className="text-right">Məbləğ</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p: any) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="text-sm">{fmtDate(p.paymentDate)}</TableCell>
                                            <TableCell className="font-mono text-sm">{p.contract?.number || '—'}</TableCell>
                                            <TableCell className="text-sm text-muted">{p.paymentType}</TableCell>
                                            <TableCell className="text-right font-bold text-green">{fmt(Number(p.amount))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab: Borclar */}
            {tab === 'debts' && (
                <Card variant="default">
                    <CardContent className="p-0">
                        {debts.length === 0 ? (
                            <div className="text-center py-12">
                                <BadgeDollarSign className="w-10 h-10 mx-auto mb-3 text-green opacity-40" />
                                <p className="text-green font-semibold">Borc yoxdur! ✓</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Müqavilə</TableHead>
                                        <TableHead>Obyekt</TableHead>
                                        <TableHead>Aylıq icarə</TableHead>
                                        <TableHead className="text-right">Borc</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.map((c: any) => (
                                        <TableRow key={c.id} className="cursor-pointer hover:bg-surface" onClick={() => navigate(`/contracts/${c.id}`)}>
                                            <TableCell className="font-mono text-sm">{c.number}</TableCell>
                                            <TableCell>{c.property?.name || '—'}</TableCell>
                                            <TableCell>{fmt(Number(c.monthlyRent))}</TableCell>
                                            <TableCell className="text-right font-bold text-red">{fmt(c.debt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
            {/* Tab: Sənədlər */}
            {tab === 'documents' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-text">Sənədlər ({tenant.tenantDocuments?.length || 0})</h3>
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold px-4 py-2 rounded-lg transition-colors font-medium text-sm">
                                {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                Sənəd Yüklə
                            </div>
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleUploadDocument(e, 'PASSPORT')} />
                        </label>
                    </div>

                    {tenant.tenantDocuments?.length > 0 ? (
                        <div className="space-y-3">
                            {tenant.tenantDocuments.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-gold" />
                                        </div>
                                        <div>
                                            <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="font-medium text-text hover:underline text-sm">
                                                {doc.name || doc.type}
                                            </a>
                                            <p className="text-xs text-muted">{doc.type} • {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString('az-AZ')}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-muted hover:text-red transition-colors rounded-md hover:bg-red/10">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Sənəd yüklənməyib.</p>
                            <p className="text-xs mt-1">Pasport surəti və digər sənədləri buraya əlavə edə bilərsiniz.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
