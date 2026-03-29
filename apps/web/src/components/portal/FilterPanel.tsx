import * as React from 'react';
import type { ListingFilters } from '@/hooks/useListings';
import { NisangahModal } from '@/components/portal/NisangahModal';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    orange: '#E8620A',
    cream: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    borderMed: 'rgba(0,0,0,0.14)',
    muted: '#6B7280',
    bg: '#F9F9F7',
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
    { value: 'MENZIL',    label: '🏠 Mənzil' },
    { value: 'HEYET_EVI', label: '🏡 Həyət evi' },
    { value: 'OFIS',      label: '🏢 Ofis' },
    { value: 'GARAJ',     label: '🚗 Qaraj' },
    { value: 'TORPAQ',    label: '🌿 Torpaq' },
    { value: 'OBYEKT',    label: '🏪 Obyekt' },
    { value: 'ANBAR',     label: '📦 Anbar' },
];

const BUILDING_TYPE_OPTIONS = [
    { value: '',             label: 'Fərqi yoxdur' },
    { value: 'YENI_TIKILI', label: '🏗 Yeni tikili' },
    { value: 'KOHNE_TIKILI',label: '🏚 Köhnə tikili' },
];

const RENOVATION_OPTIONS = [
    { value: '',            label: 'Fərqi yoxdur' },
    { value: 'TEMIRLI',    label: '✨ Təmirli' },
    { value: 'TEMIRSIZ',   label: '🔨 Təmirsiz' },
];

const AVAIL_OPTIONS = [
    { value: 'BOSHDUR',  label: '✅ Günlük' },
    { value: 'BOSHALIR', label: '📅 Uzunmüddətli' },
];

const ROOMS_OPTIONS = ['1', '2', '3', '4', '5+'];

const AMENITY_OPTIONS = [
    { value: 'MEBEL',       label: '🛋 Mebel' },
    { value: 'KONDISIONER', label: '❄️ Kondisioner' },
    { value: 'LIFT',        label: '🛗 Lift' },
    { value: 'BALKON',      label: '🪟 Balkon' },
    { value: 'INTERNET',    label: '📶 İnternet' },
    { value: 'PARKLAMA',    label: '🅿️ Parklama' },
    { value: 'ISITME',      label: '🌡 İsitmə' },
    { value: 'GUVƏNLIK',    label: '🔒 Güvənlik' },
    { value: 'HOVUZ',       label: '🏊 Hovuz' },
];

const DISTRICTS = [
    'Binəqədi', 'Nəsimi', 'Sabunçu', 'Suraxanı', 'Xətai',
    'Nizami', 'Yasamal', 'Nərimanov', 'Nişanqah', 'Pirəkəşkül',
    'Abşeron', 'Qaradağ', 'Sabail', 'Xəzər',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            margin: '0 0 8px',
        }}>{children}</p>
    );
}

function Chip({ active, onClick, children }: {
    active: boolean; onClick: () => void; children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13,
                fontWeight: active ? 700 : 500, cursor: 'pointer',
                transition: 'all 0.15s', border: 'none', flexShrink: 0,
                background: active ? C.navy : '#EFEDE9',
                color: active ? C.white : C.muted,
                boxShadow: active ? '0 2px 8px rgba(26,26,46,0.18)' : 'none',
            }}
        >{children}</button>
    );
}

function NumberInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <input
            type="number"
            value={value}
            min={0}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${C.borderMed}`, outline: 'none',
                color: C.navy, background: C.white, minWidth: 0,
            }}
        />
    );
}

function TextInput({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${C.borderMed}`, outline: 'none',
                color: C.navy, background: C.white, boxSizing: 'border-box',
            }}
        />
    );
}

