import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Download, Plus, Archive } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToastStore } from '@/store/toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function ContractDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['contract', id],
        queryFn: async () => {
            const res = await api.get(`/contracts/${id}`);
            return res.data; // expects { success: true, data: { ... } }
        },
    });

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentType, setPaymentType] = useState('CASH');
    const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1));
    const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
    const [paymentNote, setPaymentNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            await api.patch(`/contracts/${id}`, { status: 'ARCHIVED' });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            addToast({ message: 'Müqavilə arxivləşdirildi', type: 'success' });
            setShowArchiveConfirm(false);
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsArchiving(false);
        }
    };

    const addPaymentMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/payments', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            addToast({ message: 'Ödəniş uğurla əlavə edildi', type: 'success' });
            setPaymentAmount('');
            setPaymentNote('');
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        },
        onSettled: () => setIsSubmitting(false)
    });

    if (isLoading) {
        return <div className="p-6 max-w-7xl mx-auto"><TableSkeleton rows={8} columns={4} /></div>;
    }

    if (isError || !data?.success) {
        return (
            <div className="p-6 max-w-7xl mx-auto text-center py-24">
                <FileText className="w-16 h-16 text-red mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red">Xəta baş verdi və ya müqavilə tapılmadı</h1>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/contracts')}>Geri qayıt</Button>
            </div>
        );
    }

    const contract = data.data;

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

    // calculate total 
    const start = new Date(contract.startDate);
    const end = contract.endDate < new Date().toISOString() ? new Date(contract.endDate) : new Date();
    const monthsElapsed = Math.max(0,
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    );
    const totalExpected = contract.monthlyRent * monthsElapsed;
    const totalPaid = contract.payments.reduce((acc: number, p: any) => acc + p.amount, 0);
    const totalDebt = Math.max(0, totalExpected - totalPaid);

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        addPaymentMutation.mutate({
            contractId: id,
            amount: Number(paymentAmount),
            paymentDate,
            paymentType,
            periodMonth: Number(periodMonth),
            periodYear: Number(periodYear),
            note: paymentNote,
        });
    };

    const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];

    return (
        <>
            <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
                <Button variant="ghost" onClick={() => navigate('/contracts')} className="mb-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Müqavilələrə qayıt
                </Button>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-3">
                            Müqavilə: {contract.number}
                            <Badge variant={getStatusBadgeVariant(contract.status)}>
                                {getStatusText(contract.status)}
                            </Badge>
                        </h1>
                    </div>
                    {contract.status === 'ACTIVE' && (
                        <Button variant="outline" onClick={() => setShowArchiveConfirm(true)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Arxivləşdir
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info */}
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Müqavilə Məlumatları</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-muted">Obyekt</h3>
                                    <p className="text-lg font-bold text-text mt-1">{contract.property.name}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted">İcarəçi</h3>
                                    <p className="text-lg font-bold text-text mt-1">{contract.tenant.fullName}</p>
                                    <p className="text-sm text-text">Tel: {contract.tenant.phone}</p>
                                    <p className="text-sm text-text">VÖEN: {contract.tenant.taxId || '-'}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted">Müddət</h3>
                                    <p className="text-lg font-bold text-text mt-1">
                                        {new Date(contract.startDate).toLocaleDateString('az-AZ')} — {new Date(contract.endDate).toLocaleDateString('az-AZ')}
                                    </p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-muted">Aylıq İcarə</h3>
                                    <p className="text-lg font-bold text-gold mt-1">{formatMoney(contract.monthlyRent)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payments History */}
                        <Card variant="default">
                            <CardHeader>
                                <CardTitle>Ödəniş Tarixçəsi</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {contract.payments.length === 0 ? (
                                    <div className="text-center py-8 text-muted">Heç bir ödəniş yoxdur.</div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Tarix</TableHead>
                                                <TableHead>Dövr</TableHead>
                                                <TableHead>Növü</TableHead>
                                                <TableHead>Qeyd</TableHead>
                                                <TableHead className="text-right">Məbləğ</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contract.payments.map((p: any) => (
                                                <TableRow key={p.id}>
                                                    <TableCell>{new Date(p.paymentDate).toLocaleDateString('az-AZ')}</TableCell>
                                                    <TableCell>{months[p.periodMonth - 1]} {p.periodYear}</TableCell>
                                                    <TableCell>{p.paymentType}</TableCell>
                                                    <TableCell className="max-w-[150px] truncate">{p.note || '-'}</TableCell>
                                                    <TableCell className="text-right font-bold text-green">+{formatMoney(p.amount)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        {/* Summary */}
                        <Card variant="elevated" className={totalDebt > 0 ? "border-red/20" : "border-green/20"}>
                            <CardHeader>
                                <CardTitle>Maliyyə Xülasəsi</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">Cari günə hesablanmış</span>
                                    <span className="font-bold text-text">{formatMoney(totalExpected)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted">Ödənilmiş</span>
                                    <span className="font-bold text-green">{formatMoney(totalPaid)}</span>
                                </div>
                                <div className="pt-4 border-t border-border flex justify-between items-center">
                                    <span className="text-sm font-bold text-text">Cari Borc</span>
                                    <span className={`text-xl font-bold ${totalDebt > 0 ? 'text-red' : 'text-green'}`}>
                                        {formatMoney(totalDebt)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Add Form */}
                        <Card variant="default">
                            <CardHeader>
                                <CardTitle>Tez Ödəniş Əlavə Et</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddPayment} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Input
                                            label="Məbləğ (₼)"
                                            type="number"
                                            step="0.01"
                                            required
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                        />
                                        <Input
                                            label="Tarix"
                                            type="date"
                                            required
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Select
                                            label="Ay"
                                            value={periodMonth}
                                            onChange={(e) => setPeriodMonth(e.target.value)}
                                            options={months.map((m, i) => ({ label: m, value: i + 1 }))}
                                        />
                                        <Select
                                            label="İl"
                                            value={periodYear}
                                            onChange={(e) => setPeriodYear(e.target.value)}
                                            options={Array.from({ length: 5 }, (_, i) => ({
                                                label: String(new Date().getFullYear() - 2 + i),
                                                value: new Date().getFullYear() - 2 + i
                                            }))}
                                        />
                                    </div>
                                    <Select
                                        label="Ödəniş Növü"
                                        value={paymentType}
                                        onChange={(e) => setPaymentType(e.target.value)}
                                        options={[
                                            { label: 'Nağd', value: 'CASH' },
                                            { label: 'Bank / Hesab', value: 'BANK' },
                                            { label: 'Kart', value: 'CARD' },
                                            { label: 'Onlayn', value: 'ONLINE' },
                                        ]}
                                    />
                                    <Input
                                        label="Qeyd"
                                        value={paymentNote}
                                        onChange={(e) => setPaymentNote(e.target.value)}
                                    />
                                    <Button type="submit" className="w-full" disabled={isSubmitting || !paymentAmount}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isSubmitting ? 'Əlavə edilir...' : 'Ödəniş Əlavə Et'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Documents */}
                        <Card variant="default">
                            <CardHeader>
                                <CardTitle>Sənədlər</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {contract.documents.length === 0 ? (
                                    <p className="text-muted text-sm text-center py-4">Sənəd yoxdur.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {contract.documents.map((doc: any) => (
                                            <div key={doc.id} className="flex justify-between items-center bg-surface p-3 rounded-lg border border-border">
                                                <div>
                                                    <p className="text-sm font-medium">{doc.documentType}</p>
                                                    <p className="text-xs text-muted">{new Date(doc.generatedAt).toLocaleDateString('az-AZ')}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl)}>
                                                    <Download className="w-4 h-4 text-gold" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Archive Confirm */}
            <ConfirmDialog
                isOpen={showArchiveConfirm}
                title="Müqaviləni Arxivləşdir"
                message="Bu müqavilə arxivləşdiriləcək. Aktiv vəziyyəti dayandıracaq. Davam etmək istəyirsinizmi?"
                confirmLabel="Arxivləşdir"
                onConfirm={handleArchive}
                onCancel={() => setShowArchiveConfirm(false)}
                isLoading={isArchiving}
                variant="warning"
            />
        </>
    );
}
