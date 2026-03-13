import * as React from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    error: '#DC2626',
    success: '#16A34A',
};

const REASONS = [
    { value: 'YANLIS_MELUMAT', label: '📋 Yanlış məlumat' },
    { value: 'SAXTA_ELAN', label: '🚫 Saxta elan' },
    { value: 'EYNI_EMLA_FERQLI_QIYMET', label: '💰 Eyni əmlak, fərqli qiymət' },
    { value: 'DIGER', label: '💬 Digər' },
];

const MAX_CHARS = 500;

interface Props {
    listingId: string;
    onClose: () => void;
}

export function ReportModal({ listingId, onClose }: Props) {
    const [reason, setReason] = React.useState('');
    const [note, setNote] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [error, setError] = React.useState('');

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

    // Auto-close after success
    React.useEffect(() => {
        if (isSuccess) {
            const t = setTimeout(onClose, 2000);
            return () => clearTimeout(t);
        }
    }, [isSuccess, onClose]);

    async function handleSubmit() {
        if (!reason) { setError('Zəhmət olmasa səbəb seçin'); return; }
        setError('');
        setIsLoading(true);
        try {
            await api.post(`/listings/${listingId}/report`, {
                reason,
                ...(note.trim() && { note: note.trim() }),
            });
            setIsSuccess(true);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Xəta baş verdi. Yenidən cəhd edin.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    background: C.white,
                    borderRadius: 20,
                    width: '100%',
                    maxWidth: 440,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>🚩 Şikayət et</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.muted }}
                    >
                        <X style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {isSuccess ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: C.success, marginBottom: 6 }}>Qəbul edildi</p>
                            <p style={{ fontSize: 13, color: C.muted }}>Şikayətiniz moderatorlara göndərildi. Teşəkkür edirik!</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Şikayət səbəbini seçin:</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {REASONS.map(r => (
                                    <label
                                        key={r.value}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 14px',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            border: `1px solid ${reason === r.value ? C.orange : C.border}`,
                                            background: reason === r.value ? 'rgba(232,98,10,0.06)' : 'transparent',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="report-reason"
                                            value={r.value}
                                            checked={reason === r.value}
                                            onChange={() => setReason(r.value)}
                                            style={{ accentColor: C.orange, width: 16, height: 16, cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: 14, color: C.navy }}>{r.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                        Əlavə qeyd (ixtiyari)
                                    </span>
                                    <span style={{ fontSize: 12, color: note.length > MAX_CHARS * 0.9 ? C.error : C.muted }}>
                                        {note.length}/{MAX_CHARS}
                                    </span>
                                </div>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value.slice(0, MAX_CHARS))}
                                    rows={3}
                                    placeholder="Əlavə məlumat varsa..."
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 10,
                                        border: `1px solid ${C.border}`,
                                        fontSize: 14,
                                        color: C.navy,
                                        background: C.white,
                                        outline: 'none',
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.5,
                                    }}
                                />
                            </div>

                            {error && (
                                <p style={{ fontSize: 13, color: C.error, margin: 0 }}>⚠️ {error}</p>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={onClose}
                                    style={{
                                        flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer',
                                    }}
                                >Ləğv et</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !reason}
                                    style={{
                                        flex: 1, padding: '11px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                        background: isLoading || !reason ? '#D1D5DB' : C.orange,
                                        color: '#FFF', border: 'none',
                                        cursor: isLoading || !reason ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isLoading ? 'Göndərilir...' : 'Göndər'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
