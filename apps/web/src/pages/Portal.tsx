import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { HeroSection } from '@/components/portal/HeroSection';
import { api } from '@/lib/api';

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    cream: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.07)',
    borderMed: 'rgba(0,0,0,0.12)',
    muted: '#6B7280',
};

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';

// ─── Filter data ──────────────────────────────────────────────────────────────

const TYPE_TABS = [
    { value: '', label: 'Hamısı' },
    { value: 'MENZIL', label: '🏠 Mənzil' },
    { value: 'OFIS', label: '🏢 Ofis' },
    { value: 'HEYET_EVI', label: '🏡 Həyət evi' },
    { value: 'GARAJ', label: '🚗 Qaraj' },
    { value: 'TORPAQ', label: '🌿 Torpaq' },
    { value: 'OBYEKT', label: '🏪 Obyekt' },
    { value: 'MAGAZA', label: '🛒 Mağaza' },
    { value: 'VILLA', label: '🏰 Villa' },
];

const AVAIL_TABS = [
    { value: '', label: 'Hamısı' },
    { value: 'BOSHDUR', label: '✅ Boşdur' },
    { value: 'BOSHALIR', label: '📅 Boşalır' },
    { value: 'TUTULUB', label: '🔒 Tutulub' },
];

const BUILDING_TYPES = [
    { value: '', label: 'Fərq etməz' },
    { value: 'YENI_TIKILI', label: '🏗 Yeni tikili' },
    { value: 'KOHNE_TIKILI', label: '🏚 Köhnə tikili' },
];

const DISTRICTS = [
    'Binəqədi', 'Nəsimi', 'Sabunçu', 'Suraxanı', 'Xətai',
    'Nizami', 'Yasamal', 'Nərimanov', 'Nişanqah', 'Pirəkəşkül',
    'Abşeron', 'Qaradağ', 'Sabail', 'Xəzər',
];

const AMENITY_OPTIONS = [
    { value: 'MEBEL', label: '🛋 Mebel' },
    { value: 'KONDISIONER', label: '❄️ Kondisioner' },
    { value: 'LIFT', label: '🛗 Lift' },
    { value: 'BALKON', label: '🪟 Balkon' },
    { value: 'INTERNET', label: '📶 İnternet' },
    { value: 'PARKLAMA', label: '🅿️ Parklama' },
    { value: 'ISITME', label: '🌡 İsitmə' },
    { value: 'GUVƏNLIK', label: '🔒 Güvənlik' },
    { value: 'HOVUZ', label: '🏊 Hovuz' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: 'uppercase', letterSpacing: '0.04em',
    marginBottom: 7, display: 'block',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: `1px solid ${C.borderMed}`,
    borderRadius: 9, fontSize: 13, color: C.navy,
    background: C.white, outline: 'none', boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
};

function PillBtn({ active, onClick, children, activeColor }: {
    active: boolean; onClick: () => void; children: React.ReactNode;
    activeColor?: 'gold' | 'navy' | 'orange';
}) {
    const bg = active
        ? activeColor === 'gold' ? GOLD_GRAD
        : activeColor === 'orange' ? C.orange
        : C.navy
        : C.white;
    return (
        <button
            onClick={onClick}
            style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all 0.15s',
                border: 'none',
                background: bg,
                backgroundSize: '200% 200%',
                color: active ? (activeColor === 'gold' ? '#0A0B0F' : '#FFF') : C.muted,
                boxShadow: active ? '0 2px 10px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                flexShrink: 0,
            }}
        >{children}</button>
    );
}

// ─── Portal (Home) ────────────────────────────────────────────────────────────

