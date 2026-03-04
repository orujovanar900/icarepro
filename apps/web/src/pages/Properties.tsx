import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Building, Plus, MapPin, Maximize, ChevronLeft, ChevronRight, ArchiveRestore, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import SimpleMap from '@/components/SimpleMap';
import { useToastStore } from '@/store/toast';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Properties() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [showDeleted, setShowDeleted] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const limit = 20;

    // Add property form state
    const [form, setForm] = useState({ number: '', name: '', propertyType: 'MENZEL', address: '', area: '', status: 'VACANT' });
    const [isSaving, setIsSaving] = useState(false);

    // Extra filters
    const [typeFilter, setTypeFilter] = useState('');
    const [sortFilter, setSortFilter] = useState('');

    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [reportDirection, setReportDirection] = useState<'all' | 'income' | 'debt'>('all');
    const [isExporting, setIsExporting] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailAddress, setEmailAddress] = useState(user?.email || '');
    const addToast = useToastStore((state) => state.addToast);

    // Add QueryClient to invalidate queries after restore
    const queryClient = useQueryClient();

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: propertiesData, isLoading: propsLoading, isError: propsError, refetch } = useQuery({
        queryKey: ['properties', debouncedSearch, page, showDeleted, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String((page - 1) * limit)
            });
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (showDeleted) params.append('deleted', 'true');
            if (statusFilter) params.append('status', statusFilter);

            const res = await api.get(`/properties?${params.toString()}`);
            console.log('Properties API response:', res.data);
            return res.data;
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/properties/${id}/restore`),
        onSuccess: () => {
            addToast({ message: 'Obyekt bərpa edildi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onError: () => {
            addToast({ message: 'Bərpa zamanı xəta baş verdi', type: 'error' });
        }
    });

    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.number || !form.name || !form.address || !form.area) {
            addToast({ message: 'Bütün sahələri doldurun', type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            await api.post('/properties', { ...form, building: form.address, area: Number(form.area) });
            addToast({ message: 'Obyekt əlavə edildi ✓', type: 'success' });
            setIsModalOpen(false);
            setForm({ number: '', name: '', propertyType: 'MENZEL', address: '', area: '', status: 'VACANT' });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        } catch (error: any) {
            addToast({ message: error.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const { data: contractsData, isLoading: contractsLoading } = useQuery({
        queryKey: ['contracts-for-properties'],
        queryFn: async () => {
            // Fetch all active contracts to map debt and tenant names to properties
            const res = await api.get(`/contracts?status=ACTIVE&limit=100`);
            console.log('Contracts API response:', res.data);
            return res.data.data || res.data;
        },
    });

    const isLoading = propsLoading || contractsLoading;
    const isError = propsError;

    const properties = Array.isArray(propertiesData?.data) ? propertiesData.data : (propertiesData?.data?.data || []);
    const totalCount = propertiesData?.meta?.total || propertiesData?.data?.meta?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const activeContracts = Array.isArray(contractsData) ? contractsData : (contractsData?.data || []);

    const canAddProperty = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR'].includes(user?.role || '');

    const getReportPayload = () => ({
        startDate: new Date(reportStartDate || '').toISOString(),
        endDate: new Date(new Date(reportEndDate || '').setHours(23, 59, 59)).toISOString(),
        direction: reportDirection
    });

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/properties', { ...getReportPayload(), format: 'excel' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'obyektler_hesabati.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("Export failed", error);
            addToast({ message: "Hesabat generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const handlePrintPDF = async () => {
        setIsExporting(true);
        try {
            const res = await api.post('/hesabat/properties', { ...getReportPayload(), format: 'pdf' }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'obyektler_hesabati.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error("PDF generation failed", error);
            addToast({ message: "PDF generasiyası xətası.", type: 'error' });
        } finally {
            setIsExporting(false);
            setIsReportModalOpen(false);
        }
    };

    const handleSendEmail = async () => {
        setIsExporting(true);
        try {
            await api.post('/hesabat/properties/send-email', { ...getReportPayload(), email: emailAddress });
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
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Building className="w-8 h-8 text-gold" />
                    Obyektlər
                </h1>
                <div className="flex gap-2">
                    <Button onClick={() => setIsReportModalOpen(true)} className="bg-gold border-gold text-black hover:bg-gold2">
                        📊 Hesabat
                    </Button>
                    {canAddProperty && (
                        <Button onClick={() => setIsModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Obyekt
                        </Button>
                    )}
                </div>
            </div>

            {/* Add Property Modal */}
            <Modal isOpen={isModalOpen} onClose={() => !isSaving && setIsModalOpen(false)} title="Yeni Obyekt">
                <form onSubmit={handleAddProperty} className="space-y-4">
                    {/* Property type chips */}
                    <div>
                        <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">Növ</label>
                        <div className="flex gap-2 flex-wrap">
                            {[{ v: 'MENZEL', l: '🏠 Mənzil' }, { v: 'OFIS', l: '📋 Ofis' }, { v: 'OBYEKT', l: '🏪 Obyekt' }, { v: 'DIGER', l: '📌 Digər' }].map(t => (
                                <button
                                    key={t.v}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, propertyType: t.v }))}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${form.propertyType === t.v
                                        ? 'bg-gold text-black border-gold'
                                        : 'bg-surface text-muted border-border hover:border-gold'
                                        }`}
                                >{t.l}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Nömrə *"
                            value={form.number}
                            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                            placeholder="001"
                        />
                        <Input
                            label="Ad *"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Mənzil 3A"
                        />
                    </div>
                    <Input
                        label="Ünvan *"
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="Bakı, Nərimanov r., Neftçilər pr. 15"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Sahə (m²) *"
                            type="number"
                            min="1"
                            value={form.area}
                            onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                            placeholder="75"
                        />
                        <Select
                            label="Status"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            options={[
                                { label: 'Boş', value: 'VACANT' },
                                { label: 'Təmirdə', value: 'UNDER_REPAIR' },
                            ]}
                        />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Ləğv et</Button>
                        <Button type="submit" className="flex-1" disabled={isSaving}>
                            {isSaving ? 'Əlavə edilir...' : 'Əlavə et'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Map Section */}
            <div className="w-full mb-6 rounded-xl overflow-hidden border border-border shadow-sm">
                <SimpleMap
                    properties={properties.map((p: any) => {
                        const contract = activeContracts.find((c: any) => c.propertyId === p.id);
                        let status: 'active' | 'expiring' | 'expired' = 'expired';
                        if (contract) {
                            const days = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
                            status = days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'active';
                        }
                        return {
                            id: p.id,
                            name: p.name,
                            address: p.address,
                            tenantName: contract?.tenant?.fullName,
                            rent: contract ? Number(contract.monthlyRent) : undefined,
                            status,
                        };
                    })}
                    onPropertyClick={(id) => navigate(`/properties/${id}`)}
                />
            </div>

            {/* Filters */}
            <Card variant="elevated">
                <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Obyekt adı, nömrəsi və ya ünvanı..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                            <Select
                                className="w-36"
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                options={[
                                    { label: 'Status: Hamısı', value: '' },
                                    { label: 'Boş', value: 'VACANT' },
                                    { label: 'Tutulub', value: 'OCCUPIED' },
                                    { label: 'Təmirdə', value: 'UNDER_REPAIR' },
                                ]}
                            />
                            <Select
                                className="w-36"
                                value={typeFilter}
                                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                                options={[
                                    { label: 'Növ: Hamısı', value: '' },
                                    { label: 'Mənzil', value: 'MENZEL' },
                                    { label: 'Ofis', value: 'OFIS' },
                                    { label: 'Obyekt', value: 'OBYEKT' },
                                    { label: 'Digər', value: 'DIGER' },
                                ]}
                            />
                            <Select
                                className="w-44"
                                value={sortFilter}
                                onChange={e => setSortFilter(e.target.value)}
                                options={[
                                    { label: 'Sırala: Tarix', value: '' },
                                    { label: 'Qiymət: Yüksək → Aşağı', value: 'rent_desc' },
                                    { label: 'Qiymət: Aşağı → Yüksək', value: 'rent_asc' },
                                    { label: 'Sahə: Böyük → Kiçik', value: 'area_desc' },
                                    { label: 'Sahə: Kiçik → Böyük', value: 'area_asc' },
                                ]}
                            />
                            <Button
                                variant={showDeleted ? undefined : 'outline'}
                                onClick={() => { setShowDeleted(!showDeleted); setPage(1); }}
                                className={showDeleted ? 'bg-red/10 text-red border-red/20 hover:bg-red/20 whitespace-nowrap' : 'whitespace-nowrap'}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {showDeleted ? 'Aktivləri' : 'Silinmişlər'}
                            </Button>
                        </div>
                    </div>
                    {/* Active filter chips */}
                    {(statusFilter || typeFilter || sortFilter) && (
                        <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs text-muted">Aktiv filtrlər:</span>
                            {statusFilter && (
                                <button onClick={() => setStatusFilter('')} className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-gold/20">
                                    {statusFilter === 'VACANT' ? 'Boş' : statusFilter === 'OCCUPIED' ? 'Tutulub' : 'Təmirdə'} ×
                                </button>
                            )}
                            {typeFilter && (
                                <button onClick={() => setTypeFilter('')} className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-gold/20">
                                    {typeFilter === 'MENZEL' ? 'Mənzil' : typeFilter === 'OFIS' ? 'Ofis' : typeFilter === 'OBYEKT' ? 'Obyekt' : 'Digər'} ×
                                </button>
                            )}
                            {sortFilter && (
                                <button onClick={() => setSortFilter('')} className="flex items-center gap-1 bg-gold/10 text-gold border border-gold/30 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-gold/20">
                                    {sortFilter.replace('_', ' ')} ×
                                </button>
                            )}
                            <button onClick={() => { setStatusFilter(''); setTypeFilter(''); setSortFilter(''); }} className="text-xs text-muted hover:text-red ml-1">
                                Sıfırla
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 rounded-xl bg-surface animate-pulse" />
                    ))}
                </div>
            ) : isError ? (
                <div className="text-center py-12 text-red">
                    <p>Məlumatları yükləmək mümkün olmadı.</p>
                    <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                </div>
            ) : properties.length === 0 ? (
                <div className="text-center py-16 text-muted">
                    <Building className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Obyekt tapılmadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property: any) => {
                        // Find active contract for this property
                        const contract = activeContracts.find((c: any) => c.propertyId === property.id);

                        return (
                            <Card
                                key={property.id}
                                variant="elevated"
                                className="cursor-pointer hover:border-gold/50 transition-colors flex flex-col h-full"
                                onClick={() => navigate(`/properties/${property.id}`)}
                            >
                                <CardContent className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-text leading-tight group-hover:text-gold transition-colors">
                                                {property.name}
                                            </h3>
                                            <p className="text-sm text-muted mt-1">Nömrə: {property.number}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {showDeleted ? (
                                                <Badge variant="arxiv" className="bg-red/10 text-red border-red/20">Silinib</Badge>
                                            ) : (
                                                <>
                                                    <Badge variant={
                                                        property.status === 'OCCUPIED' ? 'draft' :
                                                            property.status === 'UNDER_REPAIR' ? 'arxiv' : 'aktiv'
                                                    }>
                                                        {property.status === 'OCCUPIED' ? 'Tutulub' :
                                                            property.status === 'UNDER_REPAIR' ? 'Təmirdə' : 'Boş'}
                                                    </Badge>
                                                    {contract && contract.debt > 0 && (
                                                        <Badge variant="borclu">Borc: {formatMoney(contract.debt)}</Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-auto">
                                        <div className="flex items-center text-sm text-text">
                                            <MapPin className="w-4 h-4 text-muted mr-2 shrink-0" />
                                            <span className="truncate">{property.address || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-text">
                                            <Maximize className="w-4 h-4 text-muted mr-2 shrink-0" />
                                            <span>{property.area} m²</span>
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-border flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-muted">İcarəçi</p>
                                                <p className="font-medium text-text truncate max-w-[150px]">
                                                    {contract ? contract.tenant.fullName : '-'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                {showDeleted ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-green/50 text-green hover:bg-green/10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            restoreMutation.mutate(property.id);
                                                        }}
                                                        disabled={restoreMutation.isPending}
                                                    >
                                                        <ArchiveRestore className="w-4 h-4 mr-2" />
                                                        Bərpa et
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <p className="text-xs text-muted">Aylıq İcarə</p>
                                                        <p className="font-bold text-gold">
                                                            {contract ? formatMoney(contract.monthlyRent) : '-'}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" /> Əvvəlki
                    </Button>
                    <span className="text-sm text-muted">Səhifə {page} / {totalPages}</span>
                    <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        Sonrakı <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            )}

            {/* Report Modal */}
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Obyektlər üzrə Hesabat Yarat">
                <div className="space-y-4">
                    <p className="text-sm text-muted">Obyektlərinizin seçilmiş dövr üzrə mədaxil və borc hesabatını generə edin.</p>
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
                        label="Hesabatın Növü"
                        value={reportDirection}
                        onChange={(e: any) => setReportDirection(e.target.value as any)}
                        options={[
                            { label: 'Hamısı (Mədaxil + Borc)', value: 'all' },
                            { label: 'Yalnız Mədaxil', value: 'income' },
                            { label: 'Yalnız Aktiv Borc', value: 'debt' },
                        ]}
                    />

                    <div className="flex flex-col gap-2 pt-4 border-t border-border mt-6">
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={handleExportExcel} disabled={isExporting}>
                                {isExporting ? 'Yüklənir...' : 'Excel Yüklə'}
                            </Button>
                            <Button className="flex-1 bg-gold hover:bg-gold2 text-black" onClick={handlePrintPDF} disabled={isExporting}>
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
        </div>
    );
}
