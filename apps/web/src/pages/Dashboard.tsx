import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Wallet, TrendingUp, AlertCircle, Calendar, ArrowRight, Users, Search } from 'lucide-react';
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
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import { useToastStore } from '@/store/toast';

L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

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

    // Calculate changes comparing to previous month
    let previousMonthIncome = 0;
    if (dashboard?.monthlyChart) {
        const prevMonthIndex = month - 2 >= 0 ? month - 2 : null;
        if (prevMonthIndex !== null && dashboard.monthlyChart[prevMonthIndex]) {
            previousMonthIncome = dashboard.monthlyChart[prevMonthIndex].income;
        }
    }

    const incomeChange = previousMonthIncome === 0 ? 100 : Math.round(((dashboard?.monthlyIncome || 0) - previousMonthIncome) / previousMonthIncome * 100);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportContracts, setReportContracts] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);

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

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');

    const handleSendEmail = async () => {
        setIsExporting(true);
        try {
            await api.post('/hesabat/send-email', { ...getReportPayload(), email: emailAddress });
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

            {/* KPIs */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Cari Ay Balans (gold) */}
                <Card variant="elevated" className="border-gold/20 relative overflow-hidden p-4 sm:p-0 rounded-2xl sm:rounded-lg">
                    <div className="absolute -top-4 -right-4 p-4 opacity-5">
                        <Wallet className="w-32 h-32 text-gold" />
                    </div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-sm font-medium text-muted">Cari Ay Balans</CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold text-gold">
                                <CountUpNumber value={dashboard?.balance || 0} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cari Ay Mədaxil (teal/green) */}
                <Card variant="elevated" className="p-4 sm:p-0 rounded-2xl sm:rounded-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Cari Ay Mədaxil</CardTitle>
                        <TrendingUp className="w-5 h-5 text-green" />
                    </CardHeader>
                    <CardContent>
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold text-green">{formatMoney(dashboard?.monthlyIncome || 0)}</span>
                                <span className={`text-xs mt-1 ${incomeChange >= 0 ? 'text-green' : 'text-red'}`}>
                                    {incomeChange > 0 ? '+' : ''}{incomeChange}% keçən ayla müqayisədə
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cəmi Borc (red) */}
                <Card
                    variant="elevated"
                    className="border-red/20 cursor-pointer hover:border-red/50 transition-colors p-4 sm:p-0 rounded-2xl sm:rounded-lg"
                    onClick={() => {
                        document.getElementById('debtors-list')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Cəmi Borc</CardTitle>
                        <AlertCircle className="w-5 h-5 text-red" />
                    </CardHeader>
                    <CardContent>
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold text-red">{formatMoney(dashboard?.totalDebt || 0)}</div>
                        )}
                    </CardContent>
                </Card>

                {/* Bu Ay Üzrə Borc (orange) */}
                <Card variant="elevated" className="border-orange/20 p-4 sm:p-0 rounded-2xl sm:rounded-lg">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted">Bu Ay Üzrə Borc</CardTitle>
                        <Calendar className="w-5 h-5 text-orange" />
                    </CardHeader>
                    <CardContent>
                        {isDashboardLoading ? (
                            <div className="h-8 w-24 bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="text-3xl font-bold text-orange">{formatMoney(dashboard?.currentMonthDebt || 0)}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Mini Map Widget */}
            <Card variant="elevated" className="overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        📍 Obyektlər Xəritəsi
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div style={{ height: 280, position: 'relative', zIndex: 0 }}>
                        <MapContainer center={[40.4093, 49.8671]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {mapProperties.map((property: any) => {
                                const lat = property.lat ? Number(property.lat) : 40.4093 + (Math.random() - 0.5) * 0.05;
                                const lng = property.lng ? Number(property.lng) : 49.8671 + (Math.random() - 0.5) * 0.05;
                                const contract = mapContracts.find((c: any) => c.propertyId === property.id);
                                return (
                                    <Marker key={`dash-map-${property.id}`} position={[lat, lng]}>
                                        <Popup>
                                            <div style={{ fontFamily: 'sans-serif', minWidth: 140 }}>
                                                <p style={{ fontWeight: 'bold', marginBottom: 2 }}>{property.name}</p>
                                                <p style={{ fontSize: 12, color: '#6b7280' }}>{property.address || ''}</p>
                                                {contract && (
                                                    <p style={{ fontSize: 12, marginTop: 4 }}>
                                                        <span style={{ fontWeight: 600 }}>İcarəçi:</span> {contract.tenant?.fullName}
                                                    </p>
                                                )}
                                                <button
                                                    style={{ marginTop: 6, fontSize: 12, color: '#1a56db', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    onClick={() => navigate(`/properties/${property.id}`)}
                                                >
                                                    Ətraflı →
                                                </button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Bar Chart Header */}
                <Card variant="elevated" className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Mədaxil və Məxaric (İllik)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isDashboardLoading ? (
                            <div className="h-[200px] sm:h-[300px] w-full bg-surface animate-pulse rounded" />
                        ) : (
                            <div className="h-[200px] sm:h-[300px] w-full mt-4 chart-container">
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
                                        <Bar dataKey="income" name="Mədaxil" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        <Bar dataKey="expenses" name="Məxaric" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Debtors List */}
                <Card variant="default" id="debtors-list" className="flex flex-col h-[400px] bg-card/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red" />
                            Borclular
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
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
                                {dashboard?.debtors?.slice(0, window.innerWidth < 768 ? 3 : undefined).map((debtor: any, idx: number) => {
                                    const initials = debtor.tenantName.substring(0, 2).toUpperCase();
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-surface rounded-lg transition-colors cursor-pointer group" onClick={() => navigate(`/contracts/${debtor.contractId}`)}>
                                            <div className="flex items-center gap-3 w-[70%]">
                                                <div className="w-10 h-10 shrink-0 rounded-full bg-red/10 text-red border border-red/20 flex items-center justify-center font-bold text-sm">
                                                    {initials}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-medium text-text group-hover:text-gold transition-colors truncate">{debtor.tenantName}</p>
                                                    <p className="text-xs text-muted truncate">Müqavilə: {debtor.contractNumber}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-red">{formatMoney(debtor.debtAmount)}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                                {dashboard?.debtors?.length > 3 && window.innerWidth < 768 && (
                                    <Button variant="ghost" size="sm" onClick={() => navigate('/contracts?tab=debtors')} className="w-full mt-2 text-gold hover:text-gold2 group">
                                        Hamısına bax <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Payments */}
            <Card variant="elevated">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Son Ödənişlər</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/income')} className="text-gold hover:text-gold2 group">
                        Hamısına bax <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                </CardHeader>
                <CardContent>
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
