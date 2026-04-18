import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Upload } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { NisangahModal } from '@/components/portal/NisangahModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    orange: '#E8620A',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    danger: '#DC2626',
};

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';

const MONTHS = [
    { v: 1, label: 'Yanvar' }, { v: 2, label: 'Fevral' }, { v: 3, label: 'Mart' },
    { v: 4, label: 'Aprel' }, { v: 5, label: 'May' }, { v: 6, label: 'İyun' },
    { v: 7, label: 'İyul' }, { v: 8, label: 'Avqust' }, { v: 9, label: 'Sentyabr' },
    { v: 10, label: 'Oktyabr' }, { v: 11, label: 'Noyabr' }, { v: 12, label: 'Dekabr' },
];

const DURATION_OPTIONS = [30, 60, 90] as const;

type FormState = {
    displayName: string;
    age: string;
    gender: 'MALE' | 'FEMALE' | 'ANY' | '';
    photoUrl: string;
    districts: string[];
    budgetMin: string;
    budgetMax: string;
    startMonth: number;
    startYear: number;
    durationMonths: string;
    isLongTerm: boolean;
    adDurationDays: number;
    phone: string;
    whatsapp: string;
    telegram: string;
    occupation: 'STUDENT' | 'EMPLOYED' | 'ENTREPRENEUR' | 'OTHER' | '';
    smokes: boolean | null;
    hasPets: boolean | null;
    acceptsSmoker: boolean | null;
    acceptsPets: boolean | null;
    schedule: 'EARLY' | 'LATE' | 'ANY' | '';
    guests: 'OFTEN' | 'SOMETIMES' | 'NEVER' | '';
    description: string;
};

const INITIAL: FormState = {
    displayName: '',
    age: '',
    gender: '',
    photoUrl: '',
    districts: [],
    budgetMin: '',
    budgetMax: '',
    startMonth: new Date().getMonth() + 1,
    startYear: new Date().getFullYear(),
    durationMonths: '',
    isLongTerm: false,
    adDurationDays: 60,
    phone: '',
    whatsapp: '',
    telegram: '',
    occupation: '',
    smokes: null,
    hasPets: null,
    acceptsSmoker: null,
    acceptsPets: null,
    schedule: '',
    guests: '',
    description: '',
};

const DRAFT_KEY = 'yoldash_form_draft';

export interface YoldashFormProps {
    mode?: 'create' | 'edit';
    initial?: Partial<FormState>;
    editId?: string;
}

