import * as React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { ListingCard } from '@/components/portal/ListingCard';
import { useListings } from '@/hooks/useListings';
import type { ListingCardData } from '@/hooks/useListings';
import { api } from '@/lib/api';

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
const BAKU_CENTER: [number, number] = [40.4093, 49.8671];

// Heat level → map color
const HEAT_COLORS: Record<string, string> = {
    AZ: '#22C55E',
    ORTA: '#F59E0B',
    YUKSEK: '#EF4444',
};
const HEAT_FILL_OPACITY: Record<string, number> = {
    AZ: 0.12,
    ORTA: 0.20,
    YUKSEK: 0.28,
};

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

// ─── Heatmap Leaflet component ────────────────────────────────────────────────

interface HeatMapProps {
    listings: ListingCardData[];
    focusedId: string | null;
    onMarkerClick: (id: string) => void;
}

function HeatMap({ listings, focusedId, onMarkerClick }: HeatMapProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<L.Map | null>(null);
    const layerRef = React.useRef<L.LayerGroup | null>(null);
    const markerMapRef = React.useRef<Record<string, L.Marker>>({});

    // Init map once
    React.useEffect(() => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
            center: BAKU_CENTER,
            zoom: 12,
            scrollWheelZoom: true,
            zoomControl: true,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        return () => {
            map.remove();
            mapRef.current = null;
            layerRef.current = null;
            markerMapRef.current = {};
        };
    }, []);

    // Update markers when listings change
    React.useEffect(() => {
        if (!mapRef.current || !layerRef.current) return;
        layerRef.current.clearLayers();
        markerMapRef.current = {};

        listings.forEach(listing => {
            if (!listing.lat || !listing.lng) return;
            const heat = listing.heatLevel || 'AZ';
            const color = HEAT_COLORS[heat] ?? '#9CA3AF';
            const fillOpacity = HEAT_FILL_OPACITY[heat] ?? 0.12;

            // Heatmap glow circle
            L.circle([listing.lat, listing.lng], {
                radius: 180,
                fillColor: color,
                fillOpacity,
                color: color,
                weight: 0,
            }).addTo(layerRef.current!);

            // Div marker
            const qLabel = listing.queueCount > 0 ? String(listing.queueCount) : '';
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2.5px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:#FFF;font-size:10px;font-weight:700;line-height:1">${qLabel}</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });

            const marker = L.marker([listing.lat, listing.lng], { icon });
            marker.bindPopup(`
                <div style="min-width:190px;font-family:system-ui,sans-serif;padding:2px 0">
                    <p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#1A1A2E">${listing.title}</p>
                    <p style="font-size:12px;color:#6B7280;margin:0 0 6px">${[listing.district, listing.address].filter(Boolean).join(' · ')}</p>
                    <p style="font-size:13px;font-weight:700;color:#C9A84C;margin:0 0 10px">${listing.basePrice ? listing.basePrice.toLocaleString() + ' AZN/ay' : '—'}</p>
                    <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
                        <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${color}22;color:${color};font-weight:600">${heat === 'YUKSEK' ? '🔥 Yüksək' : heat === 'ORTA' ? '🌡 Orta' : '🟢 Az'} tələbat</span>
                        ${listing.queueCount > 0 ? `<span style="font-size:11px;color:#6B7280">${listing.queueCount} növbəçi</span>` : ''}
                    </div>
                    <a href="/elan/${listing.id}" style="display:block;text-align:center;padding:7px 12px;background:#1A1A2E;color:#FFF;border-radius:9px;text-decoration:none;font-size:12px;font-weight:600">Ətraflı bax →</a>
                </div>
            `, { maxWidth: 220 });
            marker.on('click', () => onMarkerClick(listing.id));
            marker.addTo(layerRef.current!);
            markerMapRef.current[listing.id] = marker;
        });
    }, [listings]); // eslint-disable-line

    // Fly to focused listing
    React.useEffect(() => {
        if (!mapRef.current || !focusedId) return;
        const listing = listings.find(l => l.id === focusedId);
        if (listing?.lat && listing?.lng) {
            mapRef.current.flyTo([listing.lat, listing.lng], 16, { duration: 0.8, easeLinearity: 0.5 });
            const marker = markerMapRef.current[focusedId];
            if (marker) marker.openPopup();
        }
    }, [focusedId]); // eslint-disable-line

    return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

// ─── Map Legend ───────────────────────────────────────────────────────────────

