import React, { useState, useReducer, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, Upload, Check, AlertCircle, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { calculateTaxRate, formatTaxRate } from '@/utils/taxUtils';

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

// ─── Property / Tenant option types ──────────────────────────────────────────

interface PropertyOption {
    id: string
    name: string
    address?: string
    status: string
    number?: string
}

interface TenantOption {
    id: string
    firstName?: string
    lastName?: string
    companyName?: string
    fin?: string
    voen?: string
    tenantType: string
    isActive?: boolean
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
    propertyId: string
    tenantId: string
    contractNumber: string
    rentalType: string
    startDate: string
    endDate: string
    monthlyRent: string
    depositAmount: string
    taxRate: string
    paymentTiming: 'PREPAID' | 'POSTPAID'
    fixedPaymentDay: boolean
    paymentDay: number
    firstPeriodAmount: string
    gracePeriodDays: number
    notes: string
    autoRenewal: boolean
    renewalNoticeDays: string
    renewalType: 'SAME_PERIOD' | 'MONTHLY'
}

type FormAction =
    | { type: 'SET_FIELD'; field: keyof FormState; value: unknown }
    | { type: 'RESET' }
    | { type: 'AUTOFILL'; payload: Partial<FormState> }

const initialFormState: FormState = {
    propertyId: '',
    tenantId: '',
    contractNumber: '',
    rentalType: 'RESIDENTIAL_LONG',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    depositAmount: '',
    taxRate: '',
    paymentTiming: 'PREPAID',
    fixedPaymentDay: false,
    paymentDay: 1,
    firstPeriodAmount: '',
    gracePeriodDays: 0,
    notes: '',
    autoRenewal: false,
    renewalNoticeDays: '',
    renewalType: 'SAME_PERIOD',
}

function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value }
        case 'RESET':
            return initialFormState
        case 'AUTOFILL':
            return { ...state, ...action.payload }
        default:
            return state
    }
}

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

    // ── Form state (useReducer) ───────────────────────────────────────────────
    const [form, dispatch] = useReducer(formReducer, {
        ...initialFormState,
        contractNumber: generateContractNumber(),
    });

    // ── UI / search state (separate useState) ─────────────────────────────────
    const [propertySearch, setPropertySearch] = useState('');
    const [tenantSearch, setTenantSearch] = useState('');
    const [originalEndDate, setOriginalEndDate] = useState('');
    const [originalMonthlyRent, setOriginalMonthlyRent] = useState('');
    const [contractStatus, setContractStatus] = useState<'ACTIVE' | 'DRAFT' | string>('DRAFT');
    const isActiveContract = isEdit && contractStatus === 'ACTIVE';

    const nm = nextMonthDefault();
    const [effectiveFromMonth, setEffectiveFromMonth] = useState(String(nm.month));
    const [effectiveFromYear, setEffectiveFromYear] = useState(String(nm.year));

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
    const { data: propertiesData = [] } = useQuery<PropertyOption[]>({
        queryKey: ['properties-for-contract-form'],
        queryFn: async () => {
            const res = await api.get('/properties?limit=300');
            const d = res.data?.data;
            return Array.isArray(d) ? d : (d?.data ?? []);
        },
    });

    const { data: tenantsData = [] } = useQuery<TenantOption[]>({
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

    // Fetch org tax profile to auto-populate tax rate on new contracts
    const { data: orgData } = useQuery({
        queryKey: ['org-settings-for-tax'],
        queryFn: async () => {
            const res = await api.get('/auth/me');
            return res.data?.data?.organization ?? null;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Derive activityLocation from selected property's type (per plan: property type drives residential/commercial)
    const RESIDENTIAL_PROPERTY_TYPES = new Set(['MENZIL', 'MENZEL', 'HEYET_EVI']);
    const propertyForTax = propertiesData.find(p => p.id === form.propertyId) as any;
    const activityLocationFromProperty: string | null =
        form.propertyId && propertyForTax
            ? RESIDENTIAL_PROPERTY_TYPES.has(propertyForTax.type) ? 'RESIDENTIAL' : 'COMMERCIAL'
            : null;

    // Override org activityLocation with property-derived value when a property is selected
    const orgForTax = orgData ? {
        ...orgData,
        activityLocation: activityLocationFromProperty ?? orgData.activityLocation,
    } : null;

    // Memoize suggestedTaxRate so the useEffect can depend on the resolved value
    const suggestedTaxRate = useMemo(
        () => orgForTax ? calculateTaxRate(orgForTax) : null,
        // Re-compute whenever property resolves (propertiesData), org loads, or property selection changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form.propertyId, orgData, propertiesData.length]
    );

    // Auto-populate tax rate from org profile + property type whenever suggestedTaxRate changes
    useEffect(() => {
        if (isEdit) return;
        if (suggestedTaxRate === null) return;
        dispatch({ type: 'SET_FIELD', field: 'taxRate', value: String(Math.round(suggestedTaxRate * 100)) });
    }, [suggestedTaxRate, isEdit]);

    // Pre-fill from existing contract
    useEffect(() => {
        if (!existingContract || !isEdit) return;
        const sd = existingContract.startDate?.split('T')[0] ?? '';
        const ed = existingContract.endDate?.split('T')[0] ?? '';
        const rent = String(existingContract.monthlyRent ?? '');
        setOriginalEndDate(ed);
        setOriginalMonthlyRent(rent);
        setContractStatus(existingContract.status ?? 'DRAFT');
        dispatch({
            type: 'AUTOFILL',
            payload: {
                propertyId: existingContract.propertyId ?? '',
                tenantId: existingContract.tenantId ?? '',
                contractNumber: existingContract.number ?? '',
                rentalType: existingContract.rentalType ?? 'RESIDENTIAL_LONG',
                startDate: sd,
                endDate: ed,
                monthlyRent: rent,
                depositAmount: String(existingContract.depositAmount ?? ''),
                taxRate: String(existingContract.taxRate ?? ''),
                paymentTiming: existingContract.paymentTiming ?? 'PREPAID',
                fixedPaymentDay: existingContract.fixedPaymentDay ?? false,
                paymentDay: existingContract.paymentDay ?? 1,
                gracePeriodDays: existingContract.gracePeriodDays ?? 0,
                notes: existingContract.notes ?? '',
                autoRenewal: existingContract.autoRenewal ?? false,
                renewalNoticeDays: String(existingContract.renewalNoticeDays ?? ''),
                renewalType: existingContract.renewalType ?? 'SAME_PERIOD',
            },
        });
    }, [existingContract, isEdit]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const filteredProperties = useMemo(() => {
        if (!propertySearch) return propertiesData;
        const s = propertySearch.toLowerCase();
        return propertiesData.filter(p =>
            p.name?.toLowerCase().includes(s) ||
            p.address?.toLowerCase().includes(s) ||
            p.number?.toLowerCase().includes(s)
        );
    }, [propertiesData, propertySearch]);

    const filteredTenants = useMemo(() => {
        if (!tenantSearch) return tenantsData;
        const s = tenantSearch.toLowerCase();
        return tenantsData.filter(t => {
            const name = t.tenantType === 'fiziki'
                ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.toLowerCase()
                : (t.companyName ?? '').toLowerCase();
            return name.includes(s) || (t.fin ?? '').includes(s) || (t.voen ?? '').includes(s);
        });
    }, [tenantsData, tenantSearch]);

    const selectedProperty = propertiesData.find(p => p.id === form.propertyId);
    const isPropertyOccupied = !isEdit && selectedProperty?.status === 'OCCUPIED';

    const priceChanged = isEdit && form.monthlyRent !== '' && form.monthlyRent !== originalMonthlyRent;
    const endDateShrunk = isEdit && form.endDate !== '' && originalEndDate !== '' && form.endDate < originalEndDate;

    const suggestedFirstPeriod = useMemo(() => {
        if (!form.startDate || !form.monthlyRent || form.fixedPaymentDay) return null;
        const start = new Date(form.startDate);
        const nextFirst = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        const remainingDays = Math.floor((nextFirst.getTime() - start.getTime()) / 86400000);
        if (remainingDays <= 0) return null;
        return Math.round((Number(form.monthlyRent) / daysInMonth) * remainingDays * 100) / 100;
    }, [form.startDate, form.monthlyRent, form.fixedPaymentDay]);

    // Auto-suggest first period (only set once)
    const firstPeriodSetRef = useRef(false);
    useEffect(() => {
        if (!isEdit && suggestedFirstPeriod !== null && !firstPeriodSetRef.current) {
            firstPeriodSetRef.current = true;
            dispatch({ type: 'SET_FIELD', field: 'firstPeriodAmount', value: String(suggestedFirstPeriod) });
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
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            addToast({ type: 'error', message: e.response?.data?.error ?? 'Sənəd oxunmadı' });
            setScanBanner('error');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const applyAIScanResult = async (scan: Record<string, unknown>) => {
        const payload: Partial<FormState> = {};
        const filledFields = new Set<string>(aiFilledFields);

        if (scan['contractNumber']) { payload.contractNumber = String(scan['contractNumber']); filledFields.add('contractNumber'); }
        if (scan['monthlyRent']) { payload.monthlyRent = String(Number(scan['monthlyRent'])); filledFields.add('monthlyRent'); }
        if (scan['startDate']) { payload.startDate = String(scan['startDate']); filledFields.add('startDate'); }
        if (scan['endDate']) { payload.endDate = String(scan['endDate']); filledFields.add('endDate'); }
        if (scan['depositAmount']) { payload.depositAmount = String(Number(scan['depositAmount'])); filledFields.add('depositAmount'); }

        // Tenant: find or auto-create
        const searchTerm = (scan['tenantName'] as string) || (scan['finOrVoen'] as string) || '';
        if (searchTerm) {
            try {
                const res = await api.get(`/tenants?search=${encodeURIComponent(searchTerm)}&limit=5`);
                const existing = res?.data?.data?.[0];
                if (existing) {
                    payload.tenantId = existing.id;
                    filledFields.add('tenantId');
                } else if (scan['tenantName']) {
                    const parts = (scan['tenantName'] as string).split(' ');
                    const finOrVoen: string = (scan['finOrVoen'] as string) ?? '';
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
                        payload.tenantId = created.id;
                        filledFields.add('tenantId');
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
            const match = propertiesData.find(p =>
                p.address?.toLowerCase().includes(s) || p.name?.toLowerCase().includes(s)
            );
            if (match) { payload.propertyId = match.id; filledFields.add('propertyId'); }
        }

        dispatch({ type: 'AUTOFILL', payload });
        setAiFilledFields(filledFields);
    };

    // ── Inline tenant save ────────────────────────────────────────────────────
    const handleSaveNewTenant = async () => {
        if (!newTenantFirstName.trim() || !newTenantPhone.trim()) {
            addToast({ type: 'error', message: 'Ad və telefon tələb olunur' });
            return;
        }
        setIsSavingTenant(true);
        try {
            const payload: Record<string, unknown> = {
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
                dispatch({ type: 'SET_FIELD', field: 'tenantId', value: created.id });
                addToast({ type: 'success', message: 'Yeni icarəçi yaradıldı' });
                queryClient.invalidateQueries({ queryKey: ['tenants-for-contract-form'] });
                setShowNewTenantForm(false);
                setNewTenantFirstName(''); setNewTenantLastName('');
                setNewTenantPhone(''); setNewTenantFinOrVoen('');
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            addToast({ type: 'error', message: e.response?.data?.error ?? 'İcarəçi yaradılmadı' });
        } finally {
            setIsSavingTenant(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const buildBasePayload = () => ({
        number: form.contractNumber,
        monthlyRent: Number(form.monthlyRent),
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        taxRate: form.taxRate ? Number(form.taxRate) : undefined,
        paymentTiming: form.paymentTiming,
        fixedPaymentDay: form.fixedPaymentDay,
        paymentDay: form.fixedPaymentDay ? Number(form.paymentDay) : undefined,
        gracePeriodDays: Number(form.gracePeriodDays || 0),
        notes: form.notes || undefined,
        autoRenewal: form.autoRenewal,
        renewalNoticeDays: form.autoRenewal && form.renewalNoticeDays ? Number(form.renewalNoticeDays) : undefined,
        renewalType: form.autoRenewal ? form.renewalType : undefined,
    });

    const validate = () => {
        if (!isEdit && !form.propertyId) { addToast({ type: 'error', message: 'Obyekt seçilməlidir' }); return false; }
        if (!isEdit && !form.tenantId) { addToast({ type: 'error', message: 'İcarəçi seçilməlidir' }); return false; }
        if (!form.contractNumber.trim()) { addToast({ type: 'error', message: 'Müqavilə nömrəsi tələb olunur' }); return false; }
        if (!isEdit && !form.startDate) { addToast({ type: 'error', message: 'Başlama tarixi tələb olunur' }); return false; }
        if (!form.endDate) { addToast({ type: 'error', message: 'Bitmə tarixi tələb olunur' }); return false; }
        if (!form.monthlyRent || Number(form.monthlyRent) <= 0) { addToast({ type: 'error', message: 'Aylıq icarə haqqı tələb olunur' }); return false; }
        if (form.endDate && form.startDate && new Date(form.endDate) <= new Date(form.startDate)) { addToast({ type: 'error', message: 'Bitmə tarixi başlama tarixindən sonra olmalıdır' }); return false; }
        return true;
    };

    const handleSubmitCreate = async (status: 'DRAFT' | 'ACTIVE') => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const res = await api.post('/contracts', {
                ...buildBasePayload(),
                propertyId: form.propertyId,
                tenantId: form.tenantId,
                rentalType: form.rentalType,
                startDate: form.startDate,
                endDate: form.endDate,
                status,
                firstPeriodAmount: form.firstPeriodAmount ? Number(form.firstPeriodAmount) : undefined,
            });
            const newId = res.data?.data?.id;
            addToast({ type: 'success', message: status === 'DRAFT' ? 'Müqavilə qaralama kimi saxlandı' : 'Müqavilə yaradıldı' });
            navigate(`/contracts/${newId}`);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            addToast({ type: 'error', message: e.response?.data?.error ?? 'Xəta baş verdi' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitEdit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const base = buildBasePayload();
            const { monthlyRent: _rent, ...baseWithoutRent } = base;
            const payload: Record<string, unknown> = {
                ...baseWithoutRent,
                endDate: form.endDate,
                ...(priceChanged
                    ? {
                        monthlyRent: Number(form.monthlyRent),
                        effectiveFrom: {
                            month: Number(effectiveFromMonth),
                            year: Number(effectiveFromYear),
                        },
                    }
                    : {}),
            };
            await api.patch(`/contracts/${id}`, payload);
            addToast({ type: 'success', message: 'Müqavilə yeniləndi' });
            queryClient.invalidateQueries({ queryKey: ['contract', id] });
            navigate(`/contracts/${id}`);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            addToast({ type: 'error', message: e.response?.data?.error ?? 'Xəta baş verdi' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Tenant display name ───────────────────────────────────────────────────
    const tenantDisplayName = useMemo(() => {
        const t = tenantsData.find(x => x.id === form.tenantId);
        if (!t) return form.tenantId;
        return t.tenantType === 'fiziki'
            ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim()
            : t.companyName ?? '';
    }, [tenantsData, form.tenantId]);

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
                                    {selectedProperty ? `${selectedProperty.name} — ${selectedProperty.address ?? ''}` : form.propertyId}
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
                                        value={form.propertyId}
                                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'propertyId', value: e.target.value })}
                                        options={[
                                            { label: 'Obyekt seçin...', value: '' },
                                            ...filteredProperties.map(p => ({
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
                                        value={form.tenantId}
                                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'tenantId', value: e.target.value })}
                                        options={[
                                            { label: 'İcarəçi seçin...', value: '' },
                                            ...filteredTenants.map(t => ({
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
                        <AIField filled={aiFilledFields.has('contractNumber')}>
                            <Input
                                label="Müqavilə nömrəsi *"
                                value={form.contractNumber}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'contractNumber', value: e.target.value })}
                            />
                        </AIField>

                        {/* Rental type */}
                        {isActiveContract ? (
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">İcarə növü</label>
                                <p className="py-2 px-3 bg-surface rounded-lg text-text border border-border text-sm">
                                    {RENTAL_TYPE_LABELS[form.rentalType] ?? form.rentalType}
                                </p>
                            </div>
                        ) : (
                            <Select
                                label="İcarə növü *"
                                value={form.rentalType}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'rentalType', value: e.target.value })}
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
                                    {form.startDate ? new Date(form.startDate).toLocaleDateString('az-AZ') : '—'}
                                </p>
                            </div>
                        ) : (
                            <AIField filled={aiFilledFields.has('startDate')}>
                                <Input
                                    label="Başlama tarixi *"
                                    type="date"
                                    value={form.startDate}
                                    onChange={e => dispatch({ type: 'SET_FIELD', field: 'startDate', value: e.target.value })}
                                />
                            </AIField>
                        )}

                        {/* End date */}
                        <AIField filled={aiFilledFields.has('endDate')}>
                            <Input
                                label="Bitmə tarixi *"
                                type="date"
                                value={form.endDate}
                                min={form.startDate || undefined}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'endDate', value: e.target.value })}
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
                                value={form.monthlyRent}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'monthlyRent', value: e.target.value })}
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
                                value={form.depositAmount}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'depositAmount', value: e.target.value })}
                            />
                        </AIField>

                        {/* Tax rate */}
                        <div>
                            <Input
                                label="Vergi dərəcəsi (%)"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={form.taxRate}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'taxRate', value: e.target.value })}
                            />
                            {!isEdit && (
                                <p className="text-xs mt-1 ml-0.5">
                                    {suggestedTaxRate !== null ? (
                                        <span className="text-green-400">
                                            ✓ Avtomatik dolduruldu: {formatTaxRate(suggestedTaxRate)}
                                            {activityLocationFromProperty && (
                                                <> ({activityLocationFromProperty === 'RESIDENTIAL' ? 'Yaşayış' : 'Kommersiya'} əmlakı)</>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="text-muted">
                                            {form.propertyId
                                                ? 'Vergi profilinizi Paramətrlərdə doldurun'
                                                : 'Vergi hesablanması üçün əvvəlcə obyekt seçin'}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── SECTION 4: Ödəniş parametrləri ─── */}
                <Card variant="elevated">
                    <CardHeader><CardTitle>Ödəniş parametrləri</CardTitle></CardHeader>
                    <CardContent className="space-y-5">

                        <PillToggle
                            label="Ödəniş vaxtı *"
                            value={form.paymentTiming}
                            onChange={v => dispatch({ type: 'SET_FIELD', field: 'paymentTiming', value: v })}
                            options={[
                                { label: 'Ayın əvvəlində', value: 'PREPAID' },
                                { label: 'Ayın sonunda', value: 'POSTPAID' },
                            ]}
                        />

                        <PillToggle
                            label="Ödəniş dövrü *"
                            value={form.fixedPaymentDay ? 'FIXED' : 'CALENDAR'}
                            onChange={v => dispatch({ type: 'SET_FIELD', field: 'fixedPaymentDay', value: v === 'FIXED' })}
                            options={[
                                { label: '1-ci günə sabitlənir', value: 'CALENDAR' },
                                { label: 'Sabit gün (13→13)', value: 'FIXED' },
                            ]}
                        />

                        {form.fixedPaymentDay && (
                            <Input
                                label="Ödəniş günü (1–31)"
                                type="number"
                                min="1"
                                max="31"
                                value={String(form.paymentDay)}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'paymentDay', value: Number(e.target.value) })}
                            />
                        )}

                        {/* First period amount (create only, when startDate filled) */}
                        {!isEdit && form.startDate && (
                            <div>
                                <Input
                                    label="İlk dövr məbləği (₼)"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.firstPeriodAmount}
                                    onChange={e => dispatch({ type: 'SET_FIELD', field: 'firstPeriodAmount', value: e.target.value })}
                                    helperText={
                                        form.fixedPaymentDay
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
                            value={String(form.gracePeriodDays)}
                            onChange={e => dispatch({ type: 'SET_FIELD', field: 'gracePeriodDays', value: Number(e.target.value) })}
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
                                value={form.notes}
                                onChange={e => dispatch({ type: 'SET_FIELD', field: 'notes', value: e.target.value })}
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
                                    onClick={() => dispatch({ type: 'SET_FIELD', field: 'autoRenewal', value: !form.autoRenewal })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.autoRenewal ? 'bg-gold' : 'bg-border'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${form.autoRenewal ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {form.autoRenewal && (
                                <div className="mt-4 p-4 bg-surface border border-border rounded-lg space-y-4">
                                    <Input
                                        label="Xəbərdarlıq müddəti (gün)"
                                        type="number"
                                        min="1"
                                        max="180"
                                        value={form.renewalNoticeDays}
                                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'renewalNoticeDays', value: e.target.value })}
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
                                                        checked={form.renewalType === val}
                                                        onChange={() => dispatch({ type: 'SET_FIELD', field: 'renewalType', value: val })}
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
