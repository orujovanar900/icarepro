import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
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

const DISTRICTS = [
    'Binəqədi', 'Nəsimi', 'Sabunçu', 'Suraxanı', 'Xətai',
    'Nizami', 'Yasamal', 'Nərimanov', 'Nişanqah', 'Pirəkəşkül',
    'Abşeron', 'Qaradağ', 'Sabail', 'Xəzər',
];

const MONTHS = [
    { v: 1, label: 'Yanvar' }, { v: 2, label: 'Fevral' }, { v: 3, label: 'Mart' },
    { v: 4, label: 'Aprel' }, { v: 5, label: 'May' }, { v: 6, label: 'İyun' },
    { v: 7, label: 'İyul' }, { v: 8, label: 'Avqust' }, { v: 9, label: 'Sentyabr' },
    { v: 10, label: 'Oktyabr' }, { v: 11, label: 'Noyabr' }, { v: 12, label: 'Dekabr' },
];

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
    phone: string;
    whatsapp: string;
    telegram: string;
    occupation: 'STUDENT' | 'EMPLOYED' | 'ENTREPRENEUR' | 'OTHER' | '';
    smokes: boolean | null;
    hasPets: boolean | null;
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
    phone: '',
    whatsapp: '',
    telegram: '',
    occupation: '',
    smokes: null,
    hasPets: null,
    schedule: '',
    guests: '',
    description: '',
};

export function YoldashForm() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [step, setStep] = React.useState<1 | 2 | 3>(1);
    const [form, setForm] = React.useState<FormState>(INITIAL);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);

    // Auth gate
    React.useEffect(() => {
        if (!isAuthenticated) {
            sessionStorage.setItem('portalIntent', '/yoldas/yeni');
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    const update = <K extends keyof FormState>(key: K, val: FormState[K]) => {
        setForm(prev => ({ ...prev, [key]: val }));
    };

    const toggleDistrict = (d: string) => {
        setForm(prev => ({
            ...prev,
            districts: prev.districts.includes(d)
                ? prev.districts.filter(x => x !== d)
                : [...prev.districts, d],
        }));
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
            if (!form.isLongTerm && !form.durationMonths) return 'Müddəti daxil edin və ya "1 ildən çox" seçin';
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
                phone: form.phone.trim(),
                whatsapp: form.whatsapp.trim() || null,
                telegram: form.telegram.trim() || null,
                photoUrl: form.photoUrl.trim() || null,
                occupation: form.occupation || null,
                smokes: form.smokes,
                hasPets: form.hasPets,
                schedule: form.schedule || null,
                guests: form.guests || null,
                description: form.description.trim() || null,
            };
            const res = await api.post('/yoldash', payload);
            return res.data;
        },
        onSuccess: () => setSuccess(true),
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
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, margin: '0 0 10px' }}>Elanınız qəbul edildi</h1>
                        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
                            Elanınız moderator tərəfindən yoxlanılıb təsdiq olunduqdan sonra portalda görünəcək.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => navigate('/yoldas')}
                                style={{ padding: '12px 24px', borderRadius: 12, background: GOLD_GRAD, color: '#0A0B0F', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}
                            >Yoldaş elanlarına bax</button>
                            <button
                                onClick={() => { setSuccess(false); setForm(INITIAL); setStep(1); }}
                                style={{ padding: '12px 24px', borderRadius: 12, background: 'transparent', color: C.navy, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14 }}
                            >Yeni elan yarat</button>
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
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: 0 }}>🤝 Yoldaş elanı ver</h1>
                        <p style={{ fontSize: 14, color: C.muted, margin: '6px 0 0' }}>
                            Kirayə xərclərini bölüşmək üçün özünüzü təqdim edin. Elan moderator yoxlamasından keçəcək.
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
                        {/* Step indicator */}
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
                                <Field label="Foto URL (seçimli)">
                                    <input
                                        type="url"
                                        value={form.photoUrl}
                                        onChange={e => update('photoUrl', e.target.value)}
                                        placeholder="https://..."
                                        style={inputStyle}
                                    />
                                </Field>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <Field label="Rayonlar * (bir və ya bir neçəsini seçin)">
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {DISTRICTS.map(d => {
                                            const sel = form.districts.includes(d);
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => toggleDistrict(d)}
                                                    style={{
                                                        padding: '7px 13px', borderRadius: 20,
                                                        border: `1px solid ${sel ? C.gold : C.border}`,
                                                        background: sel ? 'rgba(201,168,76,0.15)' : C.white,
                                                        color: C.navy, fontSize: 13, cursor: 'pointer', fontWeight: sel ? 600 : 500,
                                                    }}
                                                >{d}</button>
                                            );
                                        })}
                                    </div>
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

                                <Field label="Müddət">
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

                                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                                    <Field label="Siqaret">
                                        <TriToggle
                                            value={form.smokes}
                                            onChange={v => update('smokes', v)}
                                            yesLabel="Çəkir"
                                            noLabel="Çəkmir"
                                        />
                                    </Field>
                                    <Field label="Ev heyvanı">
                                        <TriToggle
                                            value={form.hasPets}
                                            onChange={v => update('hasPets', v)}
                                            yesLabel="Var"
                                            noLabel="Yox"
                                        />
                                    </Field>
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

                        {/* Error */}
                        {error && (
                            <div style={{ marginTop: 18, padding: '10px 14px', background: '#FEE2E2', color: C.danger, borderRadius: 10, fontSize: 14, fontWeight: 500 }}>
                                {error}
                            </div>
                        )}

                        {/* Actions */}
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
                                    {mutation.isPending ? 'Göndərilir...' : 'Elanı dərc et'}
                                    {!mutation.isPending && <Check style={{ width: 16, height: 16 }} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

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

function TriToggle({
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
