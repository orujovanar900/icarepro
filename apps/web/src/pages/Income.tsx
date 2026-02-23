import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownLeft, Plus, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Income() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const addToast = useToastStore((state) => state.addToast);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const month = parseInt(searchParams.get('month') || String(currentMonth), 10);
    const year = parseInt(searchParams.get('year') || String(currentYear), 10);
    const paymentType = searchParams.get('paymentType') || '';

    const handleFilterChange = (key: string, value: string) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    // Main fetch
    const { data: paymentsData, isLoading, isError, refetch } = useQuery({
        queryKey: ['payments', month, year, paymentType],
        queryFn: async () => {
            const params = new URLSearchParams({
                month: String(month),
                year: String(year),
                limit: '1000' // Get all for the month
            });
            if (paymentType) params.append('paymentType', paymentType);

            const res = await api.get(`/payments?${params.toString()}`);
            return res.data; // expects { success: true, data: [...], meta: { totalAmount } }
        },
    });

    // Active Contracts fetch for the Modal dropdown
    const { data: contractsData } = useQuery({
        queryKey: ['active-contracts-short'],
        queryFn: async () => {
            // Fetch all contracts to be available for income logic (for all user profiles / test accounts)
            const res = await api.get('/contracts?limit=1000');
            return res.data;
        }
    });

    const payments = Array.isArray(paymentsData?.data) ? paymentsData.data : (paymentsData?.data?.data || []);
    const totalAmount = paymentsData?.meta?.totalAmount || paymentsData?.data?.meta?.totalAmount || 0;
    const activeContracts = Array.isArray(contractsData?.data) ? contractsData.data : (contractsData?.data?.data || []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formContractId, setFormContractId] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formType, setFormType] = useState('CASH');
    const [formPeriodMonth, setFormPeriodMonth] = useState(String(currentMonth));
    const [formPeriodYear, setFormPeriodYear] = useState(String(currentYear));
    const [formNote, setFormNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addPaymentMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/payments', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            addToast({ message: 'Ödəniş uğurla əlavə edildi', type: 'success' });
            setIsModalOpen(false);
            // Reset form
            setFormContractId('');
            setFormAmount('');
            setFormNote('');
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        },
        onSettled: () => setIsSubmitting(false)
    });

    const handleAddPayment = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        addPaymentMutation.mutate({
            contractId: formContractId,
            amount: Number(formAmount),
            paymentDate: formDate,
            paymentType: formType,
            periodMonth: Number(formPeriodMonth),
            periodYear: Number(formPeriodYear),
            note: formNote,
        });
    };

    const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];

    const canAddPayment = user?.role === 'OWNER' || user?.role === 'STAFF';

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <ArrowDownLeft className="w-8 h-8 text-green" />
                    Mədaxil
                </h1>
                {canAddPayment && (
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ödəniş Əlavə Et
                    </Button>
                )}
            </div>

            {/* Filters */}
            <Card variant="elevated">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-48">
                        <Select
                            label="Ay"
                            value={month}
                            onChange={(e) => handleFilterChange('month', e.target.value)}
                            options={months.map((m, i) => ({ label: m, value: i + 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            label="İl"
                            value={year}
                            onChange={(e) => handleFilterChange('year', e.target.value)}
                            options={Array.from({ length: 5 }, (_, i) => ({
                                label: String(currentYear - i),
                                value: currentYear - i
                            }))}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select
                            label="Ödəniş Növü"
                            value={paymentType}
                            onChange={(e) => handleFilterChange('paymentType', e.target.value)}
                            options={[
                                { label: 'Bütün Növlər', value: '' },
                                { label: 'Nağd', value: 'CASH' },
                                { label: 'Bank', value: 'BANK' },
                                { label: 'Kart', value: 'CARD' },
                                { label: 'Onlayn', value: 'ONLINE' },
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
                    ) : payments.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Bu dövr üçün ödəniş tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarix</TableHead>
                                    <TableHead>Obyekt / İcarəçi</TableHead>
                                    <TableHead>Müqavilə</TableHead>
                                    <TableHead>Dövr</TableHead>
                                    <TableHead>Növü</TableHead>
                                    <TableHead className="text-right">Məbləğ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.map((payment: any) => (
                                    <TableRow key={payment.id} className="hover:bg-surface transition-colors">
                                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString('az-AZ')}</TableCell>
                                        <TableCell>
                                            <p className="font-medium text-text">{payment.contract.tenant.fullName}</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted">N: {payment.contract.number}</TableCell>
                                        <TableCell className="text-sm text-muted">
                                            {months[(payment.periodMonth || 1) - 1]} {payment.periodYear}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 flex items-center w-fit justify-center rounded text-xs tracking-wider font-medium 
                                                ${payment.paymentType === 'CASH' ? 'bg-green/10 text-green border border-green/20' :
                                                    payment.paymentType === 'BANK' ? 'bg-blue/10 text-blue border border-blue/20' :
                                                        'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                                                {payment.paymentType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green">
                                            +{formatMoney(payment.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {/* Total Row */}
                                <TableRow className="bg-surface/50">
                                    <TableCell colSpan={5} className="text-right font-bold text-text">
                                        Yekun Məbləğ (Cari Dövr):
                                    </TableCell>
                                    <TableCell className="text-right font-extrabold text-green text-lg">
                                        {formatMoney(totalAmount)}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add Payment Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Ödəniş Əlavə Et">
                <form onSubmit={handleAddPayment} className="space-y-4">
                    {/* Make Select searchable or simulate searchable by displaying all names */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-text">Müqavilə Seçin <span className="text-red">*</span></label>
                        <select
                            required
                            value={formContractId}
                            onChange={(e) => setFormContractId(e.target.value)}
                            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-gold/50"
                        >
                            <option value="" disabled>Seçin...</option>
                            {activeContracts.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.tenant.fullName} - N: {c.number} ({c.property.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Məbləğ (₼)"
                            type="number"
                            step="0.01"
                            required
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                        />
                        <Input
                            label="Tarix"
                            type="date"
                            required
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select
                            label="Ay (Dövr)"
                            value={formPeriodMonth}
                            onChange={(e) => setFormPeriodMonth(e.target.value)}
                            options={months.map((m, i) => ({ label: m, value: i + 1 }))}
                        />
                        <Select
                            label="İl (Dövr)"
                            value={formPeriodYear}
                            onChange={(e) => setFormPeriodYear(e.target.value)}
                            options={Array.from({ length: 5 }, (_, i) => ({
                                label: String(currentYear - 2 + i),
                                value: currentYear - 2 + i
                            }))}
                        />
                    </div>

                    <Select
                        label="Ödəniş Növü"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        options={[
                            { label: 'Nağd', value: 'CASH' },
                            { label: 'Bank / Hesab', value: 'BANK' },
                            { label: 'Kart', value: 'CARD' },
                            { label: 'Onlayn', value: 'ONLINE' },
                        ]}
                    />

                    <Input
                        label="Qeyd (İxtiyari)"
                        value={formNote}
                        onChange={(e) => setFormNote(e.target.value)}
                    />

                    <div className="flex gap-4 pt-4 mt-6 border-t border-border">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Ləğv et</Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting || !formContractId || !formAmount}>
                            {isSubmitting ? 'Əlavə edilir...' : 'Təsdiqlə'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
