import * as React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, Map as MapIcon, ChevronDown } from 'lucide-react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { LedTicker } from '@/components/portal/LedTicker';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { ListingCard } from '@/components/portal/ListingCard';
import { FilterModal } from '@/components/portal/FilterPanel';
import { useListings } from '@/hooks/useListings';
import type { ListingCardData } from '@/hooks/useListings';
import { api } from '@/lib/api';

const GoogleMapView = React.lazy(() =>
    import('@/components/portal/GoogleMapView').then(m => ({ default: m.GoogleMapView }))
);

// ─── Google Maps ──────────────────────────────────────────────────────────────

const MAPS_API_KEY = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string;
const MAPS_LIBRARIES: ('visualization')[] = ['visualization'];

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    cream: '#F5F0E8',
    listBg: '#F8F8F6',
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

const DISTRICTS = [
    'Binəqədi', 'Nəsimi', 'Sabunçu', 'Suraxanı', 'Xətai',
    'Nizami', 'Yasamal', 'Nərimanov', 'Nişanqah', 'Pirəkəşkül',
    'Abşeron', 'Qaradağ', 'Sabail', 'Xəzər',
];

const SORT_OPTIONS = [
    { value: 'default', label: 'Tövsiyə edilən' },
    { value: 'price_asc', label: 'Qiymət ↑' },
    { value: 'price_desc', label: 'Qiymət ↓' },
    { value: 'newest', label: 'Ən yeni' },
    { value: 'queue_desc', label: 'Ən çox növbəli' },
];

const BUILDING_TYPE_OPTS = [
    { value: '', label: 'Tikili: Hamısı' },
    { value: 'YENI_TIKILI', label: '🏗 Yeni tikili' },
    { value: 'KOHNE_TIKILI', label: '🏚 Köhnə tikili' },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function ListingCardSkeleton() {
    return (
        <div style={{
            borderRadius: 16, overflow: 'hidden',
            background: C.white, border: `1px solid ${C.border}`,
        }}>
            <div style={{ height: 180, background: '#EEECE8' }} />
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ height: 13, width: '70%', background: '#EEECE8', borderRadius: 5 }} />
                <div style={{ height: 11, width: '50%', background: '#EEECE8', borderRadius: 5 }} />
                <div style={{ height: 30, background: '#EEECE8', borderRadius: 8, marginTop: 4 }} />
            </div>
        </div>
    );
}


// ─── Main SearchResults ───────────────────────────────────────────────────────