export function Portal() {
    const navigate = useNavigate();
    const [filtersOpen, setFiltersOpen] = React.useState(false);
    const curtainRef = React.useRef<HTMLDivElement>(null);

    // Filter state — local only, submitted via navigate
    const [search, setSearch] = React.useState('');
    const [type, setType] = React.useState('');
    const [availStatus, setAvailStatus] = React.useState('');
    const [district, setDistrict] = React.useState('');
    const [rooms, setRooms] = React.useState('');
    const [priceMin, setPriceMin] = React.useState('');
    const [priceMax, setPriceMax] = React.useState('');
    const [areaMin, setAreaMin] = React.useState('');
    const [areaMax, setAreaMax] = React.useState('');
    const [buildingType, setBuildingType] = React.useState('');
    const [amenities, setAmenities] = React.useState<string[]>([]);
    const [freeDate, setFreeDate] = React.useState('');

    const activeFilterCount = [type, availStatus, district, rooms, priceMin, priceMax, areaMin, areaMax, buildingType, freeDate]
        .filter(Boolean).length + amenities.length;

    // Lightweight count query for hero section
    const { data: countData } = useQuery({
        queryKey: ['portal-count'],
        queryFn: async () => {
            const res = await api.get('/listings?limit=1');
            return (res.data?.meta?.total ?? 0) as number;
        },
        staleTime: 5 * 60_000,
    });

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (type) params.set('type', type);
        if (availStatus) params.set('availStatus', availStatus);
        if (district) params.set('district', district);
        if (rooms) params.set('rooms', rooms);
        if (priceMin) params.set('priceMin', priceMin);
        if (priceMax) params.set('priceMax', priceMax);
        if (areaMin) params.set('areaMin', areaMin);
        if (areaMax) params.set('areaMax', areaMax);
        if (buildingType) params.set('buildingType', buildingType);
        if (amenities.length) params.set('amenities', amenities.join(','));
        if (freeDate) params.set('freeDate', freeDate);
        navigate(`/elanlar?${params.toString()}`);
    };

    const handleReset = () => {
        setSearch(''); setType(''); setAvailStatus(''); setDistrict('');
        setRooms(''); setPriceMin(''); setPriceMax(''); setAreaMin('');
        setAreaMax(''); setBuildingType(''); setAmenities([]); setFreeDate('');
    };

    const toggleAmenity = (val: string) =>
        setAmenities(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.cream }}>
            <PortalNavbar />

            {/* Hero */}
            <HeroSection total={countData ?? 0} />

            {/* ── Search section ─────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 60px' }}>
                <div style={{ width: '100%', maxWidth: 700 }}>

                    {/* Search bar */}
                    <form onSubmit={e => { e.preventDefault(); handleSearch(); }}>
                        <div style={{
                            display: 'flex', borderRadius: 16, overflow: 'hidden',
                            boxShadow: '0 6px 28px rgba(0,0,0,0.12)',
                            border: `1px solid ${C.borderMed}`,
                        }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: C.white, padding: '0 20px' }}>
                                <Search style={{ width: 18, height: 18, color: C.muted, flexShrink: 0 }} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Rayon, ünvan, əmlak növü..."
                                    style={{
                                        flex: 1, padding: '18px 0', fontSize: 15,
                                        border: 'none', outline: 'none',
                                        color: C.navy, background: 'transparent',
                                    }}
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0 }}
                                    >×</button>
                                )}
                            </div>
                            <button
                                type="submit"
                                style={{
                                    padding: '0 32px', background: C.navy, color: '#FFF',
                                    border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#252540'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.navy; }}
                            >
                                <Search style={{ width: 16, height: 16 }} />
                                Axtar
                            </button>
                        </div>
                    </form>

                    {/* Filter toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14, gap: 10 }}>
                        <button
                            onClick={() => setFiltersOpen(v => !v)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 18px', borderRadius: 24, fontSize: 13, fontWeight: 600,
                                background: filtersOpen ? C.navy : C.white,
                                color: filtersOpen ? '#FFF' : C.navy,
                                border: `1px solid ${filtersOpen ? C.navy : C.borderMed}`,
                                cursor: 'pointer', transition: 'all 0.15s',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                            }}
                        >
                            <SlidersHorizontal style={{ width: 13, height: 13 }} />
                            Ətraflı filterlər
                            {activeFilterCount > 0 && (
                                <span style={{
                                    background: C.orange, color: '#FFF', borderRadius: 10,
                                    padding: '1px 7px', fontSize: 11, fontWeight: 700,
                                }}>{activeFilterCount}</span>
                            )}
                            {filtersOpen
                                ? <ChevronUp style={{ width: 13, height: 13 }} />
                                : <ChevronDown style={{ width: 13, height: 13 }} />
                            }
                        </button>

                        {activeFilterCount > 0 && (
                            <button
                                onClick={handleReset}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '8px 14px', borderRadius: 24, fontSize: 12, fontWeight: 600,
                                    background: 'transparent', color: C.muted,
                                    border: `1px solid ${C.borderMed}`, cursor: 'pointer',
                                }}
                            >
                                <X style={{ width: 12, height: 12 }} /> Sıfırla
                            </button>
                        )}
                    </div>

                    {/* ── Filter curtain ──────────────────────────────────────────── */}
                    <div
                        ref={curtainRef}
                        style={{
                            maxHeight: filtersOpen ? 900 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    >
                        <div style={{
                            background: C.white, borderRadius: 18,
                            border: `1px solid ${C.borderMed}`,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                            padding: '28px 24px 20px',
                            marginTop: 12,
                            display: 'flex', flexDirection: 'column', gap: 22,
                        }}>

                            {/* Əmlak növü */}
                            <div>
                                <label style={labelStyle}>Əmlak növü</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {TYPE_TABS.map(t => (
                                        <PillBtn key={t.value} active={type === t.value} onClick={() => setType(t.value)} activeColor="gold">
                                            {t.label}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>

                            {/* Vəziyyət */}
                            <div>
                                <label style={labelStyle}>Mövcudluq vəziyyəti</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {AVAIL_TABS.map(t => (
                                        <PillBtn key={t.value} active={availStatus === t.value} onClick={() => setAvailStatus(t.value)} activeColor="navy">
                                            {t.label}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>

                            {/* District + Rooms + Area + Price */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14 }}>
                                <div>
                                    <label style={labelStyle}>Rayon</label>
                                    <select value={district} onChange={e => setDistrict(e.target.value)} style={selectStyle}>
                                        <option value="">Bütün rayonlar</option>
                                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Otaq sayı</label>
                                    <select value={rooms} onChange={e => setRooms(e.target.value)} style={selectStyle}>
                                        <option value="">Hamısı</option>
                                        {[1, 2, 3, 4, '5+'].map(n => <option key={n} value={String(n)}>{n} otaq</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Qiymət min (₼)</label>
                                    <input type="number" min={0} value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Qiymət max (₼)</label>
                                    <input type="number" min={0} value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="∞" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Sahə min (m²)</label>
                                    <input type="number" min={0} value={areaMin} onChange={e => setAreaMin(e.target.value)} placeholder="0" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Sahə max (m²)</label>
                                    <input type="number" min={0} value={areaMax} onChange={e => setAreaMax(e.target.value)} placeholder="∞" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Boşalma tarixi</label>
                                    <input
                                        type="date"
                                        value={freeDate}
                                        onChange={e => setFreeDate(e.target.value)}
                                        style={{ ...inputStyle, color: freeDate ? C.navy : C.muted }}
                                    />
                                </div>
                            </div>

                            {/* Tikili növü */}
                            <div>
                                <label style={labelStyle}>Tikili növü</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {BUILDING_TYPES.map(t => (
                                        <PillBtn key={t.value} active={buildingType === t.value} onClick={() => setBuildingType(t.value)} activeColor="orange">
                                            {t.label}
                                        </PillBtn>
                                    ))}
                                </div>
                            </div>

                            {/* Əlavə imkanlar */}
                            <div>
                                <label style={labelStyle}>Əlavə imkanlar</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {AMENITY_OPTIONS.map(a => {
                                        const active = amenities.includes(a.value);
                                        return (
                                            <button
                                                key={a.value}
                                                onClick={() => toggleAmenity(a.value)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 20, fontSize: 12,
                                                    fontWeight: active ? 700 : 400,
                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                    border: 'none',
                                                    background: active ? 'rgba(201,168,76,0.15)' : '#F5F5F3',
                                                    color: active ? C.gold : C.muted,
                                                    boxShadow: active ? `0 0 0 1.5px ${C.gold}` : 'none',
                                                }}
                                            >{a.label}</button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Action row */}
                            <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                                <button
                                    onClick={handleReset}
                                    style={{
                                        flex: '0 0 auto', padding: '11px 20px', borderRadius: 12,
                                        fontSize: 13, fontWeight: 600,
                                        background: 'transparent', color: C.muted,
                                        border: `1px solid ${C.borderMed}`, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}
                                >
                                    <X style={{ width: 13, height: 13 }} /> Sıfırla
                                </button>
                                <button
                                    onClick={handleSearch}
                                    style={{
                                        flex: 1, padding: '11px 0', borderRadius: 12,
                                        fontSize: 14, fontWeight: 700,
                                        background: GOLD_GRAD, backgroundSize: '200% 200%',
                                        color: '#0A0B0F', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                        boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
                                    }}
                                >
                                    <Search style={{ width: 15, height: 15 }} />
                                    Elanları göstər
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick action links */}
                    {!filtersOpen && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                            {[
                                { label: '🏠 Mənzillər', value: 'MENZIL' },
                                { label: '🏢 Ofislər', value: 'OFIS' },
                                { label: '✅ İndi boş', avail: 'BOSHDUR' },
                                { label: '🔥 Yüksək tələbat', heat: true },
                            ].map(item => (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (item.value) params.set('type', item.value);
                                        if (item.avail) params.set('availStatus', item.avail);
                                        navigate(`/elanlar?${params.toString()}`);
                                    }}
                                    style={{
                                        padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                                        background: C.white, color: C.navy, border: `1px solid ${C.borderMed}`,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                    }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.gold; (e.currentTarget as HTMLElement).style.color = C.gold; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.borderMed; (e.currentTarget as HTMLElement).style.color = C.navy; }}
                                >{item.label}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <PortalFooter />
        </div>
    );
}