function MapLegend() {
    return (
        <div style={{
            position: 'absolute', bottom: 20, left: 12, zIndex: 999,
            background: 'rgba(255,255,255,0.95)', borderRadius: 12,
            padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            border: '1px solid rgba(0,0,0,0.07)',
            backdropFilter: 'blur(8px)',
        }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tələbat
            </p>
            {[
                { color: '#22C55E', label: 'Az tələbat' },
                { color: '#F59E0B', label: 'Orta tələbat' },
                { color: '#EF4444', label: 'Yüksək tələbat' },
            ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.navy }}>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Main SearchResults ───────────────────────────────────────────────────────

export function SearchResults() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {
        listings, total, totalPages, isLoading, isFetching,
        filters, page, setPage, updateFilter, resetFilters, hasActiveFilters,
    } = useListings();

    const [focusedId, setFocusedId] = React.useState<string | null>(null);
    const [mapVisible, setMapVisible] = React.useState(true);

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

    const selectStyle: React.CSSProperties = {
        padding: '6px 10px', fontSize: 12, borderRadius: 8,
        border: `1px solid ${C.borderMed}`, background: C.white,
        color: C.navy, outline: 'none', cursor: 'pointer',
        appearance: 'none' as const,
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.listBg }}>
            <PortalNavbar />

            {/* ═══ STICKY FILTER BAR ══════════════════════════════════════════ */}
            <div
                style={{
                    position: 'sticky', top: 64, zIndex: 40,  /* below navbar (64px) */
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

                        {/* Sort */}
                        <select
                            value={filters.sort}
                            onChange={e => updateFilter('sort', e.target.value)}
                            style={{ ...selectStyle, flexShrink: 0 }}
                        >
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        {/* Map toggle */}
                        <button
                            onClick={() => setMapVisible(v => !v)}
                            style={{
                                padding: '5px 12px', borderRadius: 18, fontSize: 12, fontWeight: 600,
                                border: 'none', cursor: 'pointer',
                                background: mapVisible ? C.navy : '#F2F0EC',
                                color: mapVisible ? '#FFF' : C.muted,
                                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                            }}
                        >
                            <MapIcon style={{ width: 12, height: 12 }} />
                            {mapVisible ? 'Xəritəni gizlət' : 'Xəritə'}
                        </button>
                    </div>

                    {/* Row 2: secondary filters */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 0 10px',
                        flexWrap: 'wrap',
                    }}>
                        {/* Active search chip */}
                        {activeSearch && (
                            <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 16,
                                background: 'rgba(26,26,46,0.08)', color: C.navy,
                                fontSize: 12, fontWeight: 600,
                            }}>
                                🔍 {activeSearch}
                                <button onClick={handleClearSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0, lineHeight: 1, fontSize: 15 }}>×</button>
                            </div>
                        )}

                        {/* District */}
                        <select
                            value={filters.district}
                            onChange={e => updateFilter('district', e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">📍 Bütün rayonlar</option>
                            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        {/* Rooms */}
                        <select
                            value={filters.rooms}
                            onChange={e => updateFilter('rooms', e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">🚪 Otaq sayı</option>
                            {[1, 2, 3, 4, '5+'].map(n => <option key={n} value={String(n)}>{n} otaq</option>)}
                        </select>

                        {/* Building type */}
                        <select
                            value={filters.buildingType}
                            onChange={e => updateFilter('buildingType', e.target.value)}
                            style={selectStyle}
                        >
                            {BUILDING_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>

                        {/* Price range */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                type="number" min={0} value={filters.priceMin}
                                onChange={e => updateFilter('priceMin', e.target.value)}
                                placeholder="₼ min"
                                style={{
                                    width: 72, padding: '5px 8px', fontSize: 12,
                                    border: `1px solid ${C.borderMed}`, borderRadius: 8,
                                    outline: 'none', color: C.navy, background: C.white,
                                }}
                            />
                            <span style={{ fontSize: 11, color: C.muted }}>—</span>
                            <input
                                type="number" min={0} value={filters.priceMax}
                                onChange={e => updateFilter('priceMax', e.target.value)}
                                placeholder="₼ max"
                                style={{
                                    width: 72, padding: '5px 8px', fontSize: 12,
                                    border: `1px solid ${C.borderMed}`, borderRadius: 8,
                                    outline: 'none', color: C.navy, background: C.white,
                                }}
                            />
                        </div>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                                    background: 'transparent', color: C.muted,
                                    border: `1px solid ${C.borderMed}`, cursor: 'pointer',
                                }}
                            >
                                <X style={{ width: 11, height: 11 }} /> Sıfırla
                            </button>
                        )}

                        {/* Back to home */}
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                                background: 'transparent', color: C.muted,
                                border: `1px solid ${C.border}`, cursor: 'pointer',
                            }}
                        >
                            ← Ana səhifə
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

                {/* Right: sticky map panel */}
                {mapVisible && (
                    <div style={{
                        width: 400,
                        flexShrink: 0,
                        position: 'sticky',
                        top: 'calc(64px + 108px)',  /* navbar + filter bar */
                        height: 'calc(100vh - 64px - 108px)',
                        alignSelf: 'flex-start',
                        borderLeft: `1px solid ${C.border}`,
                        background: '#E8E6E0',
                    }}>
                        {/* Map wrapper */}
                        <div style={{ position: 'relative', height: '100%' }}>
                            <HeatMap
                                listings={mapListings ?? []}
                                focusedId={focusedId}
                                onMarkerClick={id => setFocusedId(prev => prev === id ? null : id)}
                            />
                            <MapLegend />

                            {/* Map header */}
                            <div style={{
                                position: 'absolute', top: 10, left: 0, right: 0, zIndex: 999,
                                display: 'flex', justifyContent: 'center',
                            }}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.92)', borderRadius: 20,
                                    padding: '5px 14px', fontSize: 11, fontWeight: 600, color: C.muted,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                    🗺 {(mapListings ?? []).filter(l => l.lat && l.lng).length} nöqtə xəritədə
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PortalFooter />
        </div>
    );
}
