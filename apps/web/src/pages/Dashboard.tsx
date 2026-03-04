import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Wallet, TrendingUp, AlertCircle, Calendar, ArrowRight, Users, Search,
    ArrowUpRight, ArrowDownRight, MapPin, Clock, Plus, X,
    AlertTriangle, CalendarX, Building2, LineChart
} from 'lucide-react';
import { api } from '@/lib/api';
import { TopBar } from '@/components/ui/TopBar';
import { Sidebar } from '@/components/ui/Sidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import SimpleMap from '@/components/SimpleMap';

const rentalTypeLabel: Record<string, string> = {
    RESIDENTIAL_LONG: 'Yaşayış (uzunmüddətli)',
    COMMERCIAL: 'Kommersiya',
    RESIDENTIAL_SHORT: 'Yaşayış (qısamüddətli)',
    PARKING: 'Dayanacaq',
    SUBLEASE: 'Alt-icarə'
};

// Helper to format currency
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

// API Fetchers
const fetchDashboardData = async (month: number, year: number) => {
    const res = await api.get(`/dashboard?month=${month}&year=${year}`);
    return res.data.data; // Extracts mapped data payload
};

const fetchRecentPayments = async () => {
    const res = await api.get('/payments?limit=7');
    return res.data.data; // Extracts array payload
};

