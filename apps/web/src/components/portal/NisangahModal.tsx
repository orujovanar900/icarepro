import * as React from 'react';
import { METRO_STATIONS, LANDMARKS, LANDMARK_CATEGORIES, DISTRICT_GROUPS } from '@/data/baku-landmarks';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderMed: '#ddd',
    muted: '#6B7280',
    bg: '#F9F9F7',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NisangahModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-selected tab when modal opens */
    initialTab?: 'metro' | 'landmark' | 'rayon';
    /** Selected metro station names */
    selectedMetro: string[];
    onChangeMetro: (values: string[]) => void;
    /** Selected landmark names */
    selectedLandmarks: string[];
    onChangeLandmarks: (values: string[]) => void;
    /** Selected districts (single names) */
    selectedDistricts: string[];
    onChangeDistricts: (values: string[]) => void;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ selected, onClick, children }: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${selected ? C.gold : C.borderMed}`,
                background: selected ? C.navy : C.white,
                color: selected ? C.white : '#333',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: selected ? 600 : 400,
                transition: 'all 0.15s',
                flexShrink: 0,
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase' as const, letterSpacing: '0.06em',
            margin: '0 0 10px',
        }}>{children}</p>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NisangahModal({
    isOpen, onClose, initialTab = 'rayon',
    selectedMetro, onChangeMetro,
    selectedLandmarks, onChangeLandmarks,
    selectedDistricts, onChangeDistricts,
}: NisangahModalProps) {
    const [tab, setTab] = React.useState<'metro' | 'landmark' | 'rayon'>(initialTab);
    const [search, setSearch] = React.useState('');

    // Sync initialTab when it changes (e.g. user opens via different button)
    React.useEffect(() => {
        if (isOpen) setTab(initialTab);
    }, [isOpen, initialTab]);

    // Close on Escape
    React.useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll
    React.useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleMetro = (name: string) =>
        onChangeMetro(selectedMetro.includes(name)
            ? selectedMetro.filter(m => m !== name)
            : [...selectedMetro, name]);

    const toggleLandmark = (name: string) =>
        onChangeLandmarks(selectedLandmarks.includes(name)
            ? selectedLandmarks.filter(l => l !== name)
            : [...selectedLandmarks, name]);

    const toggleDistrict = (name: string) =>
        onChangeDistricts(selectedDistricts.includes(name)
            ? selectedDistricts.filter(d => d !== name)
            : [...selectedDistricts, name]);

    const filteredMetro = METRO_STATIONS.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()));

    const filteredLandmarks = LANDMARKS.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()));

    const totalSelectedCount =
        selectedMetro.length + selectedLandmarks.length + selectedDistricts.length;

    const TABS: { key: typeof tab; label: string }[] = [
        { key: 'rayon',    label: '📍 Rayon' },
        { key: 'metro',    label: '🚇 Metro' },
        { key: 'landmark', label: '🏛 Nişangah' },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    zIndex: 300, backdropFilter: 'blur(2px)',
                }}
            />

            {/* Bottom-sheet / side panel */}
            <div style={{
                position: 'fixed',
                // On small screens: bottom sheet; on desktop: right slide-in
                bottom: 0, left: 0, right: 0,
                zIndex: 301,
                display: 'flex',
                flexDirection: 'column',
                background: C.white,
                borderRadius: '16px 16px 0 0',
                maxHeight: '90vh',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.18)',
                animation: 'slideUp 0.22s cubic-bezier(0.4,0,0.2,1)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
                    flexShrink: 0,
                }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>
                        Rayon / Metro / Nişangah
                        {totalSelectedCount > 0 && (
                            <span style={{
                                marginLeft: 8, background: C.gold, color: '#0A0B0F',
                                borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700,
                            }}>{totalSelectedCount}</span>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none',
                            background: C.bg, color: C.muted, fontSize: 20, lineHeight: 1,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >×</button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: 6, padding: '10px 20px 0',
                    borderBottom: `1px solid ${C.border}`, flexShrink: 0,
                }}>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => { setTab(t.key); setSearch(''); }}
                            style={{
                                padding: '8px 16px', borderRadius: '10px 10px 0 0',
                                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                background: tab === t.key ? C.navy : 'transparent',
                                color: tab === t.key ? C.white : C.muted,
                                transition: 'all 0.15s',
                                borderBottom: tab === t.key ? `2px solid ${C.gold}` : '2px solid transparent',
                            }}
                        >{t.label}</button>
                    ))}
                </div>

                {/* Search */}
                {(tab === 'metro' || tab === 'landmark') && (
                    <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={tab === 'metro' ? '🚇 Metro axtar...' : '🏛 Nişangah axtar...'}
                            style={{
                                width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
                                border: `1px solid ${C.borderMed}`, outline: 'none',
                                boxSizing: 'border-box', color: C.navy, background: C.bg,
                            }}
                        />
                    </div>
                )}

                {/* Scrollable content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>

                    {/* RAYON tab */}
                    {tab === 'rayon' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {DISTRICT_GROUPS.map(group => (
                                <div key={group.district}>
                                    {/* Parent district — big chip */}
                                    <div style={{ marginBottom: 8 }}>
                                        <button
                                            onClick={() => toggleDistrict(group.district)}
                                            style={{
                                                padding: '8px 18px', borderRadius: 20,
                                                border: `1.5px solid ${selectedDistricts.includes(group.district) ? C.gold : C.borderMed}`,
                                                background: selectedDistricts.includes(group.district) ? C.navy : C.white,
                                                color: selectedDistricts.includes(group.district) ? C.white : C.navy,
                                                cursor: 'pointer', fontSize: 14, fontWeight: 700,
                                                transition: 'all 0.15s',
                                            }}
                                        >📍 {group.district}</button>
                                    </div>
                                    {/* Sub-areas — smaller chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 8 }}>
                                        {group.areas.map(area => (
                                            <Chip
                                                key={area}
                                                selected={selectedDistricts.includes(area)}
                                                onClick={() => toggleDistrict(area)}
                                            >
                                                {area}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* METRO tab */}
                    {tab === 'metro' && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {filteredMetro.length === 0 ? (
                                <p style={{ color: C.muted, fontSize: 13 }}>Nəticə tapılmadı</p>
                            ) : filteredMetro.map(m => (
                                <Chip
                                    key={m.id}
                                    selected={selectedMetro.includes(m.name)}
                                    onClick={() => toggleMetro(m.name)}
                                >
                                    🚇 {m.name}
                                </Chip>
                            ))}
                        </div>
                    )}

                    {/* LANDMARK tab */}
                    {tab === 'landmark' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {LANDMARK_CATEGORIES.map(cat => {
                                const items = filteredLandmarks.filter(l => l.category === cat);
                                if (!items.length) return null;
                                return (
                                    <div key={cat}>
                                        <SectionLabel>{cat}</SectionLabel>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {items.map(l => (
                                                <Chip
                                                    key={l.id}
                                                    selected={selectedLandmarks.includes(l.name)}
                                                    onClick={() => toggleLandmark(l.name)}
                                                >
                                                    📍 {l.name}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredLandmarks.length === 0 && (
                                <p style={{ color: C.muted, fontSize: 13 }}>Nəticə tapılmadı</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', gap: 10, padding: '14px 20px',
                    borderTop: `1px solid ${C.border}`, flexShrink: 0,
                    background: C.white,
                }}>
                    <button
                        onClick={() => {
                            onChangeMetro([]);
                            onChangeLandmarks([]);
                            onChangeDistricts([]);
                        }}
                        style={{
                            padding: '11px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                            background: 'transparent', color: C.muted,
                            border: `1px solid ${C.borderMed}`, cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >Sıfırla</button>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                            background: C.navy, color: C.white, border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(26,26,46,0.2)',
                        }}
                    >Tətbiq et ({totalSelectedCount} seçilib)</button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
