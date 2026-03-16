import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TickerSlot {
    id:                 string;
    type:               'LISTING' | 'AD';
    content:            string;
    linkUrl:            string | null;
    listingId:          string | null;
    organizationId:     string | null;
    placement:          'PORTAL_MAIN' | 'LISTING_DETAIL';
    isActive:           boolean;
    sortOrder:          number;
    startDate:          string;
    endDate:            string;
    dailyHours:         number[];
    maxImpressions:     number;
    currentImpressions: number;
    createdBy:          string;
    createdAt:          string;
    updatedAt:          string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD   = '#C9A84C';
const NAVY   = '#1A1A2E';
const WHITE  = '#FFFFFF';

const HOUR_GROUPS = [
    { label: 'Gecə',   hours: [0,1,2,3,4,5] },
    { label: 'Səhər',  hours: [6,7,8,9,10,11] },
    { label: 'Gündüz', hours: [12,13,14,15,16,17] },
    { label: 'Axşam',  hours: [18,19,20,21,22,23] },
];

const TABS = [
    { key: 'PORTAL_MAIN',    label: 'Portal Ana Səhifə' },
    { key: 'LISTING_DETAIL', label: 'Elan Detayı' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str: string) {
    const d = new Date(str);
    return d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTimeLocal(str?: string) {
    if (!str) return '';
    const d = new Date(str);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slotStatus(slot: TickerSlot): 'active' | 'inactive' | 'expired' | 'scheduled' {
    if (!slot.isActive) return 'inactive';
    const now = Date.now();
    if (new Date(slot.endDate).getTime() < now) return 'expired';
    if (new Date(slot.startDate).getTime() > now) return 'scheduled';
    return 'active';
}

// ─── Default form values ──────────────────────────────────────────────────────

function defaultForm(): SlotForm {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return {
        type:           'AD',
        placement:      'PORTAL_MAIN',
        content:        '',
        linkUrl:        '',
        sortOrder:      0,
        startDate:      fmtDateTimeLocal(now.toISOString()),
        endDate:        fmtDateTimeLocal(end.toISOString()),
        dailyHours:     [],
        maxImpressions: 0,
        isActive:       true,
    };
}

interface SlotForm {
    type:           'LISTING' | 'AD';
    placement:      'PORTAL_MAIN' | 'LISTING_DETAIL';
    content:        string;
    linkUrl:        string;
    sortOrder:      number;
    startDate:      string;
    endDate:        string;
    dailyHours:     number[];
    maxImpressions: number;
    isActive:       boolean;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<'active' | 'inactive' | 'expired' | 'scheduled', { bg: string; color: string; label: string }> = {
    active:    { bg: '#DCFCE7', color: '#16A34A', label: 'Aktiv' },
    inactive:  { bg: '#F3F4F6', color: '#6B7280', label: 'Deaktiv' },
    expired:   { bg: '#FEE2E2', color: '#DC2626', label: 'Müddəti keçib' },
    scheduled: { bg: '#EFF6FF', color: '#2563EB', label: 'Zamanlanmış' },
};

function StatusBadge({ slot }: { slot: TickerSlot }) {
    const st = slotStatus(slot);
    const c = STATUS_CFG[st];
    return (
        <span style={{
            background: c.bg, color: c.color, fontSize: 11, fontWeight: 700,
            padding: '3px 8px', borderRadius: 5,
        }}>{c.label}</span>
    );
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: 'LISTING' | 'AD' }) {
    const isAd = type === 'AD';
    return (
        <span style={{
            background: isAd ? 'rgba(201,168,76,0.15)' : 'rgba(59,130,246,0.12)',
            color:      isAd ? GOLD : '#2563EB',
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
        }}>
            {isAd ? 'Reklam' : 'Elan'}
        </span>
    );
}

// ─── SlotModal ────────────────────────────────────────────────────────────────

function SlotModal({
    mode,
    slot,
    onClose,
    onSaved,
}: {
    mode:    'create' | 'edit';
    slot?:   TickerSlot;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { addToast } = useToastStore();
    const [form, setForm] = React.useState<SlotForm>(() => {
        if (mode === 'edit' && slot) {
            return {
                type:           slot.type,
                placement:      slot.placement,
                content:        slot.content,
                linkUrl:        slot.linkUrl ?? '',
                sortOrder:      slot.sortOrder,
                startDate:      fmtDateTimeLocal(slot.startDate),
                endDate:        fmtDateTimeLocal(slot.endDate),
                dailyHours:     slot.dailyHours,
                maxImpressions: slot.maxImpressions,
                isActive:       slot.isActive,
            };
        }
        return defaultForm();
    });
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);

    const set = <K extends keyof SlotForm>(key: K, val: SlotForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }));

    const toggleHour = (h: number) => {
        setForm(prev => ({
            ...prev,
            dailyHours: prev.dailyHours.includes(h)
                ? prev.dailyHours.filter(x => x !== h)
                : [...prev.dailyHours, h].sort((a, b) => a - b),
        }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.content.trim())                      e['content']   = 'Məzmun tələb olunur';
        if (form.content.length > 100)                 e['content']   = 'Maks 100 simvol';
        if (!form.startDate)                           e['startDate'] = 'Tələb olunur';
        if (!form.endDate)                             e['endDate']   = 'Tələb olunur';
        if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
            e['endDate'] = 'Bitmə tarixi başlama tarixindən sonra olmalıdır';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const body = {
                type:           form.type,
                placement:      form.placement,
                content:        form.content.trim(),
                linkUrl:        form.linkUrl.trim() || null,
                sortOrder:      form.sortOrder,
                startDate:      new Date(form.startDate).toISOString(),
                endDate:        new Date(form.endDate).toISOString(),
                dailyHours:     form.dailyHours,
                maxImpressions: form.maxImpressions,
                isActive:       form.isActive,
            };
            if (mode === 'create') {
                await api.post('/ticker/admin', body);
                addToast({ type: 'success', message: 'Slot yaradıldı' });
            } else if (slot) {
                await api.patch(`/ticker/admin/${slot.id}`, body);
                addToast({ type: 'success', message: 'Slot yeniləndi' });
            }
            onSaved();
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Xəta baş verdi';
            addToast({ type: 'error', message: msg });
        } finally {
            setSaving(false);
        }
    };

    // ── Overlay click to close ─────────────────────────────────────────────
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const handleOverlay = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '8px 10px',
        border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8,
        fontSize: 13, outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: 11, fontWeight: 700,
        color: '#6B7280', textTransform: 'uppercase',
        letterSpacing: '0.04em', marginBottom: 5,
    };
    const errStyle: React.CSSProperties = { fontSize: 11, color: '#EF4444', marginTop: 3 };

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlay}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
            }}
        >
            <div style={{
                background: WHITE, borderRadius: 16, padding: '28px 28px 24px',
                width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: NAVY, marginBottom: 20 }}>
                    {mode === 'create' ? 'Yeni Ticker Slot' : 'Slotu Düzəlt'}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Row: Type + Placement */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={labelStyle}>Növ *</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['AD', 'LISTING'] as const).map(t => (
                                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                                        <input
                                            type="radio"
                                            checked={form.type === t}
                                            onChange={() => set('type', t)}
                                        />
                                        {t === 'AD' ? 'Reklam' : 'Elan'}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Yerləşdirmə *</label>
                            <select
                                value={form.placement}
                                onChange={e => set('placement', e.target.value as SlotForm['placement'])}
                                style={{ ...inputStyle }}
                            >
                                <option value="PORTAL_MAIN">Ana Səhifə</option>
                                <option value="LISTING_DETAIL">Elan Detayı</option>
                            </select>
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Məzmun * <span style={{ fontWeight: 400, textTransform: 'none' }}>({form.content.length}/100)</span></label>
                        <input
                            style={{ ...inputStyle, borderColor: errors['content'] ? '#EF4444' : 'rgba(0,0,0,0.15)' }}
                            value={form.content}
                            maxLength={100}
                            placeholder="Tickerdə görünəcək mətn"
                            onChange={e => set('content', e.target.value)}
                        />
                        {errors['content'] && <p style={errStyle}>{errors['content']}</p>}
                    </div>

                    {/* Link URL */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Link URL <span style={{ fontWeight: 400, textTransform: 'none' }}>(istəyə bağlı)</span></label>
                        <input
                            style={inputStyle}
                            value={form.linkUrl}
                            placeholder="https://..."
                            onChange={e => set('linkUrl', e.target.value)}
                        />
                    </div>

                    {/* Sort order + max impressions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={labelStyle}>Sıra</label>
                            <input
                                type="number"
                                style={inputStyle}
                                value={form.sortOrder}
                                onChange={e => set('sortOrder', parseInt(e.target.value, 10) || 0)}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Maks. Göstəriş <span style={{ fontWeight: 400, textTransform: 'none' }}>(0=limitsiz)</span></label>
                            <input
                                type="number"
                                style={inputStyle}
                                min={0}
                                value={form.maxImpressions}
                                onChange={e => set('maxImpressions', parseInt(e.target.value, 10) || 0)}
                            />
                        </div>
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div>
                            <label style={labelStyle}>Başlama tarixi *</label>
                            <input
                                type="datetime-local"
                                style={{ ...inputStyle, borderColor: errors['startDate'] ? '#EF4444' : 'rgba(0,0,0,0.15)' }}
                                value={form.startDate}
                                onChange={e => set('startDate', e.target.value)}
                            />
                            {errors['startDate'] && <p style={errStyle}>{errors['startDate']}</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Bitmə tarixi *</label>
                            <input
                                type="datetime-local"
                                style={{ ...inputStyle, borderColor: errors['endDate'] ? '#EF4444' : 'rgba(0,0,0,0.15)' }}
                                value={form.endDate}
                                onChange={e => set('endDate', e.target.value)}
                            />
                            {errors['endDate'] && <p style={errStyle}>{errors['endDate']}</p>}
                        </div>
                    </div>

                    {/* Daily hours */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>
                            Aktiv saatlar{' '}
                            <span style={{ fontWeight: 400, textTransform: 'none' }}>
                                {form.dailyHours.length === 0 ? '(boş = həmişə)' : `(${form.dailyHours.length} saat seçildi)`}
                            </span>
                        </label>
                        {HOUR_GROUPS.map(group => (
                            <div key={group.label} style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>{group.label}</div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                    {group.hours.map(h => {
                                        const selected = form.dailyHours.includes(h);
                                        return (
                                            <button
                                                key={h}
                                                type="button"
                                                onClick={() => toggleHour(h)}
                                                style={{
                                                    width: 38, height: 28, borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                    border: 'none', cursor: 'pointer',
                                                    background: selected ? GOLD : '#F3F4F6',
                                                    color:      selected ? '#0A0B0F' : '#6B7280',
                                                }}
                                            >
                                                {String(h).padStart(2, '0')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Active toggle */}
                    <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ ...labelStyle, margin: 0 }}>Aktivdir</label>
                        <div
                            onClick={() => set('isActive', !form.isActive)}
                            style={{
                                width: 44, height: 24, borderRadius: 12,
                                background: form.isActive ? '#22C55E' : '#D1D5DB',
                                cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                            }}
                        >
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: WHITE, position: 'absolute',
                                top: 3, left: form.isActive ? 23 : 3, transition: 'left 0.2s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                            }} />
                        </div>
                        <span style={{ fontSize: 12, color: form.isActive ? '#16A34A' : '#6B7280' }}>
                            {form.isActive ? 'Aktiv' : 'Deaktiv'}
                        </span>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)',
                                background: WHITE, fontSize: 13, cursor: 'pointer', color: '#374151',
                            }}
                        >
                            Ləğv et
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                padding: '9px 22px', borderRadius: 9, border: 'none',
                                background: GOLD, color: '#0A0B0F', fontSize: 13, fontWeight: 700,
                                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? 'Saxlanır...' : mode === 'create' ? 'Yarat' : 'Yadda saxla'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── ConfirmDeleteOverlay ─────────────────────────────────────────────────────

function ConfirmDeleteOverlay({
    slot,
    onConfirm,
    onCancel,
}: {
    slot:      TickerSlot;
    onConfirm: () => void;
    onCancel:  () => void;
}) {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    return (
        <div
            ref={overlayRef}
            onClick={e => { if (e.target === overlayRef.current) onCancel(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 14, padding: '28px 28px 22px',
                maxWidth: 380, width: '90%', textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>🗑️</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Slotu sil</h3>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 22 }}>
                    <strong>"{slot.content}"</strong> slotunu silmək istədiyinizə əminsiniz?
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={onCancel} style={{
                        padding: '9px 22px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)',
                        background: '#fff', fontSize: 13, cursor: 'pointer',
                    }}>Ləğv et</button>
                    <button onClick={onConfirm} style={{
                        padding: '9px 22px', borderRadius: 9, border: 'none',
                        background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>Sil</button>
                </div>
            </div>
        </div>
    );
}

// ─── ConfirmResetOverlay ──────────────────────────────────────────────────────

function ConfirmResetOverlay({
    slot,
    onConfirm,
    onCancel,
}: {
    slot:      TickerSlot;
    onConfirm: () => void;
    onCancel:  () => void;
}) {
    const overlayRef = React.useRef<HTMLDivElement>(null);
    return (
        <div
            ref={overlayRef}
            onClick={e => { if (e.target === overlayRef.current) onCancel(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1100,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div style={{
                background: '#fff', borderRadius: 14, padding: '28px 28px 22px',
                maxWidth: 380, width: '90%', textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}>
                <p style={{ fontSize: 36, marginBottom: 10 }}>↺</p>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 8 }}>Sayğacı sıfırla</h3>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                    <strong>"{slot.content}"</strong> slotu üçün sayğac sıfırlanacaq.
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 22 }}>
                    Cari göstəriş: <strong style={{ color: GOLD }}>{slot.currentImpressions.toLocaleString()}</strong>
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button onClick={onCancel} style={{
                        padding: '9px 22px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)',
                        background: '#fff', fontSize: 13, cursor: 'pointer',
                    }}>Ləğv et</button>
                    <button onClick={onConfirm} style={{
                        padding: '9px 22px', borderRadius: 9, border: 'none',
                        background: GOLD, color: '#0A0B0F', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>Sıfırla</button>
                </div>
            </div>
        </div>
    );
}

// ─── AdminTicker ──────────────────────────────────────────────────────────────

export function AdminTicker() {
    const { addToast } = useToastStore();
    const qc = useQueryClient();
    const [tab, setTab] = React.useState<'PORTAL_MAIN' | 'LISTING_DETAIL'>('PORTAL_MAIN');
    const [showCreate, setShowCreate] = React.useState(false);
    const [editSlot, setEditSlot]         = React.useState<TickerSlot | null>(null);
    const [deleteSlot, setDeleteSlot]     = React.useState<TickerSlot | null>(null);
    const [resetSlot, setResetSlot]       = React.useState<TickerSlot | null>(null);

    const { data: allSlots = [], isLoading } = useQuery({
        queryKey: ['ticker-admin'],
        queryFn:  async () => {
            const res = await api.get<{ success: boolean; data: TickerSlot[] }>('/ticker/admin');
            return res.data.data;
        },
    });

    const refetch = () => { void qc.invalidateQueries({ queryKey: ['ticker-admin'] }); };

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            api.patch(`/ticker/admin/${id}`, { isActive }),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Status dəyişdirildi' });
            refetch();
        },
        onError: () => addToast({ type: 'error', message: 'Xəta baş verdi' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/ticker/admin/${id}`),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Slot silindi' });
            setDeleteSlot(null);
            refetch();
        },
        onError: () => addToast({ type: 'error', message: 'Xəta baş verdi' }),
    });

    const resetMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/ticker/admin/${id}`, { currentImpressions: 0 }),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Sayğac sıfırlandı' });
            setResetSlot(null);
            refetch();
        },
        onError: () => addToast({ type: 'error', message: 'Xəta baş verdi' }),
    });

    const tabSlots = allSlots.filter(s => s.placement === tab);

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalSlots      = allSlots.length;
    const activeNowSlots  = allSlots.filter(s => slotStatus(s) === 'active').length;
    const totalImpressions = allSlots.reduce((sum, s) => sum + s.currentImpressions, 0);

    // ── Styles ─────────────────────────────────────────────────────────────
    const cardStyle: React.CSSProperties = {
        background: WHITE, borderRadius: 12, padding: '16px 20px',
        border: '1px solid rgba(0,0,0,0.08)', textAlign: 'center',
    };

    const thStyle: React.CSSProperties = {
        padding: '10px 12px', fontSize: 11, fontWeight: 700,
        color: '#6B7280', textAlign: 'left', textTransform: 'uppercase',
        letterSpacing: '0.04em', borderBottom: '1px solid rgba(0,0,0,0.08)',
        background: '#F9FAFB', whiteSpace: 'nowrap',
    };

    const tdStyle: React.CSSProperties = {
        padding: '10px 12px', fontSize: 13, color: '#374151',
        borderBottom: '1px solid rgba(0,0,0,0.06)', verticalAlign: 'middle',
    };

    return (
        <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>📡 LED Ticker İdarəsi</h1>
                    <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        Portal tickerı üçün slotları idarə edin
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    style={{
                        background: GOLD, color: '#0A0B0F', border: 'none',
                        padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    + Yeni slot əlavə et
                </button>
            </div>

            {/* ── Stats ──────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                <div style={cardStyle}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>{totalSlots}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Ümumi slot</p>
                </div>
                <div style={cardStyle}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: '#16A34A', margin: '0 0 4px' }}>{activeNowSlots}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>İndi aktiv</p>
                </div>
                <div style={cardStyle}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: GOLD, margin: '0 0 4px' }}>
                        {totalImpressions.toLocaleString()}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Ümumi göstəriş</p>
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid rgba(0,0,0,0.08)' }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '10px 22px', border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: 700,
                            background: 'none',
                            color: tab === t.key ? GOLD : '#6B7280',
                            borderBottom: tab === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
                            marginBottom: -2,
                        }}
                    >
                        {t.label}
                        <span style={{
                            marginLeft: 7, fontSize: 11, fontWeight: 700,
                            background: tab === t.key ? 'rgba(201,168,76,0.15)' : '#F3F4F6',
                            color: tab === t.key ? GOLD : '#6B7280',
                            padding: '1px 7px', borderRadius: 10,
                        }}>
                            {allSlots.filter(s => s.placement === t.key).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div style={{ background: WHITE, borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
                        Yüklənir...
                    </div>
                ) : tabSlots.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                        Bu yerləşdirmə üçün heç bir slot yoxdur
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {['Məzmun', 'Növ', 'Başlama', 'Bitmə', 'Saatlar', 'Göstəriş', 'Maks', 'Status', 'Əməliyyatlar'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tabSlots.map(slot => (
                                    <tr key={slot.id} style={{ transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                                    >
                                        <td style={{ ...tdStyle, maxWidth: 220 }}>
                                            <div style={{
                                                overflow: 'hidden', textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap', fontWeight: 600, color: NAVY,
                                            }} title={slot.content}>
                                                {slot.content}
                                            </div>
                                            {slot.linkUrl && (
                                                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    🔗 {slot.linkUrl}
                                                </div>
                                            )}
                                        </td>
                                        <td style={tdStyle}><TypeBadge type={slot.type} /></td>
                                        <td style={tdStyle}>{fmtDate(slot.startDate)}</td>
                                        <td style={tdStyle}>{fmtDate(slot.endDate)}</td>
                                        <td style={{ ...tdStyle, fontSize: 12 }}>
                                            {slot.dailyHours.length === 0
                                                ? <span style={{ color: '#9CA3AF' }}>Həmişə</span>
                                                : slot.dailyHours.map(h => String(h).padStart(2, '0')).join(', ')
                                            }
                                        </td>
                                        <td style={{ ...tdStyle, fontWeight: 700, color: GOLD }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {slot.currentImpressions.toLocaleString()}
                                                <button
                                                    title="Sayğacı sıfırla"
                                                    onClick={() => setResetSlot(slot)}
                                                    style={{
                                                        padding: '2px 6px', borderRadius: 5,
                                                        border: '1px solid rgba(201,168,76,0.3)',
                                                        background: 'rgba(201,168,76,0.08)',
                                                        fontSize: 10, cursor: 'pointer', color: GOLD,
                                                    }}
                                                >↺</button>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, color: '#6B7280' }}>
                                            {slot.maxImpressions === 0 ? '∞' : slot.maxImpressions.toLocaleString()}
                                        </td>
                                        <td style={tdStyle}><StatusBadge slot={slot} /></td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                {/* Edit */}
                                                <button
                                                    onClick={() => setEditSlot(slot)}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                                                        background: '#fff', fontSize: 12, cursor: 'pointer', color: '#374151',
                                                    }}
                                                >✏️</button>
                                                {/* Toggle active */}
                                                <button
                                                    onClick={() => toggleMutation.mutate({ id: slot.id, isActive: !slot.isActive })}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.12)',
                                                        background: slot.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                                                        fontSize: 12, cursor: 'pointer',
                                                        color: slot.isActive ? '#DC2626' : '#16A34A',
                                                    }}
                                                >
                                                    {slot.isActive ? '⏸' : '▶'}
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => setDeleteSlot(slot)}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)',
                                                        background: 'rgba(239,68,68,0.06)', fontSize: 12, cursor: 'pointer', color: '#DC2626',
                                                    }}
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            {showCreate && (
                <SlotModal
                    mode="create"
                    onClose={() => setShowCreate(false)}
                    onSaved={refetch}
                />
            )}
            {editSlot && (
                <SlotModal
                    mode="edit"
                    slot={editSlot}
                    onClose={() => setEditSlot(null)}
                    onSaved={refetch}
                />
            )}
            {deleteSlot && (
                <ConfirmDeleteOverlay
                    slot={deleteSlot}
                    onConfirm={() => deleteMutation.mutate(deleteSlot.id)}
                    onCancel={() => setDeleteSlot(null)}
                />
            )}
            {resetSlot && (
                <ConfirmResetOverlay
                    slot={resetSlot}
                    onConfirm={() => resetMutation.mutate(resetSlot.id)}
                    onCancel={() => setResetSlot(null)}
                />
            )}
        </div>
    );
}
