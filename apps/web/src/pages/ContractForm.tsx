import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Upload, Check, AlertCircle, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateContractNumber() {
    const year = new Date().getFullYear();
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    return `MÜQ-${year}-${digits}`;
}

function nextMonthDefault() {
    const d = new Date();
    const m = d.getMonth() + 2; // next month (1-based)
    return {
        month: m > 12 ? 1 : m,
        year: m > 12 ? d.getFullYear() + 1 : d.getFullYear(),
    };
}

const RENTAL_TYPE_LABELS: Record<string, string> = {
    RESIDENTIAL_LONG: 'Uzunmüddətli yaşayış',
    COMMERCIAL: 'Kommersiya',
    SUBLEASE: 'Subkirayə',
    RESIDENTIAL_SHORT: 'Qısamüddətli yaşayış',
    PARKING: 'Dayanacaq',
};

const MONTH_OPTIONS = [
    { label: 'Yanvar', value: '1' }, { label: 'Fevral', value: '2' },
    { label: 'Mart', value: '3' }, { label: 'Aprel', value: '4' },
    { label: 'May', value: '5' }, { label: 'İyun', value: '6' },
    { label: 'İyul', value: '7' }, { label: 'Avqust', value: '8' },
    { label: 'Sentyabr', value: '9' }, { label: 'Oktyabr', value: '10' },
    { label: 'Noyabr', value: '11' }, { label: 'Dekabr', value: '12' },
];

// ─── AI badge wrapper ─────────────────────────────────────────────────────────

function AIField({ filled, children }: { filled: boolean; children: React.ReactNode }) {
    return (
        <div className={filled ? 'relative border-l-[3px] border-blue-500 pl-3 rounded-r' : ''}>
            {children}
            {filled && (
                <span className="absolute top-0 right-0 text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-bl">
                    AI
                </span>
            )}
        </div>
    );
}

// ─── Pill toggle ──────────────────────────────────────────────────────────────

