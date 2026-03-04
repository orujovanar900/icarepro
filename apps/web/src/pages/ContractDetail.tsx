import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Download, Plus, Archive, RefreshCw, History, AlertCircle, ShieldCheck, Check, Edit2, FileDown, Paperclip, UploadCloud, ChevronDown, ChevronUp, Trash2, Eye, X, Loader2 } from 'lucide-react';
import { generateContractPdf } from '@/lib/pdfGenerator';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToastStore } from '@/store/toast';
import { useAuthStore } from '@/store/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatMoneyExact = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
    const [activeTab, setActiveTab] = useState<'payments' | 'history' | 'documents'>('payments');

    // Document upload state
    const [docType, setDocType] = useState('ACT');
    const [docTitle, setDocTitle] = useState('');
    const [docNotes, setDocNotes] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [docFileRef, setDocFileRef] = useState<File | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const docFileInputRef = React.useRef<HTMLInputElement>(null);

    // Renewal modal state
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewEndDate, setRenewEndDate] = useState('');
    const [renewRent, setRenewRent] = useState('');
    const [renewNote, setRenewNote] = useState('');
    const [isRenewing, setIsRenewing] = useState(false);

    // Deposit & penalty state
    const [isTogglingDeposit, setIsTogglingDeposit] = useState(false);
    const [showPenaltyModal, setShowPenaltyModal] = useState(false);
    // Deposit Add state
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmountInput, setDepositAmountInput] = useState('');
    const [isAddingDeposit, setIsAddingDeposit] = useState(false);

    const [penaltyAmount, setPenaltyAmount] = useState('');
    const [penaltyNote, setPenaltyNote] = useState('');
    const [isApplyingPenalty, setIsApplyingPenalty] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Payment Mode edit state
    const [showPaymentModeModal, setShowPaymentModeModal] = useState(false);
    const [editPaymentMode, setEditPaymentMode] = useState<'CALENDAR' | 'FIXED_DAY'>('CALENDAR');
    const [editPaymentDay, setEditPaymentDay] = useState(1);
    const [isUpdatingPaymentMode, setIsUpdatingPaymentMode] = useState(false);

    const { user: currentUser } = useAuthStore();
    const canManagePenalties = ['OWNER', 'MANAGER'].includes(currentUser?.role || '');
    const canManageDocs = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'].includes(currentUser?.role || '');

    // Fetch contract documents
    const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
        queryKey: ['contract-documents', id],
        queryFn: async () => {
            const res = await api.get(`/contracts/${id}/documents`);
            return res.data.data as any[];
        },
        enabled: activeTab === 'documents',
    });
    const contractDocs = docsData || [];

    const DOC_TYPES = [
        { value: 'ACT', label: '📋 Akt', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
        { value: 'NOTIFICATION', label: '🔔 Bildiris', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        { value: 'ADDENDUM', label: '➕ Əlavə', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        { value: 'INVOICE', label: '🧾 Hesab-faktura', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
        { value: 'OTHER', label: '📄 Digər', badge: 'bg-surface text-muted border-border' },
    ];

    const getDocTypeMeta = (type: string) => (DOC_TYPES.find(t => t.value === type) ?? DOC_TYPES[4])!;

    const autoDocTitle = (type: string) => {
        const meta = getDocTypeMeta(type);
        return `${meta?.label?.replace(/^[^ ]+ /, '') ?? type} - ${new Date().toLocaleDateString('az-AZ')}`;
    };

    const handleUploadContractDoc = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!docFileRef) { addToast({ message: 'Fayl seçin', type: 'error' }); return; }
        setIsUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', docFileRef);
        const title = docTitle || autoDocTitle(docType);
        try {
            await api.post(`/contracts/${id}/documents?type=${docType}&title=${encodeURIComponent(title)}&notes=${encodeURIComponent(docNotes)}`, formData);
            addToast({ message: 'Sənəd yükləndi ✓', type: 'success' });
            setDocFileRef(null);
            setDocTitle('');
            setDocNotes('');
            if (docFileInputRef.current) docFileInputRef.current.value = '';
            refetchDocs();
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteContractDoc = async (docId: string) => {
        if (!confirm('Sənədi silmək istədiyinizə əminsiniz?')) return;
        await api.delete(`/contracts/${id}/documents/${docId}`);
        addToast({ message: 'Sənəd silindi', type: 'success' });
        refetchDocs();
    };

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

    const handleRenew = async () => {
        if (!renewEndDate) return;
        setIsRenewing(true);
        try {
            await api.post(`/contracts/${id}/renew`, {
                newEndDate: renewEndDate,
                ...(renewRent ? { newMonthlyRent: Number(renewRent) } : {}),
                note: renewNote || undefined,
            });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            queryClient.invalidateQueries({ queryKey: ['audit-logs', id] });
            addToast({ message: 'Müqavilə uzadıldı', type: 'success' });
            setShowRenewModal(false);
            setRenewEndDate('');
            setRenewRent('');
            setRenewNote('');
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsRenewing(false);
        }
    };

    const handleToggleDeposit = async () => {
        setIsTogglingDeposit(true);
        try {
            const newVal = !contract.isDepositReturned;
            await api.patch(`/contracts/${id}`, { isDepositReturned: newVal });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            addToast({ message: newVal ? 'Depozit qaytarildı olaraq işarləndi' : 'Depozit qaytarilmamış olaraq işarləndi', type: 'success' });
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsTogglingDeposit(false);
        }
    };

    const handleApplyPenalty = async () => {
        if (!penaltyAmount || Number(penaltyAmount) <= 0) return;
        setIsApplyingPenalty(true);
        try {
            await api.post('/payments', {
                contractId: id,
                amount: -Math.abs(Number(penaltyAmount)), // negative = penalty deduction marker
                paymentDate: new Date().toISOString().split('T')[0],
                paymentType: 'LATE_FEE',
                periodMonth: new Date().getMonth() + 1,
                periodYear: new Date().getFullYear(),
                note: `Cərimə: ${penaltyNote || 'gecikmə cəriməsi'}`,
            });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            addToast({ message: 'Cərimə tətbiq edildi', type: 'success' });
            setShowPenaltyModal(false);
            setPenaltyAmount('');
            setPenaltyNote('');
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsApplyingPenalty(false);
        }
    };

    const handleUpdatePaymentMode = async () => {
        setIsUpdatingPaymentMode(true);
        try {
            await api.patch(`/contracts/${id}`, {
                paymentMode: editPaymentMode,
                paymentDay: editPaymentMode === 'FIXED_DAY' ? Number(editPaymentDay) : null
            });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            addToast({ message: 'Ödəniş rejimi yeniləndi', type: 'success' });
            setShowPaymentModeModal(false);
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingPaymentMode(false);
        }
    };

    const addPaymentMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/payments', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            queryClient.invalidateQueries({ queryKey: ['audit-logs', id] });
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

    const isExpired = contract.status === 'ACTIVE' && new Date(contract.endDate) < new Date();
    const computedStatus = isExpired ? 'EXPIRED' : contract.status;

    const getStatusBadgeVariant = (s: string) => {
        switch (s) {
            case 'ACTIVE': return 'aktiv';
            case 'ARCHIVED': return 'arxiv';
            case 'EXPIRED': return 'borclu';
            case 'DRAFT': return 'draft';
            default: return 'draft';
        }
    };

    const getStatusText = (s: string) => {
        switch (s) {
            case 'ACTIVE': return 'Aktiv';
            case 'ARCHIVED': return 'Arxiv';
            case 'EXPIRED': return 'Müddəti keçmiş';
            case 'DRAFT': return 'Qaralama';
            default: return s;
        }
    };

    // calculate total debt
    const start = new Date(contract.startDate);
    const end = contract.endDate < new Date().toISOString() ? new Date(contract.endDate) : new Date();
    const monthsElapsed = Math.max(0,
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
    );
    const totalExpected = Number(contract.monthlyRent) * monthsElapsed;
    const totalPaid = contract.payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
    const totalDebt = Math.max(0, totalExpected - totalPaid);

    // Calculate Brutto / Netto displays
    const nettoRent = Number(contract.monthlyRent);
    const bruttoRent = nettoRent / 0.86;
    const taxAmount = bruttoRent - nettoRent;

    const totalNetto = nettoRent * monthsElapsed;
    const totalBrutto = bruttoRent * monthsElapsed;

    const lastPayment = contract.payments?.length > 0
        ? contract.payments.reduce((latest: any, p: any) => new Date(p.paymentDate) > new Date(latest.paymentDate) ? p : latest)
        : null;

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

    let tenantFullName = '-';
    if (contract.tenant) {
        if (contract.tenant.tenantType === 'fiziki') {
            tenantFullName = [contract.tenant.lastName, contract.tenant.firstName, contract.tenant.fatherName].filter(Boolean).join(' ');
        } else {
            tenantFullName = contract.tenant.companyName || '';
        }
    }

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
                            <Badge variant={getStatusBadgeVariant(computedStatus)}>
                                {getStatusText(computedStatus)}
                            </Badge>
                        </h1>
                        <p className="text-muted mt-2 text-lg">
                            Kirayəçi: <span className="font-semibold text-text">{tenantFullName}</span>
                        </p>
                    </div>
                    <div className="flex gap-2 items-start mt-2 sm:mt-0">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                setIsGeneratingPdf(true);
                                try {
                                    await generateContractPdf(contract);
                                    addToast({ message: 'PDF uğurla yaradıldı və yükləndi', type: 'success' });
                                } catch (e) {
                                    addToast({ message: 'PDF yaradılarkən xəta baş verdi', type: 'error' });
                                } finally {
                                    setIsGeneratingPdf(false);
                                }
                            }}
                            disabled={isGeneratingPdf}
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            {isGeneratingPdf ? 'Yüklənir...' : 'PDF Yüklə'}
                        </Button>
                        {(contract.status === 'ACTIVE' || isExpired) && (
                            <Button variant="outline" onClick={() => {
                                setRenewEndDate(contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] ?? '' : '');
                                setShowRenewModal(true);
                            }}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Uzat
                            </Button>
                        )}
                        {contract.status === 'ACTIVE' && !isExpired && (
                            <Button variant="outline" onClick={() => setShowArchiveConfirm(true)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Arxivləşdir
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Info */}
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Müqavilə Məlumatları</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                                    {/* Column 1 */}
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Kirayəçi</h3>
                                            <p className="text-base font-bold text-text mt-1">{contract.tenant.fullName}</p>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm font-medium text-text">Tel: {contract.tenant.phone?.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, '+$1 $2 $3 $4 $5') || contract.tenant.phone}</p>
                                                <p className="text-sm text-muted">VÖEN: {contract.tenant.taxId || '-'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Obyekt</h3>
                                            <p className="text-base font-bold text-text mt-1">{contract.property.name}</p>
                                        </div>
                                    </div>

                                    {/* Column 2 */}
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Müddət</h3>
                                            <p className="text-base font-bold text-text mt-1">
                                                {new Date(contract.startDate).toLocaleDateString('az-AZ')} — {new Date(contract.endDate).toLocaleDateString('az-AZ')}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="bg-surface rounded-xl p-4 border border-border mt-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-text">Aylıq İcarə (Netto)</span>
                                                    <span className="text-sm font-medium text-text">{formatMoneyExact(nettoRent)}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-bold text-gold">Aylıq Brutto (÷0.86)</span>
                                                    <span className="text-sm font-bold text-gold">{formatMoneyExact(bruttoRent)}</span>
                                                </div>
                                                <div className="border-t border-border/60 pt-3">
                                                    <div
                                                        className="flex justify-between items-center cursor-help"
                                                        title="Bu məbləğ vergi orqanına ödənilir"
                                                    >
                                                        <div>
                                                            <span className="text-[13px] text-orange/80 block">ÖMV (14%)</span>
                                                            <span className="text-[10px] text-muted block">(Vergi ödəniləcək məbləğ)</span>
                                                        </div>
                                                        <span className="text-[13px] font-medium text-orange/80">{formatMoneyExact(taxAmount)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 3 */}
                                    <div className="p-6 space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Ödəniş rejimi</h3>
                                                <Button variant="ghost" size="sm" onClick={() => {
                                                    setEditPaymentMode(contract.paymentMode || 'CALENDAR');
                                                    setEditPaymentDay(contract.paymentDay || new Date(contract.startDate).getDate());
                                                    setShowPaymentModeModal(true);
                                                }} className="h-6 px-2 text-xs text-gold hover:text-gold-light -mt-1 -mr-2">
                                                    <Edit2 className="w-3" />
                                                </Button>
                                            </div>
                                            <p className="text-base font-bold text-text mt-1">
                                                {contract.paymentMode === 'FIXED_DAY' ? `Başlama tarixindən (${contract.paymentDay || new Date(contract.startDate).getDate()}-dan)` : 'Ayın əvvəlindən (1-dən 1-nə)'}
                                            </p>
                                        </div>
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Növbəti Ödəniş</h3>
                                                <p className="text-base font-bold text-text mt-1">
                                                    {contract.paymentMode === 'FIXED_DAY' ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, contract.paymentDay || new Date(contract.startDate).getDate()).toLocaleDateString('az-AZ') : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('az-AZ')} tarixinədək
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.5px]">Son Ödəniş</h3>
                                                <p className="text-base font-bold text-text mt-1">{lastPayment ? new Date(lastPayment.paymentDate).toLocaleDateString('az-AZ') : '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payments History */}
                        {/* Tabs */}
                        <div className="flex space-x-1 border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'payments' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'
                                    }`}
                            >
                                Ödənişlər
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'history' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'
                                    }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                Tarixçə
                            </button>
                            <button
                                onClick={() => setActiveTab('documents')}
                                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'documents' ? 'border-gold text-gold' : 'border-transparent text-muted hover:text-text'
                                    }`}
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                Sənədlər
                                {contractDocs.length > 0 && (
                                    <span className="ml-1 bg-gold/20 text-gold text-xs px-1.5 py-0.5 rounded-full font-semibold">{contractDocs.length}</span>
                                )}
                            </button>
                        </div>

                        {activeTab === 'payments' && (
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
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Summary */}
                        <Card variant="elevated" className={totalDebt > 0 ? 'border-red/20' : 'border-green/20'}>
                            <CardHeader>
                                <CardTitle>Maliyyə Xülasəsi</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="bg-surface rounded-lg p-3 space-y-1.5 text-sm border border-border">
                                    <div className="flex justify-between">
                                        <span className="text-muted">Aylıq icarə</span>
                                        <span className="font-medium">{formatMoney(nettoRent)}</span>
                                    </div>
                                    <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
                                        <span className="text-muted">Keçən müddət</span>
                                        <span className="font-medium">{monthsElapsed} ay</span>
                                    </div>
                                    {contract.payments.some((p: any) => p.paymentType === 'PRO_RATA') && (
                                        <div className="flex justify-between text-gold">
                                            <span className="text-sm">Birinci ödəniş (Pro-rata)</span>
                                            <span className="font-medium">
                                                {formatMoney(Number(contract.payments.find((p: any) => p.paymentType === 'PRO_RATA')?.amount || 0))}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-border flex justify-between font-bold">
                                        <span className="text-text">Ümumi məbləğ</span>
                                        <span className="text-text">{formatMoney(totalExpected)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-border pt-1.5 mt-2">
                                        <span className="text-muted">— Ödənilmiş</span>
                                        <span className="font-bold text-green">{formatMoney(totalPaid)}</span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border flex justify-between items-center">
                                    <span className="text-sm font-bold text-text">Cari Borc</span>
                                    <span className={`text-2xl font-bold ${totalDebt > 0 ? 'text-red' : 'text-green'}`}>
                                        {formatMoney(totalDebt)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Deposit Card */}
                        <Card variant="elevated">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className={`w-8 h-8 ${contract.isDepositReturned && Number(contract.depositAmount) > 0 ? 'text-green' : 'text-gold'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-text">Depozit</p>
                                        <p className={`text-xs ${contract.isDepositReturned && Number(contract.depositAmount) > 0 ? 'text-green font-medium' : 'text-muted'}`}>
                                            {Number(contract.depositAmount) > 0
                                                ? (contract.isDepositReturned ? 'Depozit qaytarılıb ✓' : formatMoney(Number(contract.depositAmount)))
                                                : 'Təyin edilməyib'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {Number(contract.depositAmount) > 0 ? (
                                        <>
                                            {!contract.isDepositReturned && (
                                                <Badge variant="draft">
                                                    Saxlanılır
                                                </Badge>
                                            )}
                                            {canManagePenalties && (
                                                <Button
                                                    variant={contract.isDepositReturned ? 'outline' : 'ghost'}
                                                    size="sm"
                                                    onClick={contract.isDepositReturned ? () => setShowDepositModal(true) : handleToggleDeposit}
                                                    disabled={isTogglingDeposit}
                                                >
                                                    {isTogglingDeposit
                                                        ? '...'
                                                        : contract.isDepositReturned
                                                            ? <><Plus className="w-3 h-3 mr-1" /> Əlavə et</>
                                                            : 'Qaytar'}
                                                </Button>
                                            )}
                                        </>
                                    ) : (
                                        canManagePenalties && (
                                            <Button variant="outline" size="sm" onClick={() => setShowDepositModal(true)}>
                                                <Plus className="w-3 h-3 mr-1" /> Əlavə et
                                            </Button>
                                        )
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Penalty Button */}
                        {canManagePenalties && computedStatus === 'ACTIVE' && (
                            <Card variant="elevated">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-red" />
                                            <span className="text-sm font-medium text-text">Cərimə</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-red/40 text-red hover:bg-red/10"
                                            onClick={() => setShowPenaltyModal(true)}
                                        >
                                            Cərimə tətbiq et
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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


                    </div>
                </div>
            </div>

            {/* ── Documents Tab Content ── */}
            {activeTab === 'documents' && (
                <div className="space-y-4">
                    {/* Upload Form */}
                    {canManageDocs && (
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UploadCloud className="w-5 h-5 text-gold" />
                                    Sənəd yüklə
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUploadContractDoc} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Select
                                            label="Sənəd növü"
                                            value={docType}
                                            onChange={e => { setDocType(e.target.value); setDocTitle(''); }}
                                            options={[
                                                { label: '📋 Akt (Təhvil-təslim aktı)', value: 'ACT' },
                                                { label: '🔔 Bildiriş', value: 'NOTIFICATION' },
                                                { label: '➕ Əlavə (Müqaviləyə əlavə)', value: 'ADDENDUM' },
                                                { label: '🧾 Hesab-faktura', value: 'INVOICE' },
                                                { label: '📄 Digər', value: 'OTHER' },
                                            ]}
                                        />
                                        <Input
                                            label="Sənəd adı (avtomatik doldurulur)"
                                            value={docTitle}
                                            onChange={e => setDocTitle(e.target.value)}
                                            placeholder={`${getDocTypeMeta(docType)?.label?.replace(/^[^ ]+ /, '') ?? docType} - ${new Date().toLocaleDateString('az-AZ')}`}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted uppercase tracking-wide">Fayl * (PDF, DOC, DOCX, XLSX, JPG, PNG — max 5MB)</label>
                                        <div
                                            className="border-2 border-dashed border-border hover:border-gold/50 rounded-xl p-6 text-center cursor-pointer transition-colors group"
                                            onClick={() => docFileInputRef.current?.click()}
                                        >
                                            {docFileRef ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <FileText className="w-6 h-6 text-gold" />
                                                    <span className="text-sm text-text">{docFileRef.name}</span>
                                                    <button type="button" onClick={e => { e.stopPropagation(); setDocFileRef(null); if (docFileInputRef.current) docFileInputRef.current.value = ''; }} className="text-muted hover:text-red">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="w-8 h-8 text-muted mx-auto mb-2 group-hover:text-gold transition-colors" />
                                                    <p className="text-sm text-muted group-hover:text-text transition-colors">Faylı buraya sürükləyin və ya klikləyin</p>
                                                </>
                                            )}
                                        </div>
                                        <input
                                            ref={docFileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png"
                                            onChange={e => setDocFileRef(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                    <Input
                                        label="Qeyd (isteğə bağlı)"
                                        value={docNotes}
                                        onChange={e => setDocNotes(e.target.value)}
                                        placeholder="Bu sənəd haqqında qeyd..."
                                    />
                                    <Button type="submit" disabled={isUploadingDoc || !docFileRef} className="w-full sm:w-auto">
                                        {isUploadingDoc ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yüklənir...</> : <><UploadCloud className="w-4 h-4 mr-2" /> Yüklə</>}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* Documents List */}
                    {docsLoading ? (
                        <div className="py-8 text-center text-muted text-sm">Yüklənir...</div>
                    ) : contractDocs.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted">
                            <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Bu müqaviləyə hələ sənəd əlavə edilməyib</p>
                            {canManageDocs && <p className="text-sm mt-1">Yuxarıdakı formdan sənəd yükləyin</p>}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {DOC_TYPES.map(typeInfo => {
                                const typeDocs = contractDocs.filter((d: any) => d.type === typeInfo.value);
                                if (typeDocs.length === 0) return null;
                                const isCollapsed = collapsedGroups[typeInfo.value];
                                return (
                                    <Card key={typeInfo.value} variant="default">
                                        <button
                                            className="w-full flex items-center justify-between p-4 hover:bg-surface/50 transition-colors"
                                            onClick={() => setCollapsedGroups(g => ({ ...g, [typeInfo.value]: !g[typeInfo.value] }))}
                                        >
                                            <span className="flex items-center gap-2 font-medium text-text">
                                                {typeInfo.label}
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${typeInfo.badge}`}>{typeDocs.length}</span>
                                            </span>
                                            {isCollapsed ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronUp className="w-4 h-4 text-muted" />}
                                        </button>
                                        {!isCollapsed && (
                                            <div className="divide-y divide-border border-t border-border">
                                                {typeDocs.map((doc: any) => (
                                                    <div key={doc.id} className="flex items-center gap-3 p-4">
                                                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${typeInfo.badge}`}>
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-text truncate">{doc.title}</p>
                                                            <p className="text-xs text-muted">{doc.fileName} · {(doc.fileSize / 1024).toFixed(0)} KB · {new Date(doc.uploadedAt).toLocaleDateString('az-AZ')}</p>
                                                            {doc.notes && <p className="text-xs text-muted italic mt-0.5">{doc.notes}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted hover:text-gold transition-colors rounded" title="Bax">
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                            <a href={doc.fileUrl} download={doc.fileName} className="p-1.5 text-muted hover:text-blue-400 transition-colors rounded" title="Yüklə">
                                                                <Download className="w-4 h-4" />
                                                            </a>
                                                            {canManageDocs && (
                                                                <button onClick={() => handleDeleteContractDoc(doc.id)} className="p-1.5 text-muted hover:text-red transition-colors rounded" title="Sil">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

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

            {/* Renewal Modal */}
            <Modal isOpen={showRenewModal} onClose={() => setShowRenewModal(false)} title="Müqaviləni Uzat">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Yeni bitmə tarixini seçin. İstərənilsə aylıq icarəni də yeniləyə bilərsiniz.</p>
                    <Input
                        label="Yeni Bitmə Tarixi"
                        type="date"
                        value={renewEndDate}
                        onChange={(e) => setRenewEndDate(e.target.value)}
                    />
                    <Input
                        label="Yeni Aylıq İcarə (₼) — isteğə bənzərdir"
                        type="number"
                        value={renewRent}
                        onChange={(e) => setRenewRent(e.target.value)}
                        placeholder="Dəyişməzsə boş buraxın"
                    />
                    <Input
                        label="Qeyd"
                        value={renewNote}
                        onChange={(e) => setRenewNote(e.target.value)}
                        placeholder="İxtiyari şərh..."
                    />
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowRenewModal(false)}>Ləğv et</Button>
                        <Button className="flex-1" onClick={handleRenew} disabled={isRenewing || !renewEndDate}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {isRenewing ? 'Uzadılır...' : 'Uzat'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Deposit Add Modal */}
            <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Depozit Əlavə Et">
                <div className="space-y-4">
                    <p className="text-sm text-muted">İcarəçi tərəfindən ödənilən depozit məbləğini daxil edin:</p>
                    <Input
                        label="Depozit Məbləği (₼)"
                        type="number"
                        step="0.01"
                        value={depositAmountInput}
                        onChange={(e) => setDepositAmountInput(e.target.value)}
                        placeholder="Məs: 500"
                    />
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowDepositModal(false)}>Ləğv et</Button>
                        <Button
                            className="flex-1"
                            onClick={async () => {
                                if (!depositAmountInput || isNaN(Number(depositAmountInput))) return;
                                setIsAddingDeposit(true);
                                try {
                                    await api.patch(`/contracts/${id}`, { depositAmount: Number(depositAmountInput), isDepositReturned: false });
                                    await queryClient.invalidateQueries({ queryKey: ['contract', id] });
                                    addToast({ message: 'Depozit əlavə edildi', type: 'success' });
                                    setShowDepositModal(false);
                                    setDepositAmountInput('');
                                } catch (err: any) {
                                    addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
                                } finally {
                                    setIsAddingDeposit(false);
                                }
                            }}
                            disabled={isAddingDeposit || !depositAmountInput}
                        >
                            {isAddingDeposit ? 'Əlavə edilir...' : 'Əlavə et'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Penalty Modal */}
            <Modal isOpen={showPenaltyModal} onClose={() => setShowPenaltyModal(false)} title="Cərimə Tətbiq Et">
                <div className="space-y-4">
                    <p className="text-sm text-muted">İcarəçiyə gecikməyə görə cərimə tətbiq edin. Bu məbləğ ödəniş tarixçəsində <strong>LATE_FEE</strong> kimi qeyd olunacaq.</p>
                    <Input
                        label="Cərimə Məbləği (₼)"
                        type="number"
                        step="0.01"
                        value={penaltyAmount}
                        onChange={(e) => setPenaltyAmount(e.target.value)}
                        placeholder="Məs: 50"
                    />
                    <Input
                        label="Səbəb / Qeyd"
                        value={penaltyNote}
                        onChange={(e) => setPenaltyNote(e.target.value)}
                        placeholder="Məs: 15 günlük gecikmə"
                    />
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowPenaltyModal(false)}>Ləğv et</Button>
                        <Button
                            className="flex-1 bg-red hover:bg-red/80 text-white"
                            onClick={handleApplyPenalty}
                            disabled={isApplyingPenalty || !penaltyAmount}
                        >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {isApplyingPenalty ? 'Tətbiq edilir...' : 'Cərimə tətbiq et'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Payment Mode Edit Modal */}
            <Modal isOpen={showPaymentModeModal} onClose={() => setShowPaymentModeModal(false)} title="Ödəniş rejimini dəyiş">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Aylıq ödənişlərin hesablanma və borc yaranma qaydasını seçin:</p>
                    <div className="flex flex-col gap-3">
                        <button
                            type="button"
                            onClick={() => setEditPaymentMode('CALENDAR')}
                            className={`p-3 border rounded-lg text-left transition-colors flex items-center justify-between ${editPaymentMode === 'CALENDAR' ? 'border-gold bg-gold/10 text-gold' : 'border-border text-text hover:bg-surface'}`}
                        >
                            <span>Ayın əvvəlindən (1-dən 1-nə)</span>
                            {editPaymentMode === 'CALENDAR' && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditPaymentMode('FIXED_DAY')}
                            className={`p-3 border rounded-lg text-left transition-colors flex items-center justify-between ${editPaymentMode === 'FIXED_DAY' ? 'border-gold bg-gold/10 text-gold' : 'border-border text-text hover:bg-surface'}`}
                        >
                            <span>Başlama tarixindən ({editPaymentDay}-dan {editPaymentDay}-a)</span>
                            {editPaymentMode === 'FIXED_DAY' && <Check className="w-4 h-4 ml-2 flex-shrink-0" />}
                        </button>
                    </div>

                    {editPaymentMode === 'FIXED_DAY' && (
                        <div className="mt-4 p-3 bg-surface border border-border rounded-lg space-y-3">
                            <Input
                                label="Ödəniş günü (1-31)"
                                type="number"
                                min="1"
                                max="31"
                                value={editPaymentDay}
                                onChange={(e) => setEditPaymentDay(Number(e.target.value))}
                            />
                            <div className="flex gap-2 items-start text-xs text-gold/80 bg-gold/5 p-2 rounded">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p>Gözlənilən ödənişlər hər ay bu müqavilənin başlama tarixində yaranacaq.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModeModal(false)}>Ləğv et</Button>
                        <Button className="flex-1" onClick={handleUpdatePaymentMode} disabled={isUpdatingPaymentMode}>
                            {isUpdatingPaymentMode ? 'Yadda saxlanılır...' : 'Yadda saxla'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

// ─── Audit Log Sub-Component ──────────────────────────────
function AuditLogTab({ contractId }: { contractId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', contractId],
        queryFn: async () => {
            const res = await api.get(`/contracts/${contractId}/audit-logs`);
            return res.data.data as any[];
        },
    });

    const actionLabel: Record<string, string> = {
        CREATE_CONTRACT: 'Müqavilə yaradıldı',
        UPDATE_CONTRACT: 'Müqavilə yeniləndi',
        ARCHIVE_CONTRACT: 'Müqavilə arxivləşdirildi',
        RENEW_CONTRACT: 'Müqavilə uzadıldı',
        ADD_PAYMENT: 'Ödəniş əlavə edildi',
        DELETE_PAYMENT: 'Ödəniş silindi',
    };

    if (isLoading) return <div className="py-8 text-center text-muted text-sm">Yüklənir...</div>;
    if (!data || data.length === 0) return (
        <div className="py-12 text-center text-muted">
            <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p>Tarixçə boşdur.</p>
        </div>
    );

    return (
        <div className="divide-y divide-border">
            {data.map((log: any) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0 text-xs font-bold mt-0.5">
                            {log.user?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-text">{actionLabel[log.action] || log.action}</p>
                            <p className="text-xs text-muted">{log.user?.name || log.user?.email || 'Sistem'}</p>
                            {log.metadata?.note && (
                                <p className="text-xs text-muted italic mt-1">{log.metadata.note}</p>
                            )}
                            {log.metadata?.newEndDate && (
                                <p className="text-xs text-muted mt-0.5">
                                    Yeni bitmə tarixi: {new Date(log.metadata.newEndDate).toLocaleDateString('az-AZ')}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted whitespace-nowrap shrink-0">
                        {new Date(log.createdAt).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            ))}
        </div>
    );
}
