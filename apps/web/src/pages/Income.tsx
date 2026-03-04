import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ArrowDownLeft, Plus, Filter, Search, Trash2, ArchiveRestore, BarChart4, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { usePlan, FeatureGate } from '@/utils/planGates';
import { UpgradeModal } from '@/components/UpgradeModal';

const rentalTypeLabel: Record<string, string> = {
    RESIDENTIAL_LONG: 'Yaşayış (uzunmüddətli)',
    COMMERCIAL: 'Kommersiya',
    RESIDENTIAL_SHORT: 'Yaşayış (qısamüddətli)',
    PARKING: 'Dayanacaq',
    SUBLEASE: 'Alt-icarə'
};

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

// ------ Searchable Contract Combobox ------
function ContractCombobox({ contracts, value, onChange }: {
    contracts: any[];
    value: string;
    onChange: (val: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selected = contracts.find(c => c.id === value);

    const filtered = contracts.filter(c => {
        const q = search.toLowerCase();
        return (
            c.tenant?.fullName?.toLowerCase().includes(q) ||
            c.property?.address?.toLowerCase().includes(q) ||
            c.property?.name?.toLowerCase().includes(q) ||
            c.number?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex flex-col gap-1" ref={ref}>
            <label className="text-sm font-medium text-text">
                Müqavilə Seçin <span className="text-red">*</span>
            </label>
            <div
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus-within:border-gold/50 cursor-pointer min-h-[38px]"
                onClick={() => setOpen(true)}
            >
                {selected
                    ? `${selected.tenant.fullName} — №${selected.number} (${selected.property.name})`
                    : <span className="text-muted">Seçin...</span>
                }
            </div>
            {open && (
                <div className="absolute z-50 mt-[70px] w-full max-w-lg bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-border relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            autoFocus
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-gold/50 text-text"
                            placeholder="İcarəçi adı, ünvan, müqavilə nömrəsi..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-muted">Müqavilə tapılmadı</div>
                        ) : filtered.map((c: any) => (
                            <div
                                key={c.id}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-gold/10 transition-colors border-b border-border/50 last:border-0 ${value === c.id ? 'bg-gold/10' : ''}`}
                                onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                            >
                                <p className="text-sm font-medium text-text">{c.tenant?.fullName} — <span className="text-muted">№{c.number}</span></p>
                                <p className="text-xs text-muted mt-0.5">{c.property?.name} · {c.property?.address || ''}</p>
                                <span className="text-xs font-medium text-gold/80 mt-0.5 inline-block">
                                    {rentalTypeLabel[c.rentalType] || c.rentalType}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

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
    const [page, setPage] = useState(1);
    const [showDeleted, setShowDeleted] = useState(false);
    const limit = 20;

    const { can, plan } = usePlan();
    const [upgradeFeature, setUpgradeFeature] = useState<FeatureGate | null>(null);

    // Report Modal State
    const [reportStartDate, setReportStartDate] = useState(new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isExporting, setIsExporting] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');

    const getReportPayload = () => ({
        startDate: new Date(reportStartDate || '').toISOString(),
        endDate: new Date(new Date(reportEndDate || '').setHours(23, 59, 59)).toISOString(),
        direction: 'income'
    });

    const handleExportExcel = async () => {
        if (!can('excelExport')) {
            setUpgradeFeature('excelExport');
            return;
        }
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/contracts', { ...getReportPayload(), format: 'excel' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'medaxil_hesabati.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            addToast({ message: "Hesabat generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setShowReportModal(false);
        }
    };

    const handlePrintPDF = async () => {
        if (!can('pdfExport')) {
            setUpgradeFeature('pdfExport');
            return;
        }
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/contracts', { ...getReportPayload(), format: 'pdf' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'medaxil_hesabati.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("PDF generation failed", error);
            addToast({ message: "PDF generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setShowReportModal(false);
        }
    };

    const handleSendEmail = async () => {
        setIsExporting(true);
        try {
            await api.post('/hesabat/contracts/send-email', { ...getReportPayload(), email: emailAddress });
            addToast({ message: 'Hesabat email-ə göndərildi ✓', type: 'success' });
            setIsEmailModalOpen(false);
            setShowReportModal(false);
        } catch (error) {
            console.error('Email send failed', error);
            addToast({ message: 'Email göndərilmədi. Yenidən cəhd edin.', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

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
        queryKey: ['payments', month, year, paymentType, showDeleted],
        queryFn: async () => {
            const params = new URLSearchParams({
                month: String(month),
                year: String(year),
                limit: '100'
            });
            if (paymentType) params.append('paymentType', paymentType);
            if (showDeleted) params.append('deleted', 'true');

            const res = await api.get(`/payments?${params.toString()}`);
            return res.data;
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/payments/${id}/restore`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            addToast({ message: 'Ödəniş uğurla bərpa edildi', type: 'success' });
        },
        onError: () => {
            addToast({ message: 'Bərpa xətası baş verdi', type: 'error' });
        }
    });

    // Contracts for dropdown
    const { data: contractsData } = useQuery({
        queryKey: ['active-contracts-short'],
        queryFn: async () => {
            const res = await api.get('/contracts?limit=100');
            return res.data;
        }
    });

    const payments = Array.isArray(paymentsData?.data) ? paymentsData.data : (paymentsData?.data?.data || []);
    const totalAmount = paymentsData?.meta?.totalAmount || paymentsData?.data?.meta?.totalAmount || 0;
    const activeContracts = Array.isArray(contractsData?.data) ? contractsData.data : (contractsData?.data?.data || []);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

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

    const canAddPayment = ['OWNER', 'MANAGER', 'CASHIER'].includes(user?.role || '');

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <ArrowDownLeft className="w-8 h-8 text-green" />
                    Mədaxil
                </h1>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <Button onClick={() => {
                        if (!can('reports')) {
                            setUpgradeFeature('reports');
                            return;
                        }
                        setShowReportModal(true);
                    }} className="bg-gold border-gold text-black hover:bg-gold2 flex-1 sm:flex-none">
                        📊 Hesabat
                    </Button>
                    {canAddPayment && (
                        <Button onClick={() => setIsModalOpen(true)} className="flex-[2] sm:flex-none">
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni
                        </Button>
                    )}
                </div>
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
                    <div className="w-full sm:w-auto flex items-end">
                        <Button
                            variant={showDeleted ? undefined : 'outline'}
                            onClick={() => setShowDeleted(!showDeleted)}
                            className={`w-full ${showDeleted ? 'bg-red/10 text-red border-red/20 hover:bg-red/20' : ''}`}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {showDeleted ? 'Aktivləri Göstər' : 'Silinmişləri Göstər'}
                        </Button>
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
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tarix</TableHead>
                                            <TableHead>Obyekt / İcarəçi</TableHead>
                                            <TableHead>Müqavilə</TableHead>
                                            <TableHead>İstifadə Məqsədi</TableHead>
                                            <TableHead>Dövr</TableHead>
                                            <TableHead>Növü</TableHead>
                                            <TableHead className="text-right">Məbləğ</TableHead>
                                            {showDeleted && <TableHead className="text-right">Əməliyyatlar</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {payments.map((payment: any) => (
                                            <TableRow key={payment.id} className="hover:bg-surface transition-colors">
                                                <TableCell>{new Date(payment.paymentDate).toLocaleDateString('az-AZ')}</TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-text">{payment.contract.tenant.fullName}</p>
                                                    <p className="text-xs text-muted">{payment.contract.property?.name}</p>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted">N: {payment.contract.number}</TableCell>
                                                <TableCell className="text-xs text-muted">
                                                    {rentalTypeLabel[payment.contract.rentalType] || payment.contract.rentalType}
                                                </TableCell>
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
                                                <TableCell className="text-right">
                                                    <span className="font-bold text-green block">
                                                        +{formatMoney(Number(payment.amount))}
                                                    </span>
                                                    {payment.note && (
                                                        <span className="text-xs text-muted italic block mt-1 break-words max-w-[150px] ml-auto">
                                                            {payment.note}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                {showDeleted && (
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-green/50 text-green hover:bg-green/10 m-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                restoreMutation.mutate(payment.id);
                                                            }}
                                                            disabled={restoreMutation.isPending}
                                                        >
                                                            <ArchiveRestore className="w-4 h-4 mr-2" />
                                                            Bərpa et
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        {/* Total Row */}
                                        <TableRow className="bg-surface/50">
                                            <TableCell colSpan={6} className="text-right font-bold text-text">
                                                Yekun Məbləğ (Cari Dövr):
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold text-green text-lg">
                                                {formatMoney(Number(totalAmount))}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card List View */}
                            <div className="md:hidden flex flex-col divide-y divide-border">
                                {payments.map((payment: any) => (
                                    <div key={`mob-${payment.id}`} className="p-4 hover:bg-surface transition-colors flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${payment.paymentType === 'CASH' ? 'bg-green/10 text-green border border-green/20' : payment.paymentType === 'BANK' ? 'bg-blue/10 text-blue border border-blue/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                                                        {payment.paymentType}
                                                    </span>
                                                    <span className="text-xs text-muted truncate">{new Date(payment.paymentDate).toLocaleDateString('az-AZ')}</span>
                                                </div>
                                                <div className="text-right shrink-0 ml-2">
                                                    <span className="font-bold text-green block">+{formatMoney(Number(payment.amount))}</span>
                                                    {payment.note && (
                                                        <span className="text-[10px] text-muted italic block mt-0.5 max-w-[120px] truncate">{payment.note}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-text truncate transition-colors">{payment.contract.tenant.fullName}</div>
                                            <div className="text-xs text-muted mb-2 truncate">{payment.contract.property?.name} • N: {payment.contract.number}</div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-xs text-muted">{rentalTypeLabel[payment.contract.rentalType] || payment.contract.rentalType}</span>
                                                <span className="text-xs font-medium text-text">{months[(payment.periodMonth || 1) - 1]} {payment.periodYear}</span>
                                            </div>

                                            {showDeleted && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-green/50 text-green hover:bg-green/10 mt-4 w-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        restoreMutation.mutate(payment.id);
                                                    }}
                                                    disabled={restoreMutation.isPending}
                                                >
                                                    <ArchiveRestore className="w-4 h-4 mr-2" />
                                                    Bərpa et
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {/* Total Mobile Row */}
                                <div className="p-4 bg-surface/30 flex justify-between items-center">
                                    <span className="font-bold text-text">Yekun:</span>
                                    <span className="font-extrabold text-green text-lg">{formatMoney(Number(totalAmount))}</span>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Add Payment Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Ödəniş Əlavə Et">
                <form onSubmit={handleAddPayment} className="space-y-4">
                    <div className="relative">
                        <ContractCombobox
                            contracts={activeContracts}
                            value={formContractId}
                            onChange={setFormContractId}
                        />
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

            {/* Report Modal */}
            <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Mədaxil Hesabatı Yarat">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Mədaxil hesabatını generə etmək üçün tarix aralığını seçin.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Başlanğıc tarixi"
                            type="date"
                            value={reportStartDate}
                            onChange={(e) => setReportStartDate(e.target.value)}
                        />
                        <Input
                            label="Bitmə tarixi"
                            type="date"
                            value={reportEndDate}
                            onChange={(e) => setReportEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-border mt-6">
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleExportExcel}
                                disabled={isExporting}
                            >
                                {isExporting ? 'Yüklənir...' : 'Excel Yüklə'}
                            </Button>
                            <Button
                                className="flex-1 bg-gold hover:bg-gold2 text-black"
                                onClick={handlePrintPDF}
                                disabled={isExporting}
                            >
                                {isExporting ? 'Hazırlanır...' : 'PDF Yüklə'}
                            </Button>
                        </div>
                        <Button
                            className="w-full bg-blue border-blue/50 text-white"
                            onClick={() => setIsEmailModalOpen(true)}
                            disabled={isExporting}
                        >
                            MAIL-a göndər
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Hesabatı E-poçta Göndər">
                <div className="space-y-4">
                    <Input
                        label="E-poçt ünvanı"
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                    />
                    <div className="flex gap-4">
                        <Button variant="outline" className="flex-1" onClick={() => setIsEmailModalOpen(false)}>Ləğv et</Button>
                        <Button className="flex-1" onClick={handleSendEmail} disabled={isExporting || !emailAddress}>
                            Göndər
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Upgrade Modal Gate */}
            {upgradeFeature && (
                <div className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40">
                    <UpgradeModal
                        isOpen={true}
                        feature={upgradeFeature}
                        requiredPlan={upgradeFeature === 'addUnit' ? (plan === 'free' ? 'starter' : (plan === 'starter' ? 'pro' : 'business')) : 'starter'}
                        onClose={() => setUpgradeFeature(null)}
                    />
                </div>
            )}
        </div>
    );
}