// CountUp component for Balans
function CountUpNumber({ value }: { value: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = value;
        if (start === end) return;
        const duration = 1000;
        const increment = end / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value]);

    return <>{formatMoney(count)}</>;
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    override componentDidCatch(error: any, errorInfo: any) {
        console.error("Dashboard Error:", error, errorInfo);
    }

    override render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 m-6 bg-red/10 border border-red text-red rounded-lg overflow-auto max-w-full">
                    <h2 className="text-xl font-bold mb-2">Dashboard Error</h2>
                    <pre className="text-xs whitespace-pre-wrap">{String(this.state.error?.stack || this.state.error)}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function ContractCombobox({ contracts, value, onChange }: { contracts: any[], value: string, onChange: (val: string) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = contracts.filter((c: any) =>
        c.number.toLowerCase().includes(search.toLowerCase()) ||
        c.tenant?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        c.property?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const selected = contracts.find(c => c.id === value);

    return (
        <div className="flex flex-col gap-1 relative" ref={ref}>
            <label className="text-sm font-medium text-text">
                Müqavilə Seçin <span className="text-red">*</span>
            </label>
            <div
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus-within:border-gold/50 cursor-pointer min-h-[38px]"
                onClick={() => setOpen(!open)}
            >
                {selected
                    ? `${selected.tenant?.fullName} — №${selected.number} (${selected.property?.name})`
                    : <span className="text-muted">Seçin...</span>
                }
            </div>
            {open && (
                <div className="absolute z-50 mt-[70px] w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-border relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                            autoFocus
                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-gold/50 text-text"
                            placeholder="Axtarış..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-muted">Tapılmadı</div>
                        ) : filtered.map((c: any) => (
                            <div
                                key={c.id}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-gold/10 transition-colors border-b border-border/50 last:border-0 ${value === c.id ? 'bg-gold/10' : ''}`}
                                onClick={() => { onChange(c.id); setOpen(false); setSearch(''); }}
                            >
                                <p className="text-sm font-medium text-text truncate">{c.tenant?.fullName} — <span className="text-muted">№{c.number}</span></p>
                                <p className="text-xs text-muted mt-0.5 truncate">{c.property?.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DashboardContent() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const month = parseInt(searchParams.get('month') || String(currentMonth), 10);
    const year = parseInt(searchParams.get('year') || String(currentYear), 10);

    const { user } = useAuthStore();
    const addToast = useToastStore((state) => state.addToast);
    const { data: dashboard, isLoading: isDashboardLoading } = useQuery({
        queryKey: ['dashboard', month, year],
        queryFn: () => fetchDashboardData(month, year),
    });

    const { data: recentPayments, isLoading: isPaymentsLoading } = useQuery({
        queryKey: ['recentPayments'],
        queryFn: fetchRecentPayments,
    });

    // Debugging payload
    useEffect(() => {
        if (dashboard) console.log('Dashboard data:', dashboard);
        if (recentPayments) console.log('Recent Payments data:', recentPayments);
    }, [dashboard, recentPayments]);

    // Generate Month Options
    const months = [
        'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
        'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];

    const monthOptions = months.map((m, i) => ({ label: m, value: i + 1 }));
    const yearOptions = Array.from({ length: 5 }, (_, i) => ({
        label: String(currentYear - i),
        value: currentYear - i
    }));

    const handlePeriodChange = (type: 'month' | 'year', value: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set(type, value);
        setSearchParams(newParams);
    };

    // Removed old incomeChange in favor of API calculated version at line 318
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportContracts, setReportContracts] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    // Quick Add Modal State
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addType, setAddType] = useState<'income' | 'expense'>('income');

    const [formContractId, setFormContractId] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formPaymentType, setFormPaymentType] = useState('CASH');
    const [formPeriodMonth, setFormPeriodMonth] = useState(String(currentMonth));
    const [formPeriodYear, setFormPeriodYear] = useState(String(currentYear));
    const [formNote, setFormNote] = useState('');

    const [formExpCategory, setFormExpCategory] = useState('Ümumi');
    const [formExpDesc, setFormExpDesc] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const { data: activeContractsData } = useQuery({
        queryKey: ['active-contracts-short'],
        queryFn: async () => {
            const res = await api.get('/contracts?limit=100');
            return res.data;
        }
    });
    // Ensure contracts passed to combobox only include active/expiring/expired, or just use what we get
    const addContracts = Array.isArray(activeContractsData?.data) ? activeContractsData.data : (activeContractsData?.data?.data || []);

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            if (addType === 'income') {
                if (!formContractId) {
                    addToast({ message: 'Müqavilə seçin', type: 'error' });
                    setIsAdding(false);
                    return;
                }
                await api.post('/payments', {
                    contractId: formContractId,
                    amount: Number(formAmount),
                    paymentDate: formDate,
                    paymentType: formPaymentType,
                    periodMonth: Number(formPeriodMonth),
                    periodYear: Number(formPeriodYear),
                    note: formNote || 'Dashboard sürətli əlavə'
                });
                addToast({ message: 'Mədaxil uğurla əlavə edildi', type: 'success' });
            } else {
                await api.post('/expenses', {
                    amount: Number(formAmount),
                    date: formDate,
                    category: formExpCategory,
                    description: formExpDesc || 'Dashboard sürətli əlavə'
                });
                addToast({ message: 'Məxaric uğurla əlavə edildi', type: 'success' });
            }
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['recentPayments'] });

            setIsAddModalOpen(false);
            setFormAmount('');
            setFormContractId('');
            setFormNote('');
            setFormExpDesc('');
        } catch (error: any) {
            addToast({ message: error.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsAdding(false);
        }
    };

    // Fetch contracts for multiselect
    const { data: contractsForReport } = useQuery({
        queryKey: ['contracts-for-report'],
        queryFn: async () => {
            const res = await api.get('/contracts?limit=100');
            return res.data;
        }
    });

    const activeContractsList = Array.isArray(contractsForReport?.data) ? contractsForReport.data : [];

    // Report contract combobox search
    const [contractSearch, setContractSearch] = useState('');
    const [reportSubject, setReportSubject] = useState<'contracts' | 'expenses'>('contracts');
    const [reportDirection, setReportDirection] = useState<'all' | 'income' | 'debt'>('all');
    const filteredContractsForReport = activeContractsList.filter((c: any) => {
        const q = contractSearch.toLowerCase();
        return (
            c.tenant?.fullName?.toLowerCase().includes(q) ||
            c.property?.name?.toLowerCase().includes(q) ||
            c.property?.address?.toLowerCase().includes(q) ||
            c.number?.toLowerCase().includes(q)
        );
    });

    // Properties query for map
    const { data: propertiesForMap } = useQuery({
        queryKey: ['properties-map'],
        queryFn: async () => {
            const res = await api.get('/properties?limit=100');
            return res.data.data || res.data;
        }
    });
    const { data: contractsForMap } = useQuery({
        queryKey: ['contracts-map'],
        queryFn: async () => {
            const res = await api.get('/contracts?status=ACTIVE&limit=100');
            return res.data.data || [];
        }
    });
    const mapProperties = Array.isArray(propertiesForMap) ? propertiesForMap : (propertiesForMap?.data || []);
    const mapContracts = Array.isArray(contractsForMap) ? contractsForMap : [];

    const getReportPayload = () => ({
        startDate: reportStartDate,
        endDate: reportEndDate,
        contractIds: reportContracts.length > 0 ? reportContracts : undefined,
        direction: reportDirection,
    });

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat', { ...getReportPayload(), format: 'excel' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'hesabat.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            alert("Hesabat generasiyası xətası.");
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const handlePrintPDF = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat', { ...getReportPayload(), format: 'pdf' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'hesabat.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("PDF generasiyası xətası.");
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const getExpenseReportPayload = () => ({
        startDate: reportStartDate,
        endDate: new Date(new Date(reportEndDate || '').setHours(23, 59, 59)).toISOString(),
    });

    const handleExportExpensesExcel = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/expenses', { ...getExpenseReportPayload(), format: 'excel' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'xercler_hesabati.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            alert("Hesabat generasiyası xətası.");
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const handlePrintExpensesPDF = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/expenses', { ...getExpenseReportPayload(), format: 'pdf' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'xercler_hesabati.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("PDF generasiyası xətası.");
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');

    const handleSendEmail = async () => {
        setIsExporting(true);
        try {
            if (reportSubject === 'contracts') {
                await api.post('/hesabat/send-email', { ...getReportPayload(), email: emailAddress });
            } else {
                await api.post('/hesabat/expenses/send-email', { ...getExpenseReportPayload(), email: emailAddress });
            }
            addToast({ message: 'Hesabat email-ə göndərildi ✓', type: 'success' });
            setIsEmailModalOpen(false);
            setIsReportModalOpen(false);
        } catch (error) {
            console.error('Email send failed', error);
            addToast({ message: 'Email göndərilmədi. Yenidən cəhd edin.', type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };
    const incomeChange = (dashboard?.monthlyIncome || 0) - (dashboard?.prevMonthIncome || 0);
    const incomeChangePct = dashboard?.prevMonthIncome ? Math.round((incomeChange / dashboard.prevMonthIncome) * 100) : 0;
    const sortedDebtors = [...(dashboard?.debtors || [])].sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));

    // Billing Banner Logic
    const [isBannerDismissed, setIsBannerDismissed] = useState(() => localStorage.getItem('billing_banner_dismissed') === 'true');
    const expiresAt = (user as any)?.organization?.planExpiresAt;
    const daysUntilExpiry = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;
    const showExpiryWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && !isBannerDismissed && (user as any)?.organization?.subscriptionStatus === 'ACTIVE';

    return (
        <div className="flex-1 space-y-6 p-6 pb-24 max-w-7xl mx-auto print-dashboard">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text">İdarə Paneli</h1>
                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto no-print">
                    <Select
                        className="flex-1 sm:w-[120px]"
                        value={month}
                        onChange={(e) => handlePeriodChange('month', e.target.value)}
                        options={monthOptions}
                    />
                    <Select
                        className="flex-1 sm:w-[100px]"
                        value={year}
                        onChange={(e) => handlePeriodChange('year', e.target.value)}
                        options={yearOptions}
                    />
                    <Button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 whitespace-nowrap bg-gold hover:bg-gold2 text-black">
                        📊 Hesabat
                    </Button>
                </div>
            </div>

            {/* Print Header Logo & Date Only Visible on Print */}
            <div className="hidden print-only-header text-center mb-10 w-full pb-4 border-b border-black">
                <h1 className="text-4xl font-extrabold text-[#C9A84C] mb-2">
                    İcarə <span className="font-light text-black">Pro</span>
                </h1>
                <h2 className="text-xl font-bold text-black border-b border-black pb-2 mb-2 w-full max-w-[200px] mx-auto border-transparent">Maliyyə Hesabatı</h2>
                <div className="flex justify-between w-full mt-8">
                    <div className="text-left font-bold text-black border border-black p-2 bg-gray-100">Ay: {months[month - 1]}</div>
                    <div className="text-right font-bold text-black border border-black p-2 bg-gray-100">İl: {year}</div>
                </div>
            </div>

            {/* Expiry Warning Banner */}
            {showExpiryWarning && (
                <div className="bg-yellow/10 border border-yellow/50 text-[#C9A84C] p-4 rounded-xl flex items-center justify-between no-print gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <p className="font-medium text-[15px]">
                            ⚠️ Abunəliyiniz {daysUntilExpiry === 0 ? 'bu gün' : `${daysUntilExpiry} gün sonra`} bitir.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            variant="primary"
                            className="bg-gold hover:bg-gold/90 text-background text-sm py-1.5 h-auto shadow-md shadow-gold/20"
                            onClick={() => navigate('/settings/billing')}
                        >
                            Planı yenilə →
                        </Button>
                        <button
                            className="p-1.5 hover:bg-yellow/20 rounded-full transition-colors flex-shrink-0"
                            onClick={() => {
                                localStorage.setItem('billing_banner_dismissed', 'true');
                                setIsBannerDismissed(true);
                            }}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Grace Period Banner */}
            {user?.organization?.subscriptionStatus === 'GRACE_PERIOD' && user?.organization?.gracePeriodStartedAt && (
                <div className="bg-orange/10 border border-orange/50 text-orange p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between no-print gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="font-bold">⚠️ Diqqət: Abunəlik müddətiniz bitib!</p>
                            <p className="text-sm bg-transparent">
                                Hesabınız möhlət dövründədir və tezliklə dayandırılacaq. Xidmətlərdən fasiləsiz istifadə üçün ödəniş edin.
                            </p>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/settings')} className="bg-orange hover:bg-orange/80 text-white whitespace-nowrap shrink-0">
                        Ödəniş et →
                    </Button>
                </div>
            )}

            {/* KPIs */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Cari Ay Balans */}
                <Card variant="elevated" className="relative overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', height: '140px' }}>
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.07 }}>
                        <Wallet style={{ width: '80px', height: '80px', color: '#a78bfa' }} />
                    </div>
                    <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Cari Ay Balans</CardTitle>
                        <Wallet className="w-5 h-5" style={{ color: '#a78bfa' }} />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold" style={{ color: '#a78bfa' }}>
                                <CountUpNumber value={dashboard?.balance || 0} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cari Ay Mədaxil */}
                <Card variant="elevated" className="relative overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', height: '140px' }}>
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.07 }}>
                        <TrendingUp style={{ width: '80px', height: '80px', color: '#34d399' }} />
                    </div>
                    <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Cari Ay Mədaxil</CardTitle>
                        <TrendingUp className="w-5 h-5" style={{ color: '#34d399' }} />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold" style={{ color: '#34d399' }}>{formatMoney(dashboard?.monthlyIncome || 0)}</span>
                                <div className="flex items-center gap-1 mt-1">
                                    {incomeChange >= 0 ? (
                                        <span className="text-xs font-semibold text-green/80 flex items-center">
                                            <ArrowUpRight className="w-3 h-3 mr-0.5" /> +{formatMoney(incomeChange)} (+{incomeChangePct}%)
                                        </span>
                                    ) : (
                                        <span className="text-xs font-semibold text-red/80 flex items-center">
                                            <ArrowDownRight className="w-3 h-3 mr-0.5" /> {formatMoney(incomeChange)} ({incomeChangePct}%)
                                        </span>
                                    )}
                                    <span className="text-xs text-muted ml-0.5">keçən aya nisbətən</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cəmi Borc */}
                <Card
                    variant="elevated"
                    className="relative overflow-hidden"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.12)', height: '140px' }}
                >
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.07 }}>
                        <AlertTriangle style={{ width: '80px', height: '80px', color: '#f87171' }} />
                    </div>
                    <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Cəmi Borc</CardTitle>
                        <AlertTriangle className="w-5 h-5" style={{ color: '#f87171' }} />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold" style={{ color: '#f87171' }}>{formatMoney(dashboard?.totalDebt || 0)}</div>
                        )}
                    </CardContent>
                </Card>

                {/* Bu Ay Üzrə Borc */}
                <Card variant="elevated" className="relative overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', height: '140px' }}>
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', opacity: 0.07 }}>
                        <CalendarX style={{ width: '80px', height: '80px', color: '#fb923c' }} />
                    </div>
                    <CardHeader className="pb-2 relative z-10 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Bu Ay Üzrə Borc</CardTitle>
                        <CalendarX className="w-5 h-5" style={{ color: '#fb923c' }} />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold" style={{ color: '#fb923c' }}>{formatMoney(dashboard?.currentMonthDebt || 0)}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Stage 3 Metrics: Forecasting & Occupancy */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 mt-4">
                <Card variant="elevated" style={{ height: '120px', border: '1px solid rgba(255, 255, 255, 0.12)' }} className="flex flex-col justify-center">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Doluluq Dərəcəsi</CardTitle>
                        <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)' }}>
                            <Building2 className="h-5 w-5" style={{ color: '#60a5fa' }} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold" style={{ color: '#60a5fa' }}>{dashboard?.occupancyRate || 0}%</span>
                            <span className="text-xs text-muted mt-1">Aktiv icarəyə verilmiş obyektlər</span>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="elevated" style={{ height: '120px', border: '1px solid rgba(255, 255, 255, 0.12)' }} className="flex flex-col justify-center">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Aylıq Gəlir Proqnozu</CardTitle>
                        <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(167, 139, 250, 0.1)' }}>
                            <LineChart className="h-5 w-5" style={{ color: '#a78bfa' }} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold" style={{ color: '#a78bfa' }}>{formatMoney(dashboard?.incomeForecast || 0)}</span>
                            <span className="text-xs text-muted mt-1">Aktiv müqavilələr əsasında</span>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="elevated" style={{ height: '120px', border: '1px solid rgba(255, 255, 255, 0.12)' }} className="flex flex-col justify-center">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">İllik Gəlir Proqnozu</CardTitle>
                        <div className="h-8 w-8 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(52, 211, 153, 0.1)' }}>
                            <TrendingUp className="h-5 w-5" style={{ color: '#34d399' }} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold" style={{ color: '#34d399' }}>{formatMoney((dashboard?.incomeForecast || 0) * 12)}</span>
                            <span className="text-xs text-muted mt-1">Aylıq proqnozun 12 aylıq ekvivalenti</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Map and Debtors Side by Side Layout */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mt-6">
                {/* Map Widget */}
                <Card variant="elevated" className="overflow-hidden lg:col-span-2 flex flex-col" style={{ height: 500 }}>
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                            📍 Obyektlər xəritədə
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                        <div className="flex flex-col lg:flex-row gap-4 p-4 h-full">
                            {/* Map */}
                            <div className="rounded-xl overflow-hidden shrink-0 h-[210px] lg:h-full lg:flex-[1.5]">
                                <SimpleMap
                                    compact
                                    hidePanel
                                    properties={mapProperties.map((p: any) => {
                                        const contract = mapContracts.find((c: any) => c.propertyId === p.id);
                                        let status: 'active' | 'expiring' | 'expired' = 'expired';
                                        if (contract) {
                                            const days = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
                                            status = days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'active';
                                        }
                                        return {
                                            id: p.id,
                                            name: p.name,
                                            address: p.address,
                                            tenantName: contract?.tenant
                                                ? contract.tenant.tenantType === 'fiziki'
                                                    ? `${contract.tenant.firstName || ''} ${contract.tenant.lastName || ''}`.trim()
                                                    : contract.tenant.companyName || ''
                                                : undefined,
                                            rent: contract ? Number(contract.monthlyRent) : undefined,
                                            status,
                                        };
                                    })}
                                    onPropertyClick={(id) => navigate(`/properties/${id}`)}
                                />
                            </div>
                            {/* Property list - scrollable */}
                            <div className="flex-1 overflow-y-auto flex flex-col gap-2 custom-scrollbar pr-1" style={{ minHeight: 0 }}>
                                {mapProperties.map((p: any) => {
                                    const contract = mapContracts.find((c: any) => c.propertyId === p.id);
                                    let status: 'active' | 'expiring' | 'expired' = 'expired';
                                    if (contract) {
                                        const days = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
                                        status = days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'active';
                                    }
                                    return (
                                        <div key={p.id} onClick={() => navigate(`/properties/${p.id}`)} className="p-3 bg-surface rounded-lg cursor-pointer hover:bg-surface/80 transition-colors border border-border/50 shrink-0">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-text text-sm">{p.name}</p>
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${status === 'active' ? 'bg-green' : status === 'expiring' ? 'bg-orange' : 'bg-red'}`} />
                                            </div>
                                            <p className="text-xs text-muted truncate">{p.address || 'Ünvan yoxdur'}</p>
                                            {contract && (
                                                <div className="flex justify-between items-center mt-1">
                                                    <p className="text-xs text-text/80 truncate flex-1 mr-2">
                                                        {contract.tenant?.tenantType === 'fiziki'
                                                            ? `${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}`.trim()
                                                            : contract.tenant?.companyName || ''}
                                                    </p>
                                                    <p className="text-xs font-bold text-gold shrink-0">{formatMoney(Number(contract.monthlyRent))}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Debtors List next to Map */}
                <Card variant="default" id="debtors-list" className="flex flex-col bg-card/50" style={{ height: 500 }}>
                    <CardHeader className="shrink-0">
                        <CardTitle className="flex items-center gap-2" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                            <AlertCircle className="w-5 h-5 text-red" />
                            Borclular
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar" style={{ minHeight: 0 }}>
                        {isDashboardLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-surface animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-24 bg-surface animate-pulse rounded" />
                                            <div className="h-3 w-16 bg-surface animate-pulse rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : dashboard?.debtors?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted py-8">
                                <Users className="w-12 h-12 mb-2 opacity-20" />
                                <p>Aktiv borclu yoxdur</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {dashboard?.debtors?.map((debtor: any, i: number) => {
                                    const isCritical = debtor.contract?.status === 'EXPIRED' || debtor.daysOverdue >= 30;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => navigate(`/contracts/${debtor.contractId}`)}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface/80 transition-colors border border-[rgba(255,255,255,0.08)] cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center shrink-0 group-hover:bg-red/20 transition-colors border border-[rgba(255,255,255,0.05)]">
                                                <TrendingUp className="w-5 h-5 text-red rotate-180" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-text truncate">{debtor.tenantName}</p>
                                                <p className="text-xs text-muted truncate">№{debtor.contractNumber}</p>
                                                {debtor.daysOverdue > 0 && (
                                                    <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap ${isCritical ? 'bg-red text-white' : 'bg-orange/20 text-orange'}`}>
                                                        {debtor.daysOverdue} gün gecikib
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-red">
                                                    {formatMoney(debtor.amount)}
                                                </p>
                                                <ArrowRight className="w-4 h-4 text-muted mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 mt-6 items-stretch">
                {/* Annual Occupancy Bar Chart (Mock) */}
                <Card variant="elevated" className="flex flex-col h-[450px]">
                    <CardHeader>
                        <CardTitle style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>İllik Doluluq Dərəcəsi (%)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1 w-full mt-4 chart-container min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { month: 'Yan', rate: 85 }, { month: 'Fev', rate: 88 }, { month: 'Mar', rate: 90 },
                                    { month: 'Apr', rate: 92 }, { month: 'May', rate: 95 }, { month: 'İyn', rate: 94 },
                                    { month: 'İyl', rate: 96 }, { month: 'Avq', rate: 98 }, { month: 'Sen', rate: 95 },
                                    { month: 'Okt', rate: 92 }, { month: 'Noy', rate: 89 }, { month: 'Dek', rate: 86 }
                                ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#192840" vertical={false} />
                                    <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip
                                        cursor={{ fill: '#0F1929' }}
                                        contentStyle={{ backgroundColor: '#141E30', borderColor: '#192840', borderRadius: '8px', color: '#E8F0FE' }}
                                        formatter={(value: any) => [`${value}%`, 'Doluluq']}
                                    />
                                    <Bar dataKey="rate" name="Doluluq" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={2} stroke="#334155" strokeWidth={1} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar Chart Header */}
                <Card variant="elevated" className="lg:col-span-2 flex flex-col h-[450px]">
                    <CardHeader>
                        <CardTitle style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Mədaxil və Məxaric (İllik)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        {isDashboardLoading ? (
                            <div className="flex-1 w-full bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="flex-1 w-full mt-4 chart-container min-h-[300px]">
                                <style dangerouslySetInnerHTML={{
                                    __html: `
                                    @media (max-width: 768px) {
                                        .recharts-legend-wrapper { display: none !important; }
                                    }
                                `}} />
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboard?.monthlyChart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#192840" vertical={false} />
                                        <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => months[val - 1]?.substring(0, 3) || ''} />
                                        <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val: any) => `${val} ₼`} />
                                        <Tooltip
                                            cursor={{ fill: '#0F1929' }}
                                            contentStyle={{ backgroundColor: '#141E30', borderColor: '#192840', borderRadius: '8px', color: '#E8F0FE' }}
                                            formatter={(value: any) => [formatMoney(value), '']}
                                            labelFormatter={(label: any) => months[label - 1] || ''}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="income" name="Mədaxil" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={2} stroke="#334155" strokeWidth={1} />
                                        <Bar dataKey="expenses" name="Məxaric" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={2} stroke="#334155" strokeWidth={1} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Payments */}
            <Card variant="elevated" className="mt-6 flex flex-col h-[450px]">
                <CardHeader className="flex flex-row items-center justify-between shrink-0">
                    <CardTitle style={{ fontSize: '18px', fontWeight: 600, marginBottom: '0' }}>Son Ödənişlər</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/income')} className="text-gold hover:text-gold2 group">
                        Hamısına bax <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto custom-scrollbar">
                    {isPaymentsLoading ? (
                        <TableSkeleton rows={4} columns={5} />
                    ) : recentPayments?.length === 0 ? (
                        <div className="text-center py-8 text-muted">Son ödəniş yoxdur.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarix</TableHead>
                                    <TableHead>İcarəçi</TableHead>
                                    <TableHead>Müqavilə</TableHead>
                                    <TableHead>Növü</TableHead>
                                    <TableHead className="text-right">Məbləğ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPayments?.map((payment: any) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString('az-AZ')}</TableCell>
                                        <TableCell className="font-medium text-text">{payment.contract.tenant.fullName}</TableCell>
                                        <TableCell className="text-muted">{payment.contract.number}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 flex items-center w-fit justify-center rounded text-xs tracking-wider font-medium ${payment.paymentType === 'CASH' ? 'bg-green/10 text-green border border-green/20' : 'bg-blue/10 text-blue border border-blue/20'}`}>
                                                {payment.paymentType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green">
                                            +{formatMoney(payment.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Maliyyə Hesabatı Yarat">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Maliyyə hesabatını generə etmək üçün tarix aralığı və müqavilələri seçin.</p>

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

                    <Select
                        label="Hesabatın Mövzusu"
                        value={reportSubject}
                        onChange={e => setReportSubject(e.target.value as any)}
                        options={[
                            { label: 'İcarə Müqavilələri (Mədaxil/Borc)', value: 'contracts' },
                            { label: 'Xərclər (Məxaric)', value: 'expenses' },
                        ]}
                    />

                    {reportSubject === 'contracts' && (
                        <Select
                            label="Hesabatın Növü"
                            value={reportDirection}
                            onChange={e => setReportDirection(e.target.value as any)}
                            options={[
                                { label: 'Hamısı (Mədaxil + Borc)', value: 'all' },
                                { label: 'Yalnız Mədaxil', value: 'income' },
                                { label: 'Yalnız Aktiv Borc', value: 'debt' },
                            ]}
                        />
                    )}

                    {reportSubject === 'contracts' && (
                        <div className="mt-4 border border-border rounded-lg p-2 max-h-52 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2 px-2 py-1 sticky top-0 bg-surface z-10">
                                <h4 className="text-sm font-medium">Müqavilələr</h4>
                                <div className="space-x-2 text-xs">
                                    <button type="button" className="text-gold" onClick={() => setReportContracts(activeContractsList.map((c: any) => c.id))}>Hamısını seç</button>
                                    <button type="button" className="text-muted" onClick={() => setReportContracts([])}>Sıfırla</button>
                                </div>
                            </div>
                            {/* Search inside contracts */}
                            <div className="relative mb-2">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                                <input
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-gold/50 text-text"
                                    placeholder="Adı, ünvan, nömrə..."
                                    value={contractSearch}
                                    onChange={e => setContractSearch(e.target.value)}
                                />
                            </div>
                            {filteredContractsForReport.length === 0 ? (
                                <p className="text-center text-xs text-muted py-4">Müqavilə tapılmadı</p>
                            ) : filteredContractsForReport.map((c: any) => (
                                <label key={c.id} className="flex items-start gap-2 px-2 py-1.5 hover:bg-surface rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 shrink-0"
                                        checked={reportContracts.includes(c.id)}
                                        onChange={(e: any) => {
                                            if (e.target.checked) setReportContracts([...reportContracts, c.id]);
                                            else setReportContracts(reportContracts.filter((id: string) => id !== c.id));
                                        }}
                                    />
                                    <span className="text-xs">
                                        <span className="font-medium text-text">{c.tenant?.fullName}</span>
                                        <span className="text-muted"> — №{c.number}</span>
                                        <br />
                                        <span className="text-muted">{c.property?.name} · </span>
                                        <span className="text-gold/80">{rentalTypeLabel[c.rentalType] || c.rentalType}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-4 border-t border-border mt-6">
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={reportSubject === 'contracts' ? handleExportExcel : handleExportExpensesExcel}
                                disabled={isExporting}
                            >
                                {isExporting ? 'Yüklənir...' : 'Excel Yüklə'}
                            </Button>
                            <Button
                                className="flex-1 bg-gold hover:bg-gold2 text-black"
                                onClick={reportSubject === 'contracts' ? handlePrintPDF : handlePrintExpensesPDF}
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

            {/* Quick Add Floating Button */}
            <Button
                className="fixed bottom-40 md:bottom-6 right-4 md:right-28 z-40 w-14 h-14 rounded-full shadow-2xl bg-gold hover:bg-gold-light border border-gold/50 flex items-center justify-center p-0 transition-transform hover:scale-105"
                onClick={() => setIsAddModalOpen(true)}
            >
                <Plus className="w-6 h-6 text-black" />
            </Button>

            {/* Quick Add Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Sürətli Əlavə">
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={addType === 'income' ? 'primary' : 'outline'}
                        className="flex-1"
                        onClick={() => setAddType('income')}
                    >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Mədaxil
                    </Button>
                    <Button
                        variant={addType === 'expense' ? 'danger' : 'outline'}
                        className="flex-1"
                        onClick={() => setAddType('expense')}
                    >
                        <TrendingUp className="w-4 h-4 mr-2 rotate-180" />
                        Məxaric
                    </Button>
                </div>

                <form onSubmit={handleQuickAdd} className="space-y-4">
                    {addType === 'income' ? (
                        <>
                            <ContractCombobox
                                contracts={addContracts}
                                value={formContractId}
                                onChange={setFormContractId}
                            />
                            <div className="grid grid-cols-2 gap-4">
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
                            <Select
                                label="Ödəniş Növü"
                                value={formPaymentType}
                                onChange={(e) => setFormPaymentType(e.target.value)}
                                options={[
                                    { label: 'Nağd', value: 'CASH' },
                                    { label: 'Bank', value: 'BANK' },
                                    { label: 'Kart', value: 'CARD' }
                                ]}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Dövr (Ay)"
                                    value={formPeriodMonth}
                                    onChange={e => setFormPeriodMonth(e.target.value)}
                                    options={months.map((m, i) => ({ label: m, value: String(i + 1) }))}
                                />
                                <Input
                                    label="Dövr (İl)"
                                    type="number"
                                    min="2000"
                                    required
                                    value={formPeriodYear}
                                    onChange={e => setFormPeriodYear(e.target.value)}
                                />
                            </div>
                            <Input
                                label="Qeyd (İxtiyari)"
                                value={formNote}
                                onChange={(e) => setFormNote(e.target.value)}
                            />
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
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
                            <Select
                                label="Kateqoriya"
                                value={formExpCategory}
                                onChange={(e) => setFormExpCategory(e.target.value)}
                                options={[
                                    { label: 'Təmir', value: 'Təmir' },
                                    { label: 'Kommunal', value: 'Kommunal' },
                                    { label: 'Vergi', value: 'Vergi' },
                                    { label: 'Maaş', value: 'Maaş' },
                                    { label: 'Reklam', value: 'Reklam' },
                                    { label: 'Sığorta', value: 'Sığorta' },
                                    { label: 'Ümumi', value: 'Ümumi' },
                                    { label: 'Digər', value: 'Digər' }
                                ]}
                            />
                            <Input
                                label="Açıqlama"
                                value={formExpDesc}
                                onChange={(e) => setFormExpDesc(e.target.value)}
                            />
                        </>
                    )}
                    <div className="pt-2">
                        <Button
                            type="submit"
                            className={`w-full text-white ${addType === 'income' ? 'bg-green hover:bg-green/90' : 'bg-red hover:bg-red/90'}`}
                            disabled={isAdding}
                        >
                            {isAdding ? 'Səbr edin...' : 'Yadda Saxla'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}

export function Dashboard() {
    return (
        <ErrorBoundary>
            <DashboardContent />
        </ErrorBoundary>
    );
}
