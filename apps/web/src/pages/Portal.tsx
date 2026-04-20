import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { LedTicker } from '@/components/portal/LedTicker';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { HeroSection } from '@/components/portal/HeroSection';
import { FilterModal } from '@/components/portal/FilterPanel';
import { RoommateCard, type RoommateAdCardData } from '@/components/portal/RoommateCard';
import type { ListingFilters } from '@/hooks/useListings';
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

// Values must match ListingType enum in schema.prisma
const TYPE_TABS = [
    { value: '',          label: 'Hamısı' },
    { value: 'MENZIL',   label: '🏠 Mənzil' },
    { value: 'OFIS',     label: '🏢 Ofis' },
    { value: 'OBYEKT',   label: '🏪 Obyekt' },
    { value: 'HEYET_EVI',label: '🏡 Həyət Evi / Bağ Evi' },
    { value: 'GARAJ',    label: '🚗 Qaraj' },
    { value: 'TORPAQ',   label: '🌿 Torpaq' },
    { value: 'ANBAR',    label: '📦 Anbar' },
];

// Values must match Listing.availStatus in schema.prisma: BOSHDUR | BOSHALIR | INSAAT
const AVAIL_TABS = [
    { value: '',        label: 'Hamısı' },
    { value: 'BOSHDUR', label: '✅ Boşdur' },
    { value: 'BOSHALIR',label: '📅 Tezliklə boşalır' },
    { value: 'INSAAT',  label: '🏗 İnşaat/Təmir' },
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
    const [showFilterPanel, setShowFilterPanel] = React.useState(false);
    const [mode, setMode] = React.useState<'icare' | 'yoldash'>('icare');

    // Search state (simple text, submitted on Enter/button)
    const [search, setSearch] = React.useState('');

    // Yoldaş preview (home mode)
    const yoldashPreview = useQuery({
        queryKey: ['yoldash-preview'],
        queryFn: async () => {
            const res = await api.get('/yoldash?limit=6');
            return res.data as { data: RoommateAdCardData[]; meta: { total: number } };
        },
        enabled: mode === 'yoldash',
    });

    // Advanced filter state — lives here, passed to FilterModal
    const [panelFilters, setPanelFilters] = React.useState<ListingFilters>({
        search: '',
        type: '',
        buildingType: '',
        renovation: '',
        district: '',
        districts: [],
        rooms: '',
        areaMin: '',
        areaMax: '',
        priceMin: '',
        priceMax: '',
        floorMin: '',
        floorMax: '',
        notFirstFloor: false,
        notTopFloor: false,
        freeDate: '',
        availStatus: '',
        amenities: [],
        metro: '',
        landmark: '',
        sort: 'default',
    });

    const activeFilterCount = [
        panelFilters.type, panelFilters.buildingType, panelFilters.renovation,
        panelFilters.district, panelFilters.rooms,
        panelFilters.priceMin, panelFilters.priceMax,
        panelFilters.areaMin, panelFilters.areaMax,
        panelFilters.floorMin, panelFilters.floorMax,
        panelFilters.freeDate, panelFilters.availStatus,
        panelFilters.metro, panelFilters.landmark,
    ].filter(Boolean).length
        + panelFilters.amenities.length
        + panelFilters.districts.length
        + (panelFilters.notFirstFloor ? 1 : 0)
        + (panelFilters.notTopFloor ? 1 : 0);

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
        // Merge panelFilters into URL params
        if (panelFilters.type) params.set('type', panelFilters.type);
        if (panelFilters.availStatus) params.set('availStatus', panelFilters.availStatus);
        if (panelFilters.districts.length > 0) {
            params.set('districts', panelFilters.districts.join(','));
        } else if (panelFilters.district) {
            params.set('district', panelFilters.district);
        }
        if (panelFilters.rooms) params.set('rooms', panelFilters.rooms);
        if (panelFilters.priceMin) params.set('priceMin', panelFilters.priceMin);
        if (panelFilters.priceMax) params.set('priceMax', panelFilters.priceMax);
        if (panelFilters.areaMin) params.set('areaMin', panelFilters.areaMin);
        if (panelFilters.areaMax) params.set('areaMax', panelFilters.areaMax);
        if (panelFilters.buildingType) params.set('buildingType', panelFilters.buildingType);
        if (panelFilters.renovation) params.set('renovation', panelFilters.renovation);
        if (panelFilters.floorMin) params.set('floorMin', panelFilters.floorMin);
        if (panelFilters.floorMax) params.set('floorMax', panelFilters.floorMax);
        if (panelFilters.notFirstFloor) params.set('notFirstFloor', 'true');
        if (panelFilters.notTopFloor) params.set('notTopFloor', 'true');
        if (panelFilters.metro) params.set('metro', panelFilters.metro);
        if (panelFilters.landmark) params.set('landmark', panelFilters.landmark);
        if (panelFilters.amenities.length) params.set('amenities', panelFilters.amenities.join(','));
        navigate(`/elanlar?${params.toString()}`);
    };

    const handleReset = () => {
        setPanelFilters(prev => ({
            ...prev,
            type: '', buildingType: '', renovation: '', district: '', districts: [],
            rooms: '', priceMin: '', priceMax: '', areaMin: '', areaMax: '',
            floorMin: '', floorMax: '', notFirstFloor: false, notTopFloor: false,
            freeDate: '', availStatus: '', amenities: [], metro: '', landmark: '',
        }));
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.cream }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                <PortalNavbar />
                <LedTicker placement="PORTAL_MAIN" />
            </div>

            {/* Hero */}
            <HeroSection total={countData ?? 0} />

            {/* ── Mode toggle: İcarə | Yoldaş ──────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 20px 0' }}>
                <div style={{
                    display: 'inline-flex', background: C.white, borderRadius: 14,
                    padding: 4, border: `1px solid ${C.borderMed}`,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                }}>
                    {[
                        { v: 'icare', label: '🏠 Növbəli İcarə' },
                        { v: 'yoldash', label: '🤝 Yoldaş' },
                    ].map(t => {
                        const active = mode === t.v;
                        return (
                            <button
                                key={t.v}
                                type="button"
                                onClick={() => setMode(t.v as 'icare' | 'yoldash')}
                                style={{
                                    padding: '9px 20px', borderRadius: 10,
                                    background: active ? GOLD_GRAD : 'transparent',
                                    color: active ? '#0A0B0F' : C.navy,
                                    border: 'none', cursor: 'pointer',
                                    fontSize: 14, fontWeight: active ? 700 : 600,
                                    transition: 'all 0.15s',
                                }}
                            >{t.label}</button>
                        );
                    })}
                </div>
            </div>

            {/* ── Yoldaş inline preview ─────────────────────────────────────── */}
            {mode === 'yoldash' && (
                <div style={{ flex: 1, padding: '24px 20px 60px' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.navy }}>
                                Kirayə xərclərini bölüşmək üçün yoldaş tap
                            </h2>
                            <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted }}>
                                Etibarlı, təsdiqlənmiş profillər. Birbaşa əlaqə.
                            </p>
                        </div>

                        {yoldashPreview.isLoading ? (
                            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ height: 280, background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, opacity: 0.6 }} />
                                ))}
                            </div>
                        ) : (yoldashPreview.data?.data.length ?? 0) === 0 ? (
                            <div style={{ background: C.white, borderRadius: 16, padding: '40px 20px', textAlign: 'center', border: `1px solid ${C.border}` }}>
                                <p style={{ fontSize: 36, margin: '0 0 8px' }}>🤝</p>
                                <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
                                    Hələ elan yoxdur. İlk olaraq öz elanınızı verin.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                                {yoldashPreview.data?.data.slice(0, 6).map(ad => <RoommateCard key={ad.id} ad={ad} />)}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => navigate('/yoldas')}
                                style={{
                                    padding: '12px 24px', borderRadius: 12,
                                    background: C.navy, color: '#FFF',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: 14,
                                }}
                            >Bütün Yoldaş elanlarına bax</button>
                            <button
                                onClick={() => navigate('/yoldas/yeni')}
                                style={{
                                    padding: '12px 24px', borderRadius: 12,
                                    background: GOLD_GRAD, color: '#0A0B0F',
                                    border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: 14,
                                }}
                            >＋ Yoldaş elanı ver</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Search section ─────────────────────────────────────────────── */}
            {mode === 'icare' && (
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
                            onClick={() => setShowFilterPanel(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '8px 18px', borderRadius: 24, fontSize: 13, fontWeight: 600,
                                background: C.white, color: C.navy,
                                border: `1px solid ${C.borderMed}`,
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

                    {/* FilterModal */}
                    <FilterModal
                        isOpen={showFilterPanel}
                        onClose={() => setShowFilterPanel(false)}
                        filters={panelFilters}
                        onChange={setPanelFilters}
                        onApply={() => { setShowFilterPanel(false); handleSearch(); }}
                        onReset={handleReset}
                    />

                    {/* Quick action links */}
                    {(
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
            )}

            <PortalFooter />
        </div>
    );
}