export function SearchResults() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {
        listings, total, totalPages, isLoading, isFetching,
        filters, page, setPage, updateFilter, updateFilters, resetFilters, hasActiveFilters,
    } = useListings();

    const [focusedId, setFocusedId] = React.useState<string | null>(null);
    const [mapVisible, setMapVisible] = React.useState(true);
    const [queueListingId, setQueueListingId] = React.useState<string | null>(null);

    const [showFilterModal, setShowFilterModal] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);
    React.useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Count active advanced filters for badge
    const advancedFilterCount = [
        filters.buildingType, filters.renovation, filters.floorMin, filters.floorMax,
        filters.metro, filters.landmark,
    ].filter(Boolean).length
        + filters.districts.length
        + filters.amenities.length
        + (filters.notFirstFloor ? 1 : 0)
        + (filters.notTopFloor ? 1 : 0);

    // Map listings query — same filters, limit 200 for full heatmap coverage
    const mapQueryString = React.useMemo(() => {
        const p = new URLSearchParams(searchParams);
        p.set('limit', '200');
        p.set('page', '1');
        return p.toString();
    }, [searchParams]);

    const { data: mapListings } = useQuery({
        queryKey: ['listings-map', mapQueryString],
        queryFn: async () => {
            const res = await api.get(`/listings?${mapQueryString}`);
            return (res.data?.data ?? []) as ListingCardData[];
        },
        staleTime: 60_000,
    });

    const activeSearch = filters.search;

    const handleClearSearch = () => {
        updateFilter('search', '');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.listBg }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                <PortalNavbar />
                <LedTicker placement="PORTAL_MAIN" />
            </div>

            {/* ═══ STICKY FILTER BAR ══════════════════════════════════════════ */}
            <div
                style={{
                    position: 'sticky', top: 102, zIndex: 40,  /* below navbar (64px) + ticker (38px) */
                    background: C.white,
                    borderBottom: `1px solid ${C.border}`,
                    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                }}
            >
                <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 20px' }}>

                    {/* Row 1: type pills + search chip + count + sort */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '10px 0 6px',
                        overflowX: 'auto',
                    }}>
                        {/* Mobile: Sort FIRST for visibility */}
                        {isMobile && (
                            <>
                                <select
                                    value={filters.sort}
                                    onChange={e => updateFilter('sort', e.target.value)}
                                    style={{ padding: '5px 8px', fontSize: 12, borderRadius: 8, border: `1px solid ${C.borderMed}`, background: C.white, color: C.navy, outline: 'none', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                                <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
                            </>
                        )}

                        {/* Type pills */}
                        {TYPE_TABS.map(t => {
                            const active = filters.type === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => updateFilter('type', t.value)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 18, fontSize: 12,
                                        fontWeight: active ? 700 : 500,
                                        border: 'none', cursor: 'pointer',
                                        background: active ? GOLD_GRAD : '#F2F0EC',
                                        backgroundSize: '200% 200%',
                                        color: active ? '#0A0B0F' : C.muted,
                                        flexShrink: 0, whiteSpace: 'nowrap',
                                        transition: 'all 0.15s',
                                    }}
                                >{t.label}</button>
                            );
                        })}

                        <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0, margin: '0 4px' }} />

                        {/* Avail status */}
                        {AVAIL_TABS.filter(t => t.value).map(t => {
                            const active = filters.availStatus === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => updateFilter('availStatus', active ? '' : t.value)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 18, fontSize: 12,
                                        fontWeight: active ? 700 : 500,
                                        border: 'none', cursor: 'pointer',
                                        background: active ? C.navy : '#F2F0EC',
                                        color: active ? '#FFF' : C.muted,
                                        flexShrink: 0, whiteSpace: 'nowrap',
                                        transition: 'all 0.15s',
                                    }}
                                >{t.label}</button>
                            );
                        })}

                        {/* Spacer */}
                        <div style={{ flex: 1, minWidth: 12 }} />

                        {/* Count badge */}
                        <span style={{
                            fontSize: 12, color: C.muted, whiteSpace: 'nowrap', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                            {isFetching && !isLoading && <RefreshCw style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />}
                            <strong style={{ color: C.navy }}>{isLoading ? '...' : total}</strong>&nbsp;elan
                        </span>

                        {/* Sort — desktop only */}
                        {!isMobile && (
                            <select
                                value={filters.sort}
                                onChange={e => updateFilter('sort', e.target.value)}
                                style={{ padding: '5px 8px', fontSize: 12, borderRadius: 8, border: `1px solid ${C.borderMed}`, background: C.white, color: C.navy, outline: 'none', cursor: 'pointer', flexShrink: 0 }}
                            >
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        )}

                        {/* ⚙️ Filtrlər button — opens FilterModal */}
                        <button
                            onClick={() => setShowFilterModal(true)}
                            style={{
                                padding: '5px 12px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: advancedFilterCount > 0 ? C.gold : '#F2F0EC',
                                color: advancedFilterCount > 0 ? '#0A0B0F' : C.muted,
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                                transition: 'all 0.15s',
                            }}
                        >
                            ⚙️ Filtrlər
                            {advancedFilterCount > 0 && (
                                <span style={{
                                    background: C.navy, color: '#fff',
                                    borderRadius: '50%', width: 18, height: 18,
                                    fontSize: 11, display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    marginLeft: 2, fontWeight: 800, flexShrink: 0,
                                }}>{advancedFilterCount}</span>
                            )}
                        </button>

                        {/* Map toggle — hidden on mobile */}
                        <button
                            onClick={() => setMapVisible(v => !v)}
                            style={{
                                padding: '5px 12px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: mapVisible ? C.navy : '#F2F0EC',
                                color: mapVisible ? '#FFF' : C.muted,
                                flexShrink: 0, display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 5,
                            }}
                        >
                            <MapIcon style={{ width: 12, height: 12 }} />
                            {mapVisible ? 'Xəritəni gizlət' : 'Xəritə'}
                        </button>

                    </div>
                </div>
            </div>

            {/* ═══ CONTENT: GRID + MAP ════════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', maxWidth: 1440, margin: '0 auto', width: '100%' }}>

                {/* Left: listing grid */}
                <div style={{ flex: 1, padding: '20px 20px 40px', minWidth: 0 }}>
                    {isLoading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: mapVisible ? 'repeat(auto-fill, minmax(240px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)}
                        </div>
                    ) : listings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '80px 20px', color: C.muted }}>
                            <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
                            <p style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Elan tapılmadı</p>
                            <p style={{ fontSize: 14, marginBottom: 20 }}>Filtrləri dəyişdirin və ya sıfırlayın</p>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    style={{
                                        padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                                        background: GOLD_GRAD, backgroundSize: '200% 200%',
                                        color: '#0A0B0F', border: 'none', cursor: 'pointer',
                                    }}
                                >Filtrləri sıfırla</button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: mapVisible
                                    ? 'repeat(auto-fill, minmax(240px, 1fr))'
                                    : 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 16,
                            }}>
                                {listings.map((listing, i) => (
                                    <div
                                        key={listing.id}
                                        onMouseEnter={() => setFocusedId(listing.id)}
                                        onMouseLeave={() => setFocusedId(null)}
                                        style={{ outline: focusedId === listing.id ? `2px solid ${C.gold}` : 'none', borderRadius: 16 }}
                                    >
                                        <ListingCard listing={listing} index={i} />
                                    </div>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                        style={{
                                            padding: '9px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                            background: C.white, color: C.muted, border: `1px solid ${C.border}`,
                                            cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1,
                                        }}
                                    >← Əvvəlki</button>
                                    <span style={{ fontSize: 13, color: C.muted }}>{page} / {totalPages}</span>
                                    <button
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        style={{
                                            padding: '9px 22px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                            background: C.white, color: C.muted, border: `1px solid ${C.border}`,
                                            cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1,
                                        }}
                                    >Növbəti →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right: sticky map panel — hidden on mobile */}
                <div style={{
                    display: isMobile ? 'none' : 'block',
                    width: mapVisible ? 400 : 0,
                    flexShrink: 0,
                    position: 'sticky',
                    top: 'calc(102px + 108px)',
                    height: 'calc(100vh - 102px - 108px)',
                    alignSelf: 'flex-start',
                    borderLeft: mapVisible ? `1px solid ${C.border}` : 'none',
                    background: '#f5f1eb',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'width 0.2s ease',
                }}>
                    <APIProvider
                        apiKey={MAPS_API_KEY}
                        libraries={MAPS_LIBRARIES}
                    >
                        <React.Suspense fallback={
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
                                Xəritə yüklənir...
                            </div>
                        }>
                            <GoogleMapView
                                listings={mapListings ?? []}
                                onQueueClick={l => setQueueListingId(l.id)}
                            />
                        </React.Suspense>
                    </APIProvider>
                </div>
            </div>

            <PortalFooter />

            {/* FilterModal — advanced filters */}
            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                title="Ətraflı filterlər"
                filters={filters}
                onChange={(updated) => updateFilters(updated)}
                onApply={() => setShowFilterModal(false)}
                onReset={() => { resetFilters(); setShowFilterModal(false); }}
                listingCount={total}
            />
        </div>
    );
}