function PillToggle<T extends string>({
    value, onChange, options, label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { label: string; value: T }[];
    label?: string;
}) {
    return (
        <div>
            {label && <p className="text-sm font-medium text-text mb-2">{label}</p>}
            <div className="flex flex-wrap gap-2">
                {options.map(o => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${value === o.value ? 'bg-gold/10 border-gold text-gold' : 'border-border text-muted hover:bg-surface'}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractForm() {
    const { id } = useParams<{ id?: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const addToast = useToastStore(s => s.addToast);
    const queryClient = useQueryClient();

    // ── Section 2 state ───────────────────────────────────────────────────────
    const [propertyId, setPropertyId] = useState('');
    const [propertySearch, setPropertySearch] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [tenantSearch, setTenantSearch] = useState('');
    const [number, setNumber] = useState(() => generateContractNumber());
    const [rentalType, setRentalType] = useState('RESIDENTIAL_LONG');

    // ── Section 3 state ───────────────────────────────────────────────────────
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [originalEndDate, setOriginalEndDate] = useState('');
    const [monthlyRent, setMonthlyRent] = useState('');
    const [originalMonthlyRent, setOriginalMonthlyRent] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const nm = nextMonthDefault();
    const [effectiveFromMonth, setEffectiveFromMonth] = useState(String(nm.month));
    const [effectiveFromYear, setEffectiveFromYear] = useState(String(nm.year));

    // ── Section 4 state ───────────────────────────────────────────────────────
    const [paymentTiming, setPaymentTiming] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
    const [fixedPaymentDay, setFixedPaymentDay] = useState(false);
    const [paymentDay, setPaymentDay] = useState('1');
    const [firstPeriodAmount, setFirstPeriodAmount] = useState('');
    const [gracePeriodDays, setGracePeriodDays] = useState('0');

    // ── Section 5 state ───────────────────────────────────────────────────────
    const [notes, setNotes] = useState('');
    const [autoRenewal, setAutoRenewal] = useState(false);
    const [renewalNoticeDays, setRenewalNoticeDays] = useState('');
    const [renewalTypeValue, setRenewalTypeValue] = useState<'SAME_PERIOD' | 'MONTHLY'>('SAME_PERIOD');

    // ── Edit tracking ─────────────────────────────────────────────────────────
    const [contractStatus, setContractStatus] = useState<'ACTIVE' | 'DRAFT' | string>('DRAFT');
    const isActiveContract = isEdit && contractStatus === 'ACTIVE';

    // ── AI state ──────────────────────────────────────────────────────────────
    const [isScanning, setIsScanning] = useState(false);
    const [scanBanner, setScanBanner] = useState<'success' | 'error' | null>(null);
    const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Inline new tenant ─────────────────────────────────────────────────────
    const [showNewTenantForm, setShowNewTenantForm] = useState(false);
    const [newTenantType, setNewTenantType] = useState<'fiziki' | 'huquqi'>('fiziki');
    const [newTenantFirstName, setNewTenantFirstName] = useState('');
    const [newTenantLastName, setNewTenantLastName] = useState('');
    const [newTenantPhone, setNewTenantPhone] = useState('');
    const [newTenantIdType, setNewTenantIdType] = useState<'fin' | 'voen'>('fin');
    const [newTenantFinOrVoen, setNewTenantFinOrVoen] = useState('');
    const [isSavingTenant, setIsSavingTenant] = useState(false);

    // ── Submit state ──────────────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: propertiesData = [] } = useQuery<any[]>({
        queryKey: ['properties-for-contract-form'],
        queryFn: async () => {
            const res = await api.get('/properties?limit=300');
            const d = res.data?.data;
            return Array.isArray(d) ? d : (d?.data ?? []);
        },
    });

    const { data: tenantsData = [] } = useQuery<any[]>({
        queryKey: ['tenants-for-contract-form'],
        queryFn: async () => {
            const res = await api.get('/tenants?limit=300');
            const d = res.data?.data;
            return Array.isArray(d) ? d : (d?.data ?? []);
        },
    });

    const { data: existingContract, isLoading: isLoadingContract } = useQuery({
        queryKey: ['contract-for-edit', id],
        queryFn: async () => {
            const res = await api.get(`/contracts/${id}`);
            return res.data?.data;
        },
        enabled: isEdit && Boolean(id),
    });

    // Pre-fill from existing contract
    useEffect(() => {
        if (!existingContract || !isEdit) return;
        setPropertyId(existingContract.propertyId ?? '');
        setTenantId(existingContract.tenantId ?? '');
        setNumber(existingContract.number ?? '');
        setRentalType(existingContract.rentalType ?? 'RESIDENTIAL_LONG');
        const sd = existingContract.startDate?.split('T')[0] ?? '';
        const ed = existingContract.endDate?.split('T')[0] ?? '';
        setStartDate(sd);
        setEndDate(ed);
        setOriginalEndDate(ed);
        const rent = String(existingContract.monthlyRent ?? '');
        setMonthlyRent(rent);
        setOriginalMonthlyRent(rent);
        setDepositAmount(String(existingContract.depositAmount ?? ''));
        setTaxRate(String(existingContract.taxRate ?? ''));
        setPaymentTiming(existingContract.paymentTiming ?? 'PREPAID');
        setFixedPaymentDay(existingContract.fixedPaymentDay ?? false);
        setPaymentDay(String(existingContract.paymentDay ?? 1));
        setGracePeriodDays(String(existingContract.gracePeriodDays ?? 0));
        setNotes(existingContract.notes ?? '');
        setAutoRenewal(existingContract.autoRenewal ?? false);
        setRenewalNoticeDays(String(existingContract.renewalNoticeDays ?? ''));
        setRenewalTypeValue(existingContract.renewalType ?? 'SAME_PERIOD');
        setContractStatus(existingContract.status ?? 'DRAFT');
    }, [existingContract, isEdit]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const filteredProperties = useMemo(() => {
        if (!propertySearch) return propertiesData;
        const s = propertySearch.toLowerCase();
        return propertiesData.filter((p: any) =>
            p.name?.toLowerCase().includes(s) ||
            p.address?.toLowerCase().includes(s) ||
            p.number?.toLowerCase().includes(s)
        );
    }, [propertiesData, propertySearch]);

    const filteredTenants = useMemo(() => {
        if (!tenantSearch) return tenantsData;
        const s = tenantSearch.toLowerCase();
        return tenantsData.filter((t: any) => {
            const name = t.tenantType === 'fiziki'
                ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.toLowerCase()
                : (t.companyName ?? '').toLowerCase();
            return name.includes(s) || (t.fin ?? '').includes(s) || (t.voen ?? '').includes(s);
        });
    }, [tenantsData, tenantSearch]);

    const selectedProperty = propertiesData.find((p: any) => p.id === propertyId);
    const isPropertyOccupied = !isEdit && selectedProperty?.status === 'OCCUPIED';

    const priceChanged = isEdit && monthlyRent !== '' && monthlyRent !== originalMonthlyRent;
    const endDateShrunk = isEdit && endDate !== '' && originalEndDate !== '' && endDate < originalEndDate;

    const suggestedFirstPeriod = useMemo(() => {
        if (!startDate || !monthlyRent || fixedPaymentDay) return null;
        const start = new Date(startDate);
        const nextFirst = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const remainingDays = Math.floor((nextFirst.getTime() - start.getTime()) / 86400000);
        if (remainingDays <= 0) return null;
        return Math.round((Number(monthlyRent) / daysInMonth) * remainingDays * 100) / 100;
    }, [startDate, monthlyRent, fixedPaymentDay]);

    // Auto-suggest first period (only set once)
    const firstPeriodSetRef = useRef(false);
    useEffect(() => {
        if (!isEdit && suggestedFirstPeriod !== null && !firstPeriodSetRef.current) {
            firstPeriodSetRef.current = true;
            setFirstPeriodAmount(String(suggestedFirstPeriod));
        }
    }, [suggestedFirstPeriod, isEdit]);

    // ── AI scan ───────────────────────────────────────────────────────────────
    const handleDocumentScan = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            addToast({ type: 'error', message: 'Fayl maksimum 10MB ola bilər' });
            return;
        }

        const supportedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        const supportedExts = ['.pdf', '.docx', '.txt'];
        const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
        if (!supportedTypes.includes(file.type) && !supportedExts.includes(ext)) {
            addToast({ type: 'error', message: 'PDF, DOCX və ya TXT fayl seçin' });
            return;
        }

        setIsScanning(true);
        setScanBanner(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/contracts/scan-document', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const scan = response.data?.data;
            if (scan) {
                await applyAIScanResult(scan);
                setScanBanner('success');
            } else {
                setScanBanner('error');
            }
        } catch (err: any) {
            addToast({ type: 'error', message: err.response?.data?.error ?? 'Sənəd oxunmadı' });
            setScanBanner('error');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const applyAIScanResult = async (scan: Record<string, any>) => {
        const filled = new Set<string>(aiFilledFields);

        if (scan['contractNumber']) { setNumber(scan['contractNumber']); filled.add('number'); }
        if (scan['monthlyRent']) { setMonthlyRent(String(Number(scan['monthlyRent']))); filled.add('monthlyRent'); }
        if (scan['startDate']) { setStartDate(scan['startDate']); filled.add('startDate'); }
        if (scan['endDate']) { setEndDate(scan['endDate']); filled.add('endDate'); }
        if (scan['depositAmount']) { setDepositAmount(String(Number(scan['depositAmount']))); filled.add('depositAmount'); }

        // Tenant: find or auto-create
        const searchTerm = scan['tenantName'] || scan['finOrVoen'] || '';
        if (searchTerm) {
            try {
                const res = await api.get(`/tenants?search=${encodeURIComponent(searchTerm)}&limit=5`);
                const existing = res?.data?.data?.[0];
                if (existing) {
                    setTenantId(existing.id);
                    filled.add('tenantId');
                } else if (scan['tenantName']) {
                    const parts = scan['tenantName'].split(' ');
                    const finOrVoen: string = scan['finOrVoen'] ?? '';
                    const isHuquqi = finOrVoen.length === 10;
                    const tenantRes = await api.post('/tenants', {
                        tenantType: isHuquqi ? 'huquqi' : 'fiziki',
                        firstName: parts[0] ?? scan['tenantName'],
                        lastName: parts.slice(1).join(' ') || '',
                        ...(finOrVoen.length === 7 ? { fin: finOrVoen } : {}),
                        ...(finOrVoen.length === 10 ? { voen: finOrVoen } : {}),
                        phone: scan['phone'] ?? '',
                    });
                    const created = tenantRes?.data?.data;
                    if (created) {
                        setTenantId(created.id);
                        filled.add('tenantId');
                        addToast({ type: 'success', message: `Yeni icarəçi avtomatik yaradıldı: ${scan['tenantName']}` });
                        queryClient.invalidateQueries({ queryKey: ['tenants-for-contract-form'] });
                    }
                }
            } catch (err) {
                console.error('Tenant AI match error:', err);
            }
        }

        // Property: fuzzy match on address
        if (scan['propertyAddress'] && propertiesData.length > 0) {
            const s = (scan['propertyAddress'] as string).toLowerCase().slice(0, 20);
            const match = propertiesData.find((p: any) =>
                p.address?.toLowerCase().includes(s) || p.name?.toLowerCase().includes(s)
            );
            if (match) { setPropertyId(match.id); filled.add('propertyId'); }
        }

        setAiFilledFields(filled);
    };

    // ── Inline tenant save ────────────────────────────────────────────────────
    const handleSaveNewTenant = async () => {
        if (!newTenantFirstName.trim() || !newTenantPhone.trim()) {
            addToast({ type: 'error', message: 'Ad və telefon tələb olunur' });
            return;
        }
        setIsSavingTenant(true);
        try {
            const payload: Record<string, any> = {
                tenantType: newTenantType,
                firstName: newTenantFirstName,
                lastName: newTenantLastName,
                phone: newTenantPhone,
            };
            if (newTenantIdType === 'fin') payload['fin'] = newTenantFinOrVoen;
            else payload['voen'] = newTenantFinOrVoen;

            const res = await api.post('/tenants', payload);
            const created = res?.data?.data;
            if (created) {
                setTenantId(created.id);
                addToast({ type: 'success', message: 'Yeni icarəçi yaradıldı' });
                queryClient.invalidateQueries({ queryKey: ['tenants-for-contract-form'] });
                setShowNewTenantForm(false);
                setNewTenantFirstName(''); setNewTenantLastName('');
                setNewTenantPhone(''); setNewTenantFinOrVoen('');
            }
        } catch (err: any) {
            addToast({ type: 'error', message: err.response?.data?.error ?? 'İcarəçi yaradılmadı' });
        } finally {
            setIsSavingTenant(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const buildBasePayload = () => ({
        number,
        monthlyRent: Number(monthlyRent),
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
        taxRate: taxRate ? Number(taxRate) : undefined,
        paymentTiming,
        fixedPaymentDay,
        paymentDay: fixedPaymentDay ? Number(paymentDay) : undefined,
        gracePeriodDays: Number(gracePeriodDays || 0),
        notes: notes || undefined,
        autoRenewal,
        renewalNoticeDays: autoRenewal && renewalNoticeDays ? Number(renewalNoticeDays) : undefined,
        renewalType: autoRenewal ? renewalTypeValue : undefined,
    });

    const validate = () => {
        if (!isEdit && !propertyId) { addToast({ type: 'error', message: 'Obyekt seçilməlidir' }); return false; }
        if (!isEdit && !tenantId) { addToast({ type: 'error', message: 'İcarəçi seçilməlidir' }); return false; }
        if (!number.trim()) { addToast({ type: 'error', message: 'Müqavilə nömrəsi tələb olunur' }); return false; }
        if (!isEdit && !startDate) { addToast({ type: 'error', message: 'Başlama tarixi tələb olunur' }); return false; }
        if (!endDate) { addToast({ type: 'error', message: 'Bitmə tarixi tələb olunur' }); return false; }
        if (!monthlyRent || Number(monthlyRent) <= 0) { addToast({ type: 'error', message: 'Aylıq icarə haqqı tələb olunur' }); return false; }
        if (endDate && startDate && new Date(endDate) <= new Date(startDate)) { addToast({ type: 'error', message: 'Bitmə tarixi başlama tarixindən sonra olmalıdır' }); return false; }
        return true;
    };

    const handleSubmitCreate = async (status: 'DRAFT' | 'ACTIVE') => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const res = await api.post('/contracts', {
                ...buildBasePayload(),
                propertyId,
                tenantId,
                rentalType,
                startDate,
                endDate,
                status,
                firstPeriodAmount: firstPeriodAmount ? Number(firstPeriodAmount) : undefined,
            });
            const newId = res.data?.data?.id;
            addToast({ type: 'success', message: status === 'DRAFT' ? 'Müqavilə qaralama kimi saxlandı' : 'Müqavilə yaradıldı' });
            navigate(`/contracts/${newId}`);
        } catch (err: any) {
            addToast({ type: 'error', message: err.response?.data?.error ?? 'Xəta baş verdi' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitEdit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const base = buildBasePayload();
            const payload: Record<string, any> = { ...base, endDate };
            // Only send monthlyRent when changed to avoid spurious price-change audit logs
            if (!priceChanged) {
                delete payload['monthlyRent'];
            }
            if (priceChanged) {
                payload['effectiveFrom'] = {
                    month: Number(effectiveFromMonth),
                    year: Number(effectiveFromYear),
                };
            }
            await api.patch(`/contracts/${id}`, payload);
            addToast({ type: 'success', message: 'Müqavilə yeniləndi' });
            navigate(`/contracts/${id}`);
        } catch (err: any) {
            addToast({ type: 'error', message: err.response?.data?.error ?? 'Xəta baş verdi' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Tenant display name ───────────────────────────────────────────────────
    const tenantDisplayName = useMemo(() => {
        const t = tenantsData.find((x: any) => x.id === tenantId);
        if (!t) return tenantId;
        return t.tenantType === 'fiziki'
            ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim()
            : t.companyName ?? '';
    }, [tenantsData, tenantId]);

    // ── Render ────────────────────────────────────────────────────────────────
    if (isEdit && isLoadingContract) {
        return <div className="p-6 text-muted">Yüklənir...</div>;
    }

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 7 }, (_, i) => String(currentYear - 1 + i)).map(y => ({ label: y, value: y }));

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            {/* ── Header ── */}
            <div className="p-6 pb-0">
                <button
                    onClick={() => navigate('/contracts')}
                    className="flex items-center gap-2 text-muted hover:text-text mb-4 text-sm transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Müqavilələrə qayıt
                </button>
                <h1 className="text-2xl font-extrabold font-heading text-text mb-6">
                    {isEdit ? 'Müqaviləni redaktə et' : 'Yeni müqavilə'}
                </h1>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">

                {/* ─── SECTION 1: AI Autofill (create only) ─── */}
                {!isEdit && (
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-gold" />
                                Sənəd əsasında avtodoldur
                            </CardTitle>
                            <p className="text-sm text-muted mt-1">Müqavilə sənədini yükləyin — sistem avtomatik dolduracaq</p>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-gold/50 transition-colors"
                                onClick={() => !isScanning && fileInputRef.current?.click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                    e.preventDefault();
                                    const f = e.dataTransfer.files[0];
                                    if (f) handleDocumentScan(f);
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleDocumentScan(f); }}
                                />
                                {isScanning ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-muted">Sənəd oxunur...</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted">
                                        <Upload className="w-8 h-8" />
                                        <p className="font-medium">Buraya sürükləyin və ya klikləyin</p>
                                        <p className="text-xs">PDF, DOCX, TXT — max 10MB</p>
                                    </div>
                                )}
                            </div>
                            {scanBanner === 'success' && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2">
                                    <Check className="w-4 h-4 flex-shrink-0" />
                                    Sənəd uğurla oxundu. Məlumatları yoxlayın.
                                </div>
                            )}
                            {scanBanner === 'error' && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    Sənəd oxunmadı. Məlumatları əl ilə daxil edin.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ─── SECTION 2: Əsas məlumatlar ─── */}
                <Card variant="elevated">
                    <CardHeader><CardTitle>Əsas məlumatlar</CardTitle></CardHeader>
                    <CardContent className="space-y-4">

                        {/* Property */}
                        <AIField filled={aiFilledFields.has('propertyId')}>
                            <label className="block text-sm font-medium text-text mb-1">Obyekt *</label>
                            {isActiveContract ? (
                                <p className="py-2 px-3 bg-surface rounded-lg text-text border border-border text-sm">
                                    {selectedProperty ? `${selectedProperty.name} — ${selectedProperty.address ?? ''}` : propertyId}
                                </p>
                            ) : (
                                <>
                                    <Input
                                        placeholder="Axtar obyekt..."
                                        value={propertySearch}
                                        onChange={e => setPropertySearch(e.target.value)}
                                        className="mb-2"
                                    />
                                    <Select
                                        value={propertyId}
                                        onChange={e => setPropertyId(e.target.value)}
                                        options={[
                                            { label: 'Obyekt seçin...', value: '' },
                                            ...filteredProperties.map((p: any) => ({
                                                label: `${p.name}${p.address ? ` — ${p.address}` : ''}`,
                                                value: p.id,
                                            })),
                                        ]}
                                    />
                                </>
                            )}
                            {isPropertyOccupied && (
                                <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Bu obyekt üzrə artıq aktiv müqavilə mövcuddur
                                </p>
                            )}
                        </AIField>

                        {/* Tenant */}
                        <AIField filled={aiFilledFields.has('tenantId')}>
                            <label className="block text-sm font-medium text-text mb-1">İcarəçi *</label>
                            {isActiveContract ? (
                                <p className="py-2 px-3 bg-surface rounded-lg text-text border border-border text-sm">
                                    {tenantDisplayName}
                                </p>
                            ) : (
                                <>
                                    <Input
                                        placeholder="Axtar icarəçi..."
                                        value={tenantSearch}
                                        onChange={e => setTenantSearch(e.target.value)}
                                        className="mb-2"
                                    />
                                    <Select
                                        value={tenantId}
                                        onChange={e => setTenantId(e.target.value)}
                                        options={[
                                            { label: 'İcarəçi seçin...', value: '' },
                                            ...filteredTenants.map((t: any) => ({
                                                label: t.tenantType === 'fiziki'
                                                    ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() + (t.fin ? ` (${t.fin})` : '')
                                                    : (t.companyName ?? '') + (t.voen ? ` (${t.voen})` : ''),
                                                value: t.id,
                                            })),
                                        ]}
                                    />
                                    <button
                                        type="button"
                                        className="mt-2 flex items-center gap-1 text-sm text-gold hover:underline"
                                        onClick={() => setShowNewTenantForm(v => !v)}
                                    >
                                        <Plus className="w-3 h-3" />
                                        Yeni icarəçi əlavə et
                                    </button>
                                    {showNewTenantForm && (
                                        <div className="mt-3 p-4 bg-surface border border-border rounded-lg space-y-3">
                                            <p className="text-sm font-medium text-text">Yeni icarəçi</p>
                                            <div className="flex gap-2">
                                                {(['fiziki', 'huquqi'] as const).map(tt => (
                                                    <button
                                                        key={tt}
                                                        type="button"
                                                        onClick={() => setNewTenantType(tt)}
                                                        className={`px-3 py-1 rounded text-sm border transition-colors ${newTenantType === tt ? 'bg-gold/10 border-gold text-gold' : 'border-border text-muted'}`}
                                                    >
                                                        {tt === 'fiziki' ? 'Fiziki' : 'Hüquqi'}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Input label="Ad *" value={newTenantFirstName} onChange={e => setNewTenantFirstName(e.target.value)} />
                                                <Input label="Soyad" value={newTenantLastName} onChange={e => setNewTenantLastName(e.target.value)} />
                                            </div>
                                            <Input label="Telefon *" value={newTenantPhone} onChange={e => setNewTenantPhone(e.target.value)} />
                                            <div className="flex gap-2 items-end">
                                                <div className="flex gap-1">
                                                    {(['fin', 'voen'] as const).map(it => (
                                                        <button
                                                            key={it}
                                                            type="button"
                                                            onClick={() => setNewTenantIdType(it)}
                                                            className={`px-3 py-2 rounded text-sm border h-10 transition-colors ${newTenantIdType === it ? 'bg-gold/10 border-gold text-gold' : 'border-border text-muted'}`}
                                                        >
                                                            {it.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        placeholder={newTenantIdType === 'fin' ? 'FİN kodu' : 'VÖEN'}
                                                        value={newTenantFinOrVoen}
                                                        onChange={e => setNewTenantFinOrVoen(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button size="sm" variant="outline" onClick={() => setShowNewTenantForm(false)}>Ləğv et</Button>
                                                <Button size="sm" onClick={handleSaveNewTenant} disabled={isSavingTenant}>
                                                    {isSavingTenant ? 'Saxlanır...' : 'Saxla'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </AIField>

                        {/* Contract number */}
                        <AIField filled={aiFilledFields.has('number')}>
                            <Input
                                label="Müqavilə nömrəsi *"
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                            />
                        </AIField>

                        {/* Rental type */}
                        {isActiveContract ? (
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">İcarə növü</label>
                                <p className="py-2 px-3 bg-surface rounded-lg text-text border border-border text-sm">
                                    {RENTAL_TYPE_LABELS[rentalType] ?? rentalType}
                                </p>
                            </div>
                        ) : (
                            <Select
                                label="İcarə növü *"
                                value={rentalType}
                                onChange={e => setRentalType(e.target.value)}
                                options={Object.entries(RENTAL_TYPE_LABELS).map(([v, l]) => ({ label: l, value: v }))}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* ─── SECTION 3: Müddət və məbləğ ─── */}
                <Card variant="elevated">
                    <CardHeader><CardTitle>Müddət və məbləğ</CardTitle></CardHeader>
                    <CardContent className="space-y-4">

                        {/* Start date */}
                        {isActiveContract ? (
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Başlama tarixi</label>
                                <p className="py-2 px-3 bg-surface rounded-lg text-text border border-border text-sm">
                                    {startDate ? new Date(startDate).toLocaleDateString('az-AZ') : '—'}
                                </p>
                            </div>
                        ) : (
                            <AIField filled={aiFilledFields.has('startDate')}>
                                <Input
                                    label="Başlama tarixi *"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </AIField>
                        )}

                        {/* End date */}
                        <AIField filled={aiFilledFields.has('endDate')}>
                            <Input
                                label="Bitmə tarixi *"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={e => setEndDate(e.target.value)}
                            />
                            {endDateShrunk && (
                                <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Tarix azaldılır — bu tarixdən sonrakı UNPAID ödənişlər silinəcək
                                </p>
                            )}
                        </AIField>

                        {/* Monthly rent */}
                        <AIField filled={aiFilledFields.has('monthlyRent')}>
                            <Input
                                label="Aylıq icarə haqqı (₼) *"
                                type="number"
                                min="0"
                                step="0.01"
                                value={monthlyRent}
                                onChange={e => setMonthlyRent(e.target.value)}
                            />
                            {priceChanged && (
                                <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">
                                        Yeni qiymət hansı aydan keçərlidir?
                                    </p>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                value={effectiveFromMonth}
                                                onChange={e => setEffectiveFromMonth(e.target.value)}
                                                options={MONTH_OPTIONS}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Select
                                                value={effectiveFromYear}
                                                onChange={e => setEffectiveFromYear(e.target.value)}
                                                options={yearOptions}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </AIField>

                        {/* Deposit */}
                        <AIField filled={aiFilledFields.has('depositAmount')}>
                            <Input
                                label="Girov məbləği (₼)"
                                type="number"
                                min="0"
                                step="0.01"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                            />
                        </AIField>

                        {/* Tax rate */}
                        <Input
                            label="Vergi dərəcəsi (%)"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={taxRate}
                            onChange={e => setTaxRate(e.target.value)}
                        />
                    </CardContent>
                </Card>

                {/* ─── SECTION 4: Ödəniş parametrləri ─── */}
                <Card variant="elevated">
                    <CardHeader><CardTitle>Ödəniş parametrləri</CardTitle></CardHeader>
                    <CardContent className="space-y-5">

                        <PillToggle
                            label="Ödəniş vaxtı *"
                            value={paymentTiming}
                            onChange={setPaymentTiming}
                            options={[
                                { label: 'Ayın əvvəlində', value: 'PREPAID' },
                                { label: 'Ayın sonunda', value: 'POSTPAID' },
                            ]}
                        />

                        <PillToggle
                            label="Ödəniş dövrü *"
                            value={fixedPaymentDay ? 'FIXED' : 'CALENDAR'}
                            onChange={v => setFixedPaymentDay(v === 'FIXED')}
                            options={[
                                { label: '1-ci günə sabitlənir', value: 'CALENDAR' },
                                { label: 'Sabit gün (13→13)', value: 'FIXED' },
                            ]}
                        />

                        {fixedPaymentDay && (
                            <Input
                                label="Ödəniş günü (1–31)"
                                type="number"
                                min="1"
                                max="31"
                                value={paymentDay}
                                onChange={e => setPaymentDay(e.target.value)}
                            />
                        )}

                        {/* First period amount (create only, when startDate filled) */}
                        {!isEdit && startDate && (
                            <div>
                                <Input
                                    label="İlk dövr məbləği (₼)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={firstPeriodAmount}
                                    onChange={e => setFirstPeriodAmount(e.target.value)}
                                    helperText={
                                        fixedPaymentDay
                                            ? 'İlk dövr məbləği əl ilə daxil ediləcək'
                                            : suggestedFirstPeriod !== null
                                                ? `Təklif olunan: ₼${suggestedFirstPeriod}`
                                                : undefined
                                    }
                                />
                            </div>
                        )}

                        <Input
                            label="Gecikdirmə güzəşti (gün)"
                            type="number"
                            min="0"
                            max="30"
                            value={gracePeriodDays}
                            onChange={e => setGracePeriodDays(e.target.value)}
                            helperText="Ödəniş gecikdirməsi üçün güzəşt müddəti"
                        />
                    </CardContent>
                </Card>

                {/* ─── SECTION 5: Əlavə ─── */}
                <Card variant="elevated">
                    <CardHeader><CardTitle>Əlavə</CardTitle></CardHeader>
                    <CardContent className="space-y-5">

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-text mb-1">Qeydlər</label>
                            <textarea
                                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold resize-none transition-colors"
                                rows={3}
                                placeholder="Qeyd daxil edin..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Auto-renewal toggle */}
                        <div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-text">Avtomatik yeniləmə</p>
                                    <p className="text-xs text-muted mt-0.5">Müqavilə avtomatik yenilənsin</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setAutoRenewal(v => !v)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoRenewal ? 'bg-gold' : 'bg-border'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${autoRenewal ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {autoRenewal && (
                                <div className="mt-4 p-4 bg-surface border border-border rounded-lg space-y-4">
                                    <Input
                                        label="Xəbərdarlıq müddəti (gün)"
                                        type="number"
                                        min="1"
                                        max="180"
                                        value={renewalNoticeDays}
                                        onChange={e => setRenewalNoticeDays(e.target.value)}
                                        helperText="Müqavilə bitməzdən neçə gün əvvəl xəbərdarlıq göndərilsin?"
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-text mb-2">Yeniləmə şərti</label>
                                        <div className="space-y-2">
                                            {([
                                                ['SAME_PERIOD', 'Eyni müddətə uzadılsın'],
                                                ['MONTHLY', 'Aylıq davam etsin'],
                                            ] as const).map(([val, label]) => (
                                                <label key={val} className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={renewalTypeValue === val}
                                                        onChange={() => setRenewalTypeValue(val)}
                                                        className="accent-gold w-4 h-4"
                                                    />
                                                    <span className="text-sm text-text">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Sticky bottom bar ── */}
            <div className="fixed bottom-0 left-0 right-0 md:left-60 bg-background/95 backdrop-blur border-t border-border px-6 py-4 flex gap-3 justify-end z-20">
                <Button variant="outline" onClick={() => navigate('/contracts')} disabled={isSubmitting}>
                    Ləğv et
                </Button>
                {isEdit ? (
                    <Button onClick={handleSubmitEdit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saxlanır...' : 'Yadda saxla'}
                    </Button>
                ) : (
                    <>
                        <Button variant="outline" onClick={() => handleSubmitCreate('DRAFT')} disabled={isSubmitting}>
                            Qaralama saxla
                        </Button>
                        <Button onClick={() => handleSubmitCreate('ACTIVE')} disabled={isSubmitting}>
                            {isSubmitting ? 'Yaradılır...' : 'Müqavilə yarat'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
