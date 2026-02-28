import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Building2, Save, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// ─── Validation ────────────────────────────────────────────────────────────
const RULES = {
    fin: /^[A-Z0-9]{7}$/,
    passport: /^[A-Z]{2}\d{7}$/,
    voen: /^\d{10}$/,
    iban: /^AZ\d{2}[A-Z]{4}[A-Z0-9]{20}$/,
    phone: /^\+994\d{9}$/,
};

function validateField(name: string, value: string): string | null {
    if (!value) return null;
    if (name === 'fin' && !RULES.fin.test(value)) return 'FİN 7 simvol (hərflər və rəqəmlər) olmalıdır';
    if (name === 'passportSeries' && !RULES.passport.test(value)) return 'Format: AA1234567 (2 hərf + 7 rəqəm)';
    if (name === 'voen' && !RULES.voen.test(value)) return 'VÖEN tam olaraq 10 rəqəm olmalıdır';
    if (name === 'iban' && !RULES.iban.test(value)) return 'Format: AZ00XXXX00000000000000000000';
    if (name === 'phone' && !RULES.phone.test(value)) return 'Format: +994XXXXXXXXX';
    if (name === 'phone2' && value && !RULES.phone.test(value)) return 'Format: +994XXXXXXXXX';
    return null;
}

// ─── FormField helper ──────────────────────────────────────────────────────
function FormField({
    label, name, value, onChange, type = 'text', placeholder, error, required, optional,
}: {
    label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; placeholder?: string; error?: string | null; required?: boolean; optional?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-muted mb-1">
                {label}
                {required && <span className="text-red ml-1">*</span>}
                {optional && <span className="text-muted/60 text-xs ml-2">({optional})</span>}
            </label>
            <Input
                name={name}
                value={value}
                onChange={onChange}
                type={type}
                placeholder={placeholder}
                className={error ? 'border-red focus:ring-red' : ''}
            />
            {error && <p className="text-xs text-red mt-1">{error}</p>}
        </div>
    );
}

// ─── Default empty state ───────────────────────────────────────────────────
const FIZIKI_DEFAULTS = {
    tenantType: 'fiziki' as const, firstName: '', lastName: '', fatherName: '',
    fin: '', passportSeries: '', passportIssuedBy: '', passportIssuedAt: '', birthDate: '',
    phone: '', phone2: '', email: '', address: '', notes: '',
    isBlacklisted: false, blacklistReason: '',
};
const HUQUQI_DEFAULTS = {
    tenantType: 'huquqi' as const, companyName: '', voen: '', directorName: '',
    companyAddress: '', bankName: '', bankCode: '', iban: '',
    phone: '', phone2: '', email: '', address: '', notes: '',
    isBlacklisted: false, blacklistReason: '',
};

