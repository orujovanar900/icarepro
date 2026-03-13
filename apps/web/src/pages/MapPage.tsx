import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { useListings } from '@/hooks/useListings';
import type { ListingCardData } from '@/hooks/useListings';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const AVAIL_COLORS: Record<string, string> = {
    BOSHDUR: '#22C55E',
    BOSHALIR: '#C9A84C',
    TUTULUB: '#9CA3AF',
};

const AVAIL_LABELS: Record<string, string> = {
    BOSHDUR: 'Boşdur',
    BOSHALIR: 'Boşalır',
    TUTULUB: 'Tutulub',
};

const GRADIENTS = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

const BAKU_CENTER: [number, number] = [40.4093, 49.8671];

const LEAFLET_ICON_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const LEAFLET_ICON_2X_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const LEAFLET_SHADOW_URL = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

// ─── Compact listing card ──────────────────────────────────────────────────────

interface CompactCardProps {
    listing: ListingCardData;
    selected: boolean;
    onClick: () => void;
}

function CompactCard({ listing, selected, onClick }: CompactCardProps) {
    const navigate = useNavigate();
    const color = AVAIL_COLORS[listing.availStatus] ?? '#9CA3AF';
    const gradBg = GRADIENTS[listing.id.charCodeAt(0) % GRADIENTS.length];

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                background: selected ? 'rgba(201,168,76,0.1)' : C.white,
                borderBottom: `1px solid ${C.border}`,
                cursor: 'pointer',
                transition: 'background 0.15s',
                borderLeft: selected ? `3px solid ${C.gold}` : '3px solid transparent',
            }}
        >
            <div style={{
                width: 56, height: 44, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: listing.photos.length === 0 ? gradBg : undefined,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {listing.photos.length > 0 ? (
                    <img src={listing.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <span style={{ fontSize: 18 }}>🏠</span>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {listing.title}
                </p>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: C.muted }}>{listing.district ?? listing.address}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}20`, borderRadius: 10, padding: '2px 8px' }}>
                        {AVAIL_LABELS[listing.availStatus] ?? listing.availStatus}
                    </span>
                    {listing.queueCount > 0 && (
                        <span style={{ fontSize: 11, color: C.muted }}>👥 {listing.queueCount}</span>
                    )}
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); navigate(`/elan/${listing.id}`); }}
                style={{
                    alignSelf: 'center', background: C.navy, color: '#FFF',
                    border: 'none', borderRadius: 6, padding: '4px 8px',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}
            >→</button>
        </div>
    );
}

// ─── Raw Leaflet map component ────────────────────────────────────────────────

interface LeafletMapProps {
    listings: ListingCardData[];
    selectedId: string | null;
    onSelectId: (id: string) => void;
}

function LeafletMap({ listings, selectedId, onSelectId }: LeafletMapProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<L.Map | null>(null);
    const markersRef = React.useRef<Map<string, L.Marker>>(new Map());

    // Init map once
    React.useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: BAKU_CENTER,
            zoom: 12,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markersRef.current.clear();
        };
    }, []);

    // Sync markers when listings change
    React.useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current.clear();

        // Add new markers for listings with coords
        listings.filter(l => l.lat != null && l.lng != null).forEach(l => {
            const color = AVAIL_COLORS[l.availStatus] ?? '#9CA3AF';
            const count = l.queueCount;
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid #FFF;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#FFF;font-size:11px;font-weight:700;cursor:pointer">${count > 0 ? count : ''}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -18],
            });

            const marker = L.marker([l.lat!, l.lng!], { icon });

            marker.bindPopup(`
                <div style="min-width:160px;font-family:system-ui,sans-serif">
                    <p style="margin:0 0 4px;font-weight:700;font-size:13px;color:#1A1A2E">${l.title}</p>
                    <p style="margin:0 0 8px;font-size:12px;color:#6B7280">${l.district ?? l.address}</p>
                    <a href="/elan/${l.id}" style="display:inline-block;background:#1A1A2E;color:#FFF;text-decoration:none;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:700">Ətraflı bax →</a>
                </div>
            `);

            marker.on('click', () => onSelectId(l.id));
            marker.addTo(map);
            markersRef.current.set(l.id, marker);
        });
    }, [listings]); // eslint-disable-line

    // FlyTo when selectedId changes
    React.useEffect(() => {
        const map = mapRef.current;
        if (!map || !selectedId) return;
        const l = listings.find(x => x.id === selectedId);
        if (l?.lat && l?.lng) {
            map.flyTo([l.lat, l.lng], 15, { duration: 0.8 });
        }
    }, [selectedId]); // eslint-disable-line

    return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MapPage() {
    const navigate = useNavigate();
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');

    const { listings, isLoading } = useListings();

    const filtered = React.useMemo(() => {
        if (!search.trim()) return listings;
        const q = search.toLowerCase();
        return listings.filter(l =>
            l.title.toLowerCase().includes(q) ||
            (l.district ?? '').toLowerCase().includes(q) ||
            l.address.toLowerCase().includes(q)
        );
    }, [listings, search]);

    const mappable = React.useMemo(() => listings.filter(l => l.lat != null && l.lng != null), [listings]);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <PortalNavbar />

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 64px)' }}>

                {/* ── Sidebar ── */}
                <div style={{
                    width: 320, flexShrink: 0, background: C.white,
                    borderRight: `1px solid ${C.border}`,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.navy }}>
                                Xəritədə elanlar
                            </h2>
                            <button
                                onClick={() => navigate('/')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 12, textDecoration: 'underline' }}
                            >← Siyahıya</button>
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Axtar..."
                            style={{
                                width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                                fontSize: 13, color: C.navy, outline: 'none', background: C.bg, boxSizing: 'border-box',
                            }}
                        />
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: C.muted }}>
                            {filtered.length} elan
                        </p>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} style={{ height: 64, background: '#F3F4F6', borderRadius: 8 }} />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 13 }}>
                                Elan tapılmadı
                            </div>
                        ) : (
                            filtered.map(l => (
                                <CompactCard
                                    key={l.id}
                                    listing={l}
                                    selected={selectedId === l.id}
                                    onClick={() => setSelectedId(prev => prev === l.id ? null : l.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Map ── */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <LeafletMap
                        listings={mappable}
                        selectedId={selectedId}
                        onSelectId={setSelectedId}
                    />

                    {/* Legend */}
                    <div style={{
                        position: 'absolute', bottom: 20, left: 20, zIndex: 999,
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: 12, padding: '10px 14px',
                        border: `1px solid ${C.border}`,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', gap: 6,
                        pointerEvents: 'none',
                    }}>
                        {[
                            { color: '#22C55E', label: 'Boşdur' },
                            { color: '#C9A84C', label: 'Boşalır' },
                            { color: '#9CA3AF', label: 'Tutulub' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 14, height: 14, borderRadius: '50%', background: item.color, border: '2px solid #FFF', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                                <span style={{ fontSize: 12, color: C.navy, fontWeight: 500 }}>{item.label}</span>
                            </div>
                        ))}
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                            🔢 Rəqəm — növbəçi sayı
                        </p>
                    </div>

                    {/* No coords overlay */}
                    {!isLoading && mappable.length === 0 && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            zIndex: 999, background: 'rgba(255,255,255,0.95)', borderRadius: 16,
                            padding: '24px 32px', textAlign: 'center', border: `1px solid ${C.border}`,
                            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                        }}>
                            <p style={{ fontSize: 32, marginBottom: 8 }}>📍</p>
                            <p style={{ fontSize: 14, color: C.navy, fontWeight: 600, marginBottom: 4 }}>Xəritə koordinatları yoxdur</p>
                            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Elanların yeri hələ qeyd edilməyib.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
