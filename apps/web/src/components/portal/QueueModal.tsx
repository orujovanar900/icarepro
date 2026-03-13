import * as React from 'react';
import { X } from 'lucide-react';
import type { JoinQueuePayload, JoinQueueResult } from '@/hooks/useListingDetail';
import type { UseMutationResult } from '@tanstack/react-query';

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    error: '#DC2626',
    success: '#16A34A',
};

interface FormErrors {
    fullName?: string;
    phone?: string;
    contactPerson?: string;
    companyName?: string;
}

interface Props {
    listingId: string;
    onClose: () => void;
    joinQueue: UseMutationResult<JoinQueueResult, unknown, JoinQueuePayload, unknown>;
}

type TenantType = 'FIZIKI' | 'KOMMERSIYA';
type Step = 'step1' | 'step2' | 'success';

const EMPLOY_OPTIONS = [
    { value: 'EMPLOYED', label: 'İşləyir' },
    { value: 'SELF_EMPLOYED', label: 'Özünüməşğul' },
    { value: 'STUDENT', label: 'Tələbə' },
    { value: 'RETIRED', label: 'Pensiyaçı' },
    { value: 'OTHER', label: 'Digər' },
];

const MONTH_OPTIONS = [
    { value: 3, label: '3 ay' },
    { value: 6, label: '6 ay' },
    { value: 12, label: '12 ay' },
    { value: 24, label: '24 ay' },
];

function StepDots({ step }: { step: Step }) {
    const steps: Step[] = ['step1', 'step2', 'success'];
    const idx = steps.indexOf(step);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {steps.map((s, i) => (
                <div
                    key={s}
                    style={{
                        width: i <= idx ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: i <= idx ? C.orange : 'rgba(0,0,0,0.12)',
                        transition: 'all 0.3s ease',
                    }}
                />
            ))}
        </div>
    );
}