export function YoldashForm({ mode = 'create', initial, editId }: YoldashFormProps) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [step, setStep] = React.useState<1 | 2 | 3>(1);
    const [form, setForm] = React.useState<FormState>(() => {
        if (initial) return { ...INITIAL, ...initial };
        // Restore draft if any (create mode only)
        if (mode === 'create') {
            try {
                const raw = sessionStorage.getItem(DRAFT_KEY);
                if (raw) return { ...INITIAL, ...JSON.parse(raw) };
            } catch { /* ignore */ }
        }
        return INITIAL;
    });
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [districtsModalOpen, setDistrictsModalOpen] = React.useState(false);

    // Auth gate — redirect with returnUrl, save draft first
    React.useEffect(() => {
        if (!isAuthenticated && mode === 'create') {
            try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
            const returnUrl = '/yoldas/yeni';
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
        if (!isAuthenticated && mode === 'edit') {
            const returnUrl = window.location.pathname;
            navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, mode]);

    // Persist draft on every change (create only)
    React.useEffect(() => {
        if (mode !== 'create') return;
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
    }, [form, mode]);

    const update = <K extends keyof FormState>(key: K, val: FormState[K]) => {
        setForm(prev => ({ ...prev, [key]: val }));
    };

    const validateStep = (s: 1 | 2 | 3): string | null => {
        if (s === 1) {
            if (!form.displayName.trim()) return 'Adınızı daxil edin';
            if (form.displayName.length > 80) return 'Ad 80 simvoldan çox ola bilməz';
            const age = Number(form.age);
            if (!age || age < 16 || age > 80) return 'Yaş 16–80 aralığında olmalıdır';
            if (!form.gender) return 'Cinsinizi seçin';
        }
        if (s === 2) {
            if (form.districts.length === 0) return 'Ən azı bir rayon seçin';
            const bMin = Number(form.budgetMin);
            const bMax = Number(form.budgetMax);
            if (!bMin || bMin <= 0) return 'Minimum büdcə daxil edin';
            if (!bMax || bMax <= 0) return 'Maksimum büdcə daxil edin';
            if (bMax < bMin) return 'Maks büdcə minimumdan kiçik ola bilməz';
            if (!form.isLongTerm && !form.durationMonths) return 'Kirayə müddətini daxil edin və ya "1 ildən çox" seçin';
            if (!DURATION_OPTIONS.includes(form.adDurationDays as 30 | 60 | 90)) return 'Elanın aktivlik müddətini seçin';
        }
        if (s === 3) {
            if (!form.phone.trim()) return 'Telefon nömrəsi tələb olunur';
            if (form.phone.length < 5) return 'Telefon nömrəsi çox qısadır';
            if (form.description.length > 300) return 'Təsvir 300 simvoldan çox ola bilməz';
        }
        return null;
    };

    const next = () => {
        const err = validateStep(step);
        if (err) { setError(err); return; }
        setError(null);
        if (step < 3) setStep((step + 1) as 1 | 2 | 3);
    };

    const back = () => {
        setError(null);
        if (step > 1) setStep((step - 1) as 1 | 2 | 3);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setError('Şəkil ölçüsü 5MB-dan çox ola bilməz');
            return;
        }
        setError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/yoldash/upload-photo', formData);
            const url = res.data?.data?.url ?? '';
            update('photoUrl', url);
        } catch (err: any) {
            setError(err?.response?.data?.error ?? 'Şəkil yüklənə bilmədi');
        } finally {
            setUploading(false);
        }
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                displayName: form.displayName.trim(),
                age: Number(form.age),
                gender: form.gender,
                districts: form.districts,
                budgetMin: Number(form.budgetMin),
                budgetMax: Number(form.budgetMax),
                startMonth: form.startMonth,
                startYear: form.startYear,
                durationMonths: form.isLongTerm ? null : Number(form.durationMonths),
                isLongTerm: form.isLongTerm,
                adDurationDays: form.adDurationDays,
                phone: form.phone.trim(),
                whatsapp: form.whatsapp.trim() || null,
                telegram: form.telegram.trim() || null,
                photoUrl: form.photoUrl.trim() || null,
                occupation: form.occupation || null,
                smokes: form.smokes,
                hasPets: form.hasPets,
                acceptsSmoker: form.acceptsSmoker,
                acceptsPets: form.acceptsPets,
                schedule: form.schedule || null,
                guests: form.guests || null,
                description: form.description.trim() || null,
            };
            if (mode === 'edit' && editId) {
                const res = await api.patch(`/yoldash/${editId}`, payload);
                return res.data;
            }
            const res = await api.post('/yoldash', payload);
            return res.data;
        },
        onSuccess: () => {
            try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
            setSuccess(true);
        },
        onError: (e: any) => setError(e?.response?.data?.error ?? 'Xəta baş verdi'),
    });

    const submit = () => {
        const err = validateStep(3);
        if (err) { setError(err); return; }
        setError(null);
        mutation.mutate();
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
                <PortalNavbar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                    <div style={{ background: C.white, borderRadius: 24, padding: '48px 40px', maxWidth: 520, width: '100%', textAlign: 'center', border: `1px solid ${C.border}`, boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
                        <div style={{ width: 72, height: 72, margin: '0 auto 20px', borderRadius: '50%', background: GOLD_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check style={{ width: 36, height: 36, color: '#0A0B0F' }} />
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: '0 0 10px' }}>
                            {mode === 'edit' ? 'Dəyişiklik qəbul edildi' : 'Elanınız qəbul edildi'}
                        </h1>
                        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
                            {mode === 'edit'
                                ? 'Dəyişiklik etdiyiniz üçün elan yenidən moderator yoxlamasından keçəcək.'
                                : 'Elanınız moderator tərəfindən yoxlanılıb təsdiq olunduqdan sonra portalda görünəcək.'}
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => navigate('/kabinet?tab=yoldash')}
                                style={{ padding: '12px 24px', borderRadius: 12, background: GOLD_GRAD, color: '#0A0B0F', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}
                            >Kabinetimə keç</button>
                            <button
                                onClick={() => navigate('/yoldas')}
                                style={{ padding: '12px 24px', borderRadius: 12, background: 'transparent', color: C.navy, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14 }}
                            >Yoldaş elanlarına bax</button>
                        </div>
                    </div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <PortalNavbar />

            <main style={{ flex: 1, padding: '32px 20px 60px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: 0 }}>
                            🤝 {mode === 'edit' ? 'Yoldaş elanını dəyiş' : 'Yoldaş elanı ver'}
                        </h1>
                        <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>
                            {mode === 'edit'
                                ? 'Dəyişiklik etdikdən sonra elanınız yenidən moderasiyaya göndəriləcək.'
                                : 'Kirayə xərclərini bölüşmək üçün özünüzü təqdim edin. Elan moderator yoxlamasından keçəcək.'}
                        </p>
                    </div>

                    {/* Stepper */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        {[1, 2, 3].map(s => (
                            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? C.gold : 'rgba(0,0,0,0.1)' }} />
                        ))}
                    </div>

                    {/* Card */}
                    <div style={{ background: C.white, borderRadius: 20, padding: 28, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
                            Addım {step} / 3
                        </p>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: '0 0 20px' }}>
                            {step === 1 && 'Özünüz haqqında'}
                            {step === 2 && 'Axtardığınız yer və büdcə'}
                            {step === 3 && 'Əlaqə və seçimlər'}
                        </h2>

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <Field label="Görünən ad *">
                                    <input
                                        type="text"
                                        value={form.displayName}
                                        onChange={e => update('displayName', e.target.value)}
                                        placeholder="Məs. Aynur K."
                                        maxLength={80}
                                        style={inputStyle}
                                    />
                                </Field>
                                <Field label="Yaş *">
                                    <input
                                        type="number"
                                        min={16}
                                        max={80}
                                        value={form.age}
                                        onChange={e => update('age', e.target.value)}
                                        placeholder="25"
                                        style={inputStyle}
                                    />
                                </Field>
                                <Field label="Cins *">
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {[
                                            { v: 'FEMALE', label: 'Qadın' },
                                            { v: 'MALE', label: 'Kişi' },
                                            { v: 'ANY', label: 'Fərq etməz' },
                                        ].map(o => (
                                            <button
                                                key={o.v}
                                                type="button"
                                                onClick={() => update('gender', o.v as any)}
                                                style={{
                                                    padding: '10px 18px', borderRadius: 10,
                                                    border: `1px solid ${form.gender === o.v ? C.gold : C.border}`,
                                                    background: form.gender === o.v ? 'rgba(201,168,76,0.15)' : C.white,
                                                    color: C.navy, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                                                }}
                                            >{o.label}</button>
                                        ))}
                                    </div>
                                </Field>

                                {/* Photo upload */}
                                <Field label="Şəkil (seçimli)">
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        {form.photoUrl ? (
                                            <img
                                                src={form.photoUrl}
                                                alt=""
                                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 72, height: 72, borderRadius: '50%',
                                                background: C.bg, border: `1px dashed ${C.border}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: C.muted, fontSize: 24,
                                            }}>👤</div>
                                        )}
                                        <label style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '9px 16px', borderRadius: 10,
                                            background: C.bg, color: C.navy,
                                            border: `1px solid ${C.border}`,
                                            cursor: uploading ? 'wait' : 'pointer',
                                            fontSize: 13, fontWeight: 600,
                                            opacity: uploading ? 0.6 : 1,
                                        }}>
                                            <Upload style={{ width: 14, height: 14 }} />
                                            {uploading ? 'Yüklənir...' : (form.photoUrl ? 'Dəyiş' : 'Şəkil yüklə')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        {form.photoUrl && (
                                            <button
                                                type="button"
                                                onClick={() => update('photoUrl', '')}
                                                style={{ background: 'transparent', color: C.danger, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                            >Sil</button>
                                        )}
                                    </div>
                                </Field>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <Field label="Rayonlar *">
                                    <button
                                        type="button"
                                        onClick={() => setDistrictsModalOpen(true)}
                                        style={{
                                            ...inputStyle,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            minHeight: 44,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{ color: form.districts.length === 0 ? C.muted : C.navy }}>
                                            {form.districts.length === 0
                                                ? 'Rayon seçin...'
                                                : form.districts.join(', ')}
                                        </span>
                                        <span style={{ color: C.gold, fontSize: 18 }}>📍</span>
                                    </button>
                                </Field>

                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                    <Field label="Min büdcə (AZN) *">
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.budgetMin}
                                            onChange={e => update('budgetMin', e.target.value)}
                                            placeholder="300"
                                            style={inputStyle}
                                        />
                                    </Field>
                                    <Field label="Maks büdcə (AZN) *">
                                        <input
                                            type="number"
                                            min={0}
                                            value={form.budgetMax}
                                            onChange={e => update('budgetMax', e.target.value)}
                                            placeholder="600"
                                            style={inputStyle}
                                        />
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                    <Field label="Başlama ayı *">
                                        <select
                                            value={form.startMonth}
                                            onChange={e => update('startMonth', Number(e.target.value))}
                                            style={inputStyle}
                                        >
                                            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Başlama ili *">
                                        <select
                                            value={form.startYear}
                                            onChange={e => update('startYear', Number(e.target.value))}
                                            style={inputStyle}
                                        >
                                            {[2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </Field>
                                </div>

                                <Field label="Kirayə müddəti *">
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="number"
                                            min={1}
                                            max={24}
                                            value={form.durationMonths}
                                            onChange={e => update('durationMonths', e.target.value)}
                                            placeholder="Ay sayı (məs. 6)"
                                            disabled={form.isLongTerm}
                                            style={{ ...inputStyle, flex: 1, minWidth: 160, opacity: form.isLongTerm ? 0.5 : 1 }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: C.navy }}>
                                            <input
                                                type="checkbox"
                                                checked={form.isLongTerm}
                                                onChange={e => update('isLongTerm', e.target.checked)}
                                            />
                                            1 ildən çox
                                        </label>
                                    </div>
                                </Field>

                                {/* AD DURATION 30/60/90 */}
                                <Field label="Elanın aktivlik müddəti *">
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {DURATION_OPTIONS.map(d => {
                                            const sel = form.adDurationDays === d;
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => update('adDurationDays', d)}
                                                    style={{
                                                        flex: 1, minWidth: 80,
                                                        padding: '12px 16px', borderRadius: 10,
                                                        border: `1px solid ${sel ? C.gold : C.border}`,
                                                        background: sel ? 'rgba(201,168,76,0.15)' : C.white,
                                                        color: C.navy, fontWeight: 700, fontSize: 14,
                                                        cursor: 'pointer',
                                                    }}
                                                >{d} gün</button>
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: 11, color: C.muted, margin: '6px 0 0' }}>
                                        Bu müddət bitdikdən sonra elan avtomatik arxivlənəcək.
                                    </p>
                                </Field>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <Field label="Telefon nömrəsi *">
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => update('phone', e.target.value)}
                                        placeholder="+994 50 123 45 67"
                                        style={inputStyle}
                                    />
                                </Field>
                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                    <Field label="WhatsApp (seçimli)">
                                        <input
                                            type="text"
                                            value={form.whatsapp}
                                            onChange={e => update('whatsapp', e.target.value)}
                                            placeholder="+994 50..."
                                            style={inputStyle}
                                        />
                                    </Field>
                                    <Field label="Telegram (seçimli)">
                                        <input
                                            type="text"
                                            value={form.telegram}
                                            onChange={e => update('telegram', e.target.value)}
                                            placeholder="@username"
                                            style={inputStyle}
                                        />
                                    </Field>
                                </div>

                                <Field label="Məşğuliyyət (seçimli)">
                                    <select
                                        value={form.occupation}
                                        onChange={e => update('occupation', e.target.value as any)}
                                        style={inputStyle}
                                    >
                                        <option value="">Seçin...</option>
                                        <option value="STUDENT">Tələbə</option>
                                        <option value="EMPLOYED">İşçi</option>
                                        <option value="ENTREPRENEUR">Sahibkar</option>
                                        <option value="OTHER">Digər</option>
                                    </select>
                                </Field>

                                {/* About yourself */}
                                <div style={{ paddingTop: 6 }}>
                                    <p style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                                        Sizin haqqınızda
                                    </p>
                                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                        <Field label="Siz siqaret çəkirsiniz?">
                                            <YesNo
                                                value={form.smokes}
                                                onChange={v => update('smokes', v)}
                                                yesLabel="Çəkirəm"
                                                noLabel="Çəkmirəm"
                                            />
                                        </Field>
                                        <Field label="Ev heyvanınız var?">
                                            <YesNo
                                                value={form.hasPets}
                                                onChange={v => update('hasPets', v)}
                                                yesLabel="Var"
                                                noLabel="Yoxdur"
                                            />
                                        </Field>
                                    </div>
                                </div>

                                {/* About potential roommate */}
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                                        Yoldaşınızda nə qəbul edirsiniz?
                                    </p>
                                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                        <Field label="Siqaret çəkən yoldaş">
                                            <YesNo
                                                value={form.acceptsSmoker}
                                                onChange={v => update('acceptsSmoker', v)}
                                                yesLabel="Qəbul edirəm"
                                                noLabel="Etmirəm"
                                            />
                                        </Field>
                                        <Field label="Ev heyvanı olan yoldaş">
                                            <YesNo
                                                value={form.acceptsPets}
                                                onChange={v => update('acceptsPets', v)}
                                                yesLabel="Qəbul edirəm"
                                                noLabel="Etmirəm"
                                            />
                                        </Field>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                    <Field label="Gündəlik rejim (seçimli)">
                                        <select
                                            value={form.schedule}
                                            onChange={e => update('schedule', e.target.value as any)}
                                            style={inputStyle}
                                        >
                                            <option value="">Seçin...</option>
                                            <option value="EARLY">Tez yatan</option>
                                            <option value="LATE">Gec yatan</option>
                                            <option value="ANY">Fərq etməz</option>
                                        </select>
                                    </Field>
                                    <Field label="Qonaqlar (seçimli)">
                                        <select
                                            value={form.guests}
                                            onChange={e => update('guests', e.target.value as any)}
                                            style={inputStyle}
                                        >
                                            <option value="">Seçin...</option>
                                            <option value="OFTEN">Tez-tez</option>
                                            <option value="SOMETIMES">Bəzən</option>
                                            <option value="NEVER">Heç vaxt</option>
                                        </select>
                                    </Field>
                                </div>

                                <Field label={`Qısa təsvir (seçimli) — ${form.description.length}/300`}>
                                    <textarea
                                        value={form.description}
                                        onChange={e => update('description', e.target.value.slice(0, 300))}
                                        placeholder="Özünüz və axtardığınız yoldaş haqqında..."
                                        rows={4}
                                        style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                                    />
                                </Field>
                            </div>
                        )}

                        {error && (
                            <div style={{ marginTop: 18, padding: '10px 14px', background: '#FEE2E2', color: C.danger, borderRadius: 10, fontSize: 14, fontWeight: 500 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 12 }}>
                            {step > 1 ? (
                                <button
                                    type="button"
                                    onClick={back}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 20px', borderRadius: 11, background: 'transparent', color: C.navy, border: `1px solid ${C.border}`, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                                >
                                    <ArrowLeft style={{ width: 16, height: 16 }} /> Geri
                                </button>
                            ) : <div />}

                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={next}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 11, background: GOLD_GRAD, color: '#0A0B0F', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                                >
                                    Növbəti <ArrowRight style={{ width: 16, height: 16 }} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={mutation.isPending}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 24px', borderRadius: 11, background: GOLD_GRAD, color: '#0A0B0F', border: 'none', cursor: mutation.isPending ? 'wait' : 'pointer', fontWeight: 700, fontSize: 14, opacity: mutation.isPending ? 0.7 : 1 }}
                                >
                                    {mutation.isPending
                                        ? 'Göndərilir...'
                                        : (mode === 'edit' ? 'Dəyişiklikləri göndər' : 'Elanı dərc et')}
                                    {!mutation.isPending && <Check style={{ width: 16, height: 16 }} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Districts modal */}
            <NisangahModal
                isOpen={districtsModalOpen}
                onClose={() => setDistrictsModalOpen(false)}
                initialTab="rayon"
                selectedMetro={[]}
                onChangeMetro={() => { /* not used */ }}
                selectedLandmarks={[]}
                onChangeLandmarks={() => { /* not used */ }}
                selectedDistricts={form.districts}
                onChangeDistricts={v => update('districts', v)}
            />

            <PortalFooter />
        </div>
    );
}

// ─────────── Helpers ───────────

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    border: `1px solid ${C.border}`, borderRadius: 10,
    fontSize: 14, color: C.navy, background: C.white,
    outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function YesNo({
    value,
    onChange,
    yesLabel,
    noLabel,
}: {
    value: boolean | null;
    onChange: (v: boolean | null) => void;
    yesLabel: string;
    noLabel: string;
}) {
    const opts: { v: boolean | null; label: string }[] = [
        { v: null, label: '—' },
        { v: true, label: yesLabel },
        { v: false, label: noLabel },
    ];
    return (
        <div style={{ display: 'flex', gap: 6 }}>
            {opts.map((o, i) => {
                const sel = value === o.v;
                return (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onChange(o.v)}
                        style={{
                            flex: 1, padding: '8px 10px', borderRadius: 9,
                            border: `1px solid ${sel ? C.gold : C.border}`,
                            background: sel ? 'rgba(201,168,76,0.15)' : C.white,
                            color: C.navy, fontSize: 13, fontWeight: sel ? 600 : 500,
                            cursor: 'pointer',
                        }}
                    >{o.label}</button>
                );
            })}
        </div>
    );
}