function Divider() {
    return <div style={{ borderTop: `1px solid ${C.border}`, margin: '2px 0' }} />;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FilterPanelProps {
    filters: ListingFilters;
    onChange: (filters: ListingFilters) => void;
    onApply: () => void;
    onReset: () => void;
    listingCount?: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FilterPanel({ filters, onChange, onApply, onReset, listingCount }: FilterPanelProps) {
    const set = <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) =>
        onChange({ ...filters, [key]: value });

    const toggleType = (v: string) =>
        set('type', filters.type === v ? '' : v);

    const toggleAmenity = (v: string) =>
        set('amenities', filters.amenities.includes(v)
            ? filters.amenities.filter(a => a !== v)
            : [...filters.amenities, v]);

    const toggleAvail = (v: string) =>
        set('availStatus', filters.availStatus === v ? '' : v);

    // NisangahModal state
    const [showNisangah, setShowNisangah] = React.useState(false);
    const [nisangahTab, setNisangahTab] = React.useState<'rayon' | 'metro' | 'landmark'>('rayon');

    const openNisangah = (tab: 'rayon' | 'metro' | 'landmark') => {
        setNisangahTab(tab);
        setShowNisangah(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }}>

            {/* 1. Əmlak növü */}
            <div>
                <SectionLabel>Əmlak növü</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {TYPE_OPTIONS.map(t => (
                        <Chip key={t.value} active={filters.type === t.value} onClick={() => toggleType(t.value)}>
                            {t.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 2. Tikili növü */}
            <div>
                <SectionLabel>Tikili növü</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {BUILDING_TYPE_OPTIONS.map(t => (
                        <Chip key={t.value} active={filters.buildingType === t.value} onClick={() => set('buildingType', t.value)}>
                            {t.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 3. Qiymət */}
            <div>
                <SectionLabel>Qiymət (AZN/ay)</SectionLabel>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <NumberInput value={filters.priceMin} onChange={v => set('priceMin', v)} placeholder="min" />
                    <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>—</span>
                    <NumberInput value={filters.priceMax} onChange={v => set('priceMax', v)} placeholder="max" />
                </div>
            </div>

            <Divider />

            {/* 4. Otaq sayı */}
            <div>
                <SectionLabel>Otaq sayı</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ROOMS_OPTIONS.map(r => (
                        <Chip key={r} active={filters.rooms === r} onClick={() => set('rooms', filters.rooms === r ? '' : r)}>
                            {r}
                        </Chip>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 5. Təmir */}
            <div>
                <SectionLabel>Təmir</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {RENOVATION_OPTIONS.map(t => (
                        <Chip key={t.value} active={filters.renovation === t.value} onClick={() => set('renovation', t.value)}>
                            {t.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 6. Kirayə növü */}
            <div>
                <SectionLabel>Kirayə növü</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {AVAIL_OPTIONS.map(t => (
                        <Chip key={t.value} active={filters.availStatus === t.value} onClick={() => toggleAvail(t.value)}>
                            {t.label}
                        </Chip>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 7. Sahə */}
            <div>
                <SectionLabel>Sahə (m²)</SectionLabel>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <NumberInput value={filters.areaMin} onChange={v => set('areaMin', v)} placeholder="min" />
                    <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>—</span>
                    <NumberInput value={filters.areaMax} onChange={v => set('areaMax', v)} placeholder="max" />
                </div>
            </div>

            <Divider />

            {/* 8. Mərtəbə */}
            <div>
                <SectionLabel>Mərtəbə</SectionLabel>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <NumberInput value={filters.floorMin} onChange={v => set('floorMin', v)} placeholder="min" />
                    <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>—</span>
                    <NumberInput value={filters.floorMax} onChange={v => set('floorMax', v)} placeholder="max" />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {[
                        { key: 'notFirstFloor' as const, label: '1-ci olmasın' },
                        { key: 'notTopFloor' as const,   label: 'Ən üst olmasın' },
                    ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: C.navy }}>
                            <input
                                type="checkbox"
                                checked={filters[key] as boolean}
                                onChange={e => set(key, e.target.checked)}
                                style={{ accentColor: C.navy, width: 15, height: 15 }}
                            />
                            {label}
                        </label>
                    ))}
                </div>
            </div>

            <Divider />

            {/* 9. Rayon / Metro / Nişangah — via NisangahModal */}
            <div>
                <SectionLabel>Rayon / Metro / Nişangah</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

                    {/* Rayon button */}
                    <button
                        onClick={() => openNisangah('rayon')}
                        style={{
                            padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', border: `1px solid ${filters.districts.length > 0 ? C.gold : C.borderMed}`,
                            background: filters.districts.length > 0 ? C.navy : C.white,
                            color: filters.districts.length > 0 ? C.white : C.muted,
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        }}
                    >
                        📍 Rayon
                        {filters.districts.length > 0 && (
                            <span style={{
                                background: C.gold, color: '#0A0B0F',
                                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                            }}>{filters.districts.length}</span>
                        )}
                    </button>

                    {/* Metro button */}
                    <button
                        onClick={() => openNisangah('metro')}
                        style={{
                            padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', border: `1px solid ${filters.metro ? C.gold : C.borderMed}`,
                            background: filters.metro ? C.navy : C.white,
                            color: filters.metro ? C.white : C.muted,
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        }}
                    >
                        🚇 Metro
                        {filters.metro && (
                            <span style={{
                                background: C.gold, color: '#0A0B0F',
                                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                            }}>1</span>
                        )}
                    </button>

                    {/* Nişangah button */}
                    <button
                        onClick={() => openNisangah('landmark')}
                        style={{
                            padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', border: `1px solid ${filters.landmark ? C.gold : C.borderMed}`,
                            background: filters.landmark ? C.navy : C.white,
                            color: filters.landmark ? C.white : C.muted,
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        }}
                    >
                        🏛 Nişangah
                        {filters.landmark && (
                            <span style={{
                                background: C.gold, color: '#0A0B0F',
                                borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800,
                            }}>1</span>
                        )}
                    </button>
                </div>

                {/* Active chips summary */}
                {(filters.districts.length > 0 || filters.metro || filters.landmark) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {filters.districts.map(d => (
                            <span key={d} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                                background: 'rgba(201,168,76,0.12)', color: C.gold,
                                border: `1px solid ${C.gold}`,
                            }}>
                                📍 {d}
                                <button
                                    onClick={() => set('districts', filters.districts.filter(x => x !== d))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, lineHeight: 1, fontSize: 14 }}
                                >×</button>
                            </span>
                        ))}
                        {filters.metro && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                                background: 'rgba(201,168,76,0.12)', color: C.gold,
                                border: `1px solid ${C.gold}`,
                            }}>
                                🚇 {filters.metro}
                                <button
                                    onClick={() => set('metro', '')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, lineHeight: 1, fontSize: 14 }}
                                >×</button>
                            </span>
                        )}
                        {filters.landmark && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 14, fontSize: 12, fontWeight: 600,
                                background: 'rgba(201,168,76,0.12)', color: C.gold,
                                border: `1px solid ${C.gold}`,
                            }}>
                                🏛 {filters.landmark}
                                <button
                                    onClick={() => set('landmark', '')}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, lineHeight: 1, fontSize: 14 }}
                                >×</button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            <Divider />

            {/* 10. Əlavə imkanlar */}
            <div>
                <SectionLabel>Əlavə imkanlar</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {AMENITY_OPTIONS.map(a => (
                        <button
                            key={a.value}
                            onClick={() => toggleAmenity(a.value)}
                            style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: 12,
                                fontWeight: filters.amenities.includes(a.value) ? 700 : 400,
                                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                                background: filters.amenities.includes(a.value)
                                    ? 'rgba(201,168,76,0.15)' : '#F5F5F3',
                                color: filters.amenities.includes(a.value) ? C.gold : C.muted,
                                boxShadow: filters.amenities.includes(a.value)
                                    ? `0 0 0 1.5px ${C.gold}` : 'none',
                            }}
                        >{a.label}</button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex', gap: 10, paddingTop: 16,
                borderTop: `1px solid ${C.border}`, alignItems: 'center',
            }}>
                <button
                    onClick={onReset}
                    style={{
                        padding: '11px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                        background: 'transparent', color: C.muted,
                        border: `1px solid ${C.borderMed}`, cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >Sıfırla</button>
                <button
                    onClick={onApply}
                    style={{
                        flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                        background: C.navy, color: C.white, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: '0 4px 16px rgba(26,26,46,0.2)',
                    }}
                >
                    {listingCount !== undefined
                        ? `${listingCount} elanı göstər`
                        : 'Elanları göstər'
                    }
                </button>
            </div>

            {/* NisangahModal */}
            <NisangahModal
                isOpen={showNisangah}
                onClose={() => setShowNisangah(false)}
                initialTab={nisangahTab}
                selectedDistricts={filters.districts}
                selectedMetro={filters.metro ? [filters.metro] : []}
                selectedLandmarks={filters.landmark ? [filters.landmark] : []}
                onChangeDistricts={(vals) => set('districts', vals)}
                onChangeMetro={(vals) => set('metro', vals[0] ?? '')}
                onChangeLandmarks={(vals) => set('landmark', vals[0] ?? '')}
            />
        </div>
    );
}

// ─── Modal Wrapper ─────────────────────────────────────────────────────────────

export interface FilterModalProps extends FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

export function FilterModal({ isOpen, onClose, title = 'Filtrlər', ...panelProps }: FilterModalProps) {
    const [isMobile, setIsMobile] = React.useState(
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Close on Escape key
    React.useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    React.useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
                    zIndex: 200, backdropFilter: 'blur(2px)',
                    animation: 'fp_fadeIn 0.15s ease',
                }}
            />

            {isMobile ? (
                /* ── Mobile: bottom-sheet ── */
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 201,
                    display: 'flex',
                    flexDirection: 'column',
                    pointerEvents: 'none',
                }}>
                    <div style={{
                        flex: 1,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        background: C.white,
                        borderRadius: '16px 16px 0 0',
                        marginTop: 'auto',
                        maxHeight: '90vh',
                        pointerEvents: 'all',
                        boxShadow: '0 -8px 48px rgba(0,0,0,0.18)',
                        animation: 'fp_slideUp 0.22s cubic-bezier(0.4,0,0.2,1)',
                    }}>
                        {/* Drag handle */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
                        </div>

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 20px 14px', borderBottom: `1px solid ${C.border}`,
                            flexShrink: 0,
                        }}>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.navy }}>{title}</h2>
                            <button
                                onClick={onClose}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                                    background: C.bg, color: C.muted, fontSize: 20, lineHeight: 1,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >×</button>
                        </div>

                        {/* Scrollable content */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '16px 20px',
                            WebkitOverflowScrolling: 'touch' as any,
                        }}>
                            <FilterPanel {...panelProps} />
                        </div>
                    </div>
                </div>
            ) : (
                /* ── Desktop: right slide-in panel ── */
                <div style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: '100%', maxWidth: 520, background: C.white,
                    zIndex: 201, display: 'flex', flexDirection: 'column',
                    boxShadow: '-8px 0 48px rgba(0,0,0,0.14)',
                    animation: 'fp_slideIn 0.22s cubic-bezier(0.4,0,0.2,1)',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
                        flexShrink: 0,
                    }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navy }}>{title}</h2>
                        <button
                            onClick={onClose}
                            style={{
                                width: 34, height: 34, borderRadius: '50%', border: 'none',
                                background: C.bg, color: C.muted, fontSize: 20, lineHeight: 1,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >×</button>
                    </div>

                    {/* Scrollable content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                        <FilterPanel {...panelProps} />
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fp_fadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fp_slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fp_slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
}