export function TenantForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const isEdit = Boolean(id);
    const isOwner = user?.role === 'OWNER';

    const [tenantType, setTenantType] = useState<'fiziki' | 'huquqi'>('fiziki');
    const [form, setForm] = useState<any>(FIZIKI_DEFAULTS);
    const [errors, setErrors] = useState<any>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Fetch existing tenant for edit mode
    const { data: existingData, isLoading: loadingExisting } = useQuery({
        queryKey: ['tenant', id],
        queryFn: async () => { const r = await api.get(`/tenants/${id}`); return r.data; },
        enabled: isEdit,
    });

    useEffect(() => {
        if (existingData?.success) {
            const t = existingData.data;
            setTenantType(t.tenantType || 'fiziki');
            setForm({
                ...t,
                passportIssuedAt: t.passportIssuedAt ? t.passoutIssuedAt?.slice(0, 10) : '',
                birthDate: t.birthDate ? t.birthDate?.slice(0, 10) : '',
            });
        }
    }, [existingData]);

    const handleTypeSwitch = (type: 'fiziki' | 'huquqi') => {
        setTenantType(type);
        setForm(type === 'fiziki' ? FIZIKI_DEFAULTS : HUQUQI_DEFAULTS);
        setErrors({});
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = (e.target as HTMLInputElement).checked;
        const val = type === 'checkbox' ? checked : value;
        setForm((prev: any) => ({ ...prev, [name]: val }));
        const err = type !== 'checkbox' ? validateField(name, value) : null;
        setErrors((prev: any) => ({ ...prev, [name]: err }));
    };

    const validate = () => {
        const newErrors: Record<string, string | null> = {};
        if (tenantType === 'fiziki') {
            if (!form['firstName']) newErrors['firstName'] = 'Ad daxil edilməlidir';
            if (!form['lastName']) newErrors['lastName'] = 'Soyad daxil edilməlidir';
        } else {
            if (!form['companyName']) newErrors['companyName'] = 'Şirkət adı daxil edilməlidir';
        }
        // Validate phone if filled
        if (form['phone']) newErrors['phone'] = validateField('phone', form['phone']);
        Object.entries(form).forEach(([k, v]) => {
            if (typeof v === 'string') {
                const err = validateField(k, v);
                if (err) newErrors[k] = err;
            }
        });
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };

    const saveMutation = useMutation({
        mutationFn: async (data: Record<string, any>) => {
            if (isEdit) {
                return api.patch(`/tenants/${id}`, data);
            }
            return api.post('/tenants', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            if (isEdit) queryClient.invalidateQueries({ queryKey: ['tenant', id] });
            navigate('/tenants');
        },
        onError: (err: any) => {
            setSubmitError(err?.response?.data?.error?.message || err?.response?.data?.error || 'Xəta baş verdi');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitError(null);
        const payload: Record<string, any> = { ...form, tenantType };
        // Clean up empty strings to undefined
        Object.keys(payload).forEach((k) => {
            if (payload[k] === '') payload[k] = undefined;
        });
        saveMutation.mutate(payload);
    };

    if (isEdit && loadingExisting) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6 max-w-3xl mx-auto pb-24">
            <Button variant="ghost" onClick={() => navigate('/tenants')} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Geri qayıt
            </Button>

            <h1 className="text-2xl font-extrabold font-heading text-text">
                {isEdit ? 'İcarəçini Düzəlt' : 'Yeni İcarəçi'}
            </h1>

            {/* Type Selector */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => handleTypeSwitch('fiziki')}
                    className={[
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-medium text-sm transition-all',
                        tenantType === 'fiziki'
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-border text-muted hover:border-muted',
                    ].join(' ')}
                >
                    <User className="w-4 h-4" />
                    Fiziki Şəxs
                </button>
                <button
                    type="button"
                    onClick={() => handleTypeSwitch('huquqi')}
                    className={[
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-medium text-sm transition-all',
                        tenantType === 'huquqi'
                            ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                            : 'border-border text-muted hover:border-muted',
                    ].join(' ')}
                >
                    <Building2 className="w-4 h-4" />
                    Hüquqi Şəxs
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Fiziki Şəxs Fields */}
                {tenantType === 'fiziki' && (
                    <>
                        <Card variant="default">
                            <CardHeader><CardTitle>Şəxsi Məlumatlar</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="Ad" name="firstName" value={form.firstName || ''} onChange={handleChange} error={errors.firstName} required />
                                <FormField label="Soyad" name="lastName" value={form.lastName || ''} onChange={handleChange} error={errors.lastName} required />
                                <FormField label="Ata adı" name="fatherName" value={form.fatherName || ''} onChange={handleChange} />
                                <FormField label="Doğum tarixi" name="birthDate" value={form.birthDate || ''} onChange={handleChange} type="date" />
                                <FormField label="FİN kod" name="fin" value={form.fin || ''} onChange={handleChange} error={errors.fin} placeholder="XXXXXXX" optional="7 simvol" />
                                <FormField label="Pasport seriyası" name="passportSeries" value={form.passportSeries || ''} onChange={handleChange} error={errors.passportSeries} placeholder="AA1234567" />
                                <FormField label="Pasportu verən orqan" name="passportIssuedBy" value={form.passportIssuedBy || ''} onChange={handleChange} />
                                <FormField label="Pasport tarixi" name="passportIssuedAt" value={form.passportIssuedAt || ''} onChange={handleChange} type="date" />
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Hüquqi Şəxs Fields */}
                {tenantType === 'huquqi' && (
                    <>
                        <Card variant="default">
                            <CardHeader><CardTitle>Şirkət Məlumatları</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <FormField label="Şirkət adı" name="companyName" value={form.companyName || ''} onChange={handleChange} error={errors.companyName} required />
                                </div>
                                <FormField label="VÖEN" name="voen" value={form.voen || ''} onChange={handleChange} error={errors.voen} placeholder="0000000000" optional="10 rəqəm" />
                                <FormField label="Direktor adı" name="directorName" value={form.directorName || ''} onChange={handleChange} />
                                <div className="sm:col-span-2">
                                    <FormField label="Şirkət ünvanı" name="companyAddress" value={form.companyAddress || ''} onChange={handleChange} />
                                </div>
                                <FormField label="Bank adı" name="bankName" value={form.bankName || ''} onChange={handleChange} />
                                <FormField label="Müxbir hesab" name="bankCode" value={form.bankCode || ''} onChange={handleChange} />
                                <div className="sm:col-span-2">
                                    <FormField label="IBAN" name="iban" value={form.iban || ''} onChange={handleChange} error={errors.iban} placeholder="AZ00XXXX00000000000000000000" />
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Common Fields */}
                <Card variant="default">
                    <CardHeader><CardTitle>Əlaqə Məlumatları</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField label="Telefon" name="phone" value={form.phone || ''} onChange={handleChange} error={errors.phone} placeholder="+994XXXXXXXXX" required />
                        <FormField label="Əlavə telefon" name="phone2" value={form.phone2 || ''} onChange={handleChange} error={errors.phone2} placeholder="+994XXXXXXXXX" />
                        <FormField label="Email" name="email" value={form.email || ''} onChange={handleChange} type="email" />
                        <div className="sm:col-span-2">
                            <FormField label="Ünvan" name="address" value={form.address || ''} onChange={handleChange} />
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card variant="default">
                    <CardContent className="pt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted mb-1">Qeyd</label>
                            <textarea
                                name="notes"
                                value={form.notes || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full rounded-lg border border-border bg-background text-text text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold/40 resize-none"
                                placeholder="Əlavə qeydlər..."
                            />
                        </div>

                        {/* Blacklist toggle — OWNER only */}
                        {isOwner && (
                            <div className="border-t border-border pt-4 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="isBlacklisted"
                                        checked={!!form.isBlacklisted}
                                        onChange={handleChange}
                                        className="w-4 h-4 accent-red"
                                    />
                                    <span className="text-sm font-medium text-red">Qara siyahıya salınıb</span>
                                </label>
                                {form.isBlacklisted && (
                                    <div>
                                        <label className="block text-sm font-medium text-muted mb-1">Səbəb</label>
                                        <Input
                                            name="blacklistReason"
                                            value={form.blacklistReason || ''}
                                            onChange={handleChange}
                                            placeholder="Qara siyahı səbəbini daxil edin..."
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {submitError && (
                    <div className="p-3 bg-red/10 border border-red/20 rounded-lg text-sm text-red">
                        {submitError}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={saveMutation.isPending} className="flex-1 sm:flex-none">
                        {saveMutation.isPending ? (
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isEdit ? 'Yadda saxla' : 'Yarat'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate('/tenants')}>
                        Ləğv et
                    </Button>
                </div>
            </form>
        </div>
    );
}