export function QueueModal({ listingId: _listingId, onClose, joinQueue }: Props) {
    const [step, setStep] = React.useState<Step>('step1');
    const [tenantType, setTenantType] = React.useState<TenantType>('FIZIKI');
    const [errors, setErrors] = React.useState<FormErrors>({});
    const [submitError, setSubmitError] = React.useState('');
    const [result, setResult] = React.useState<JoinQueueResult | null>(null);

    // Step 1 fields
    const [fullName, setFullName] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [employStatus, setEmployStatus] = React.useState('EMPLOYED');
    const [companyName, setCompanyName] = React.useState('');
    const [voen, setVoen] = React.useState('');
    const [activityType, setActivityType] = React.useState('');
    const [contactPerson, setContactPerson] = React.useState('');

    // Step 2 fields
    const [persons, setPersons] = React.useState(1);
    const [hasPets, setHasPets] = React.useState(false);
    const [isSmoker, setIsSmoker] = React.useState(false);
    const [desiredMonths, setDesiredMonths] = React.useState(12);
    const [priceOffer, setPriceOffer] = React.useState('');
    const [priceError, setPriceError] = React.useState('');

    // ESC close
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Lock body scroll
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    function validateStep1(): boolean {
        const errs: FormErrors = {};
        if (tenantType === 'FIZIKI') {
            if (!fullName.trim()) errs.fullName = 'Ad soyad tələb olunur';
            if (!phone.trim()) errs.phone = 'Telefon tələb olunur';
            else if (!/^\+994\d{9}$/.test(phone.replace(/\s/g, ''))) errs.phone = 'Format: +994XXXXXXXXX';
        } else {
            if (!contactPerson.trim()) errs.contactPerson = 'Əlaqə şəxsi tələb olunur';
            if (!phone.trim()) errs.phone = 'Telefon tələb olunur';
            else if (!/^\+994\d{9}$/.test(phone.replace(/\s/g, ''))) errs.phone = 'Format: +994XXXXXXXXX';
            if (!companyName.trim()) errs.companyName = 'Şirkət adı tələb olunur';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleStep1Next() {
        if (validateStep1()) setStep('step2');
    }

    async function handleSubmit() {
        setPriceError('');
        setSubmitError('');

        const payload: JoinQueuePayload = {
            tenantType,
            fullName: tenantType === 'FIZIKI' ? fullName : contactPerson,
            phone,
            ...(email && { email }),
            ...(tenantType === 'FIZIKI' && { employStatus, persons, hasPets, isSmoker }),
            ...(tenantType === 'KOMMERSIYA' && {
                companyName,
                ...(voen && { voen }),
                ...(activityType && { activityType }),
                contactPerson,
            }),
            desiredMonths,
            ...(priceOffer && { priceOffer: Number(priceOffer) }),
        };

        try {
            const res = await joinQueue.mutateAsync(payload);
            setResult(res);
            setStep('success');
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Xəta baş verdi';
            if (msg.toLowerCase().includes('minimum') || msg.toLowerCase().includes('aşağı')) {
                setPriceError('Qiymət təklifi minimum qiymətdən aşağıdır');
            } else {
                setSubmitError(msg);
            }
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        fontSize: 14,
        color: C.navy,
        background: C.white,
        outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 600,
        color: C.muted,
        marginBottom: 4,
        display: 'block',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
    };

    const errorStyle: React.CSSProperties = {
        fontSize: 12,
        color: C.error,
        marginTop: 3,
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: C.white,
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 520,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>
                            {step === 'success' ? '🎉 Növbəyə yazıldınız!' : 'Növbəyə yazıl'}
                        </h2>
                        {step !== 'success' && (
                            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
                                {step === 'step1' ? 'Əlaqə məlumatları' : 'Üstünlüklər və qiymət'}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted, borderRadius: 8 }}
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                <div style={{ padding: '20px 24px 24px' }}>
                    <StepDots step={step} />

                    {/* ── STEP 1 ── */}
                    {step === 'step1' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Tenant type toggle */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['FIZIKI', 'KOMMERSIYA'] as TenantType[]).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => { setTenantType(t); setErrors({}); }}
                                        style={{
                                            flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                            background: tenantType === t ? C.navy : 'transparent',
                                            color: tenantType === t ? '#FFF' : C.muted,
                                            border: tenantType === t ? 'none' : `1px solid ${C.border}`,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {t === 'FIZIKI' ? '👤 Fiziki şəxs' : '🏢 Kommersiya'}
                                    </button>
                                ))}
                            </div>

                            {tenantType === 'FIZIKI' ? (
                                <>
                                    <div>
                                        <label style={labelStyle}>Ad soyad *</label>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.fullName ? C.error : C.border }}
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Məs: Əli Hüseynov"
                                        />
                                        {errors.fullName && <p style={errorStyle}>{errors.fullName}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Telefon *</label>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.phone ? C.error : C.border }}
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+994501234567"
                                        />
                                        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>E-poçt (ixtiyari)</label>
                                        <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>İş statusu</label>
                                        <select
                                            style={{ ...inputStyle, cursor: 'pointer' }}
                                            value={employStatus}
                                            onChange={e => setEmployStatus(e.target.value)}
                                        >
                                            {EMPLOY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label style={labelStyle}>Əlaqə şəxsi *</label>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.contactPerson ? C.error : C.border }}
                                            value={contactPerson}
                                            onChange={e => setContactPerson(e.target.value)}
                                            placeholder="Nümayəndənin adı"
                                        />
                                        {errors.contactPerson && <p style={errorStyle}>{errors.contactPerson}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Telefon *</label>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.phone ? C.error : C.border }}
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+994501234567"
                                        />
                                        {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>E-poçt (ixtiyari)</label>
                                        <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="office@company.az" type="email" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Şirkət adı *</label>
                                        <input
                                            style={{ ...inputStyle, borderColor: errors.companyName ? C.error : C.border }}
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            placeholder="Şirkət MMC"
                                        />
                                        {errors.companyName && <p style={errorStyle}>{errors.companyName}</p>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>VÖEN (ixtiyari)</label>
                                        <input style={inputStyle} value={voen} onChange={e => setVoen(e.target.value)} placeholder="1234567890" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Fəaliyyət növü (ixtiyari)</label>
                                        <input style={inputStyle} value={activityType} onChange={e => setActivityType(e.target.value)} placeholder="Məs: İT xidmətləri" />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleStep1Next}
                                style={{
                                    width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                    background: 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)',
                                    backgroundSize: '200% 200%', color: '#0A0B0F', border: 'none', cursor: 'pointer', marginTop: 4,
                                }}
                            >
                                Davam et →
                            </button>
                        </div>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 'step2' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Fiziki only: persons, pets, smoker */}
                            {tenantType === 'FIZIKI' && (
                                <>
                                    <div>
                                        <label style={labelStyle}>Şəxs sayı</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                                            <button
                                                onClick={() => setPersons(p => Math.max(1, p - 1))}
                                                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 18, cursor: 'pointer', color: C.navy }}
                                            >−</button>
                                            <span style={{ fontWeight: 700, fontSize: 18, color: C.navy, minWidth: 24, textAlign: 'center' }}>{persons}</span>
                                            <button
                                                onClick={() => setPersons(p => Math.min(10, p + 1))}
                                                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 18, cursor: 'pointer', color: C.navy }}
                                            >+</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => setHasPets(!hasPets)}
                                            style={{
                                                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                background: hasPets ? C.navy : 'transparent',
                                                color: hasPets ? '#FFF' : C.muted,
                                                border: hasPets ? 'none' : `1px solid ${C.border}`,
                                            }}
                                        >🐾 Ev heyvanı var</button>
                                        <button
                                            onClick={() => setIsSmoker(!isSmoker)}
                                            style={{
                                                flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                background: isSmoker ? C.navy : 'transparent',
                                                color: isSmoker ? '#FFF' : C.muted,
                                                border: isSmoker ? 'none' : `1px solid ${C.border}`,
                                            }}
                                        >🚬 Siqaret çəkirəm</button>
                                    </div>
                                </>
                            )}

                            {/* Desired months */}
                            <div>
                                <label style={labelStyle}>İstədiyin müddət</label>
                                <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                    {MONTH_OPTIONS.map(m => (
                                        <button
                                            key={m.value}
                                            onClick={() => setDesiredMonths(m.value)}
                                            style={{
                                                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                                background: desiredMonths === m.value ? C.navy : 'transparent',
                                                color: desiredMonths === m.value ? '#FFF' : C.muted,
                                                border: desiredMonths === m.value ? 'none' : `1px solid ${C.border}`,
                                            }}
                                        >{m.label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Price offer */}
                            <div>
                                <label style={labelStyle}>Qiymət təklifi (₼/ay, ixtiyari)</label>
                                <input
                                    type="number"
                                    min={0}
                                    style={{ ...inputStyle, borderColor: priceError ? C.error : C.border }}
                                    value={priceOffer}
                                    onChange={e => { setPriceOffer(e.target.value); setPriceError(''); }}
                                    placeholder="0"
                                />
                                {priceError && <p style={errorStyle}>{priceError}</p>}
                            </div>

                            {/* Info box */}
                            <div style={{
                                background: 'rgba(232,98,10,0.07)',
                                border: '1px solid rgba(232,98,10,0.2)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                fontSize: 13,
                                color: '#92400e',
                                lineHeight: 1.5,
                            }}>
                                ℹ️ Minimum qiymət haqqında məlumat növbəyə daxil olduqdan sonra göstəriləcək.
                            </div>

                            {submitError && (
                                <div style={{ background: 'rgba(220,38,38,0.08)', border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: C.error }}>
                                    ⚠️ {submitError}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={() => setStep('step1')}
                                    style={{
                                        flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer',
                                    }}
                                >← Geri</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={joinQueue.isPending}
                                    style={{
                                        flex: 2, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                        background: joinQueue.isPending ? '#D1D5DB' : 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)',
                                        backgroundSize: '200% 200%', color: '#0A0B0F', border: 'none',
                                        cursor: joinQueue.isPending ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {joinQueue.isPending ? 'Göndərilir...' : '✅ Növbəyə yazıl'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {step === 'success' && result && (
                        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                            <style>{`
                                @keyframes ringPulse {
                                    0% { transform: scale(1); }
                                    50% { transform: scale(1.08); }
                                    100% { transform: scale(1); }
                                }
                            `}</style>
                            <div style={{
                                width: 80, height: 80, borderRadius: '50%',
                                background: 'rgba(22,163,74,0.12)',
                                border: '3px solid #16A34A',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 20px',
                                animation: 'ringPulse 1.2s ease-in-out 3',
                                fontSize: 32,
                            }}>✓</div>

                            <div style={{
                                display: 'inline-block',
                                background: 'rgba(201,168,76,0.15)',
                                border: '1px solid rgba(201,168,76,0.4)',
                                borderRadius: 50,
                                padding: '8px 20px',
                                marginBottom: 16,
                            }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>{result.position}</span>
                                <span style={{ fontSize: 14, color: C.muted, marginLeft: 6 }}>nömrəli növbə</span>
                            </div>

                            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>
                                Növbəniz uğurla qeydə alındı.
                            </p>
                            {email && (
                                <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                                    📧 Təsdiq e-poçtunuza göndərildi.
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                                <button
                                    onClick={onClose}
                                    style={{
                                        flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer',
                                    }}
                                >Bağla</button>
                                <button
                                    onClick={() => { window.location.href = '/kabinet'; }}
                                    style={{
                                        flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                        background: C.navy, color: '#FFF', border: 'none', cursor: 'pointer',
                                    }}
                                >Kabinete keç →</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
