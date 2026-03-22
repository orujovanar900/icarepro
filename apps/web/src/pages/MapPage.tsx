import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';

import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { LedTicker } from '@/components/portal/LedTicker';
import { useListings } from '@/hooks/useListings';
import type { ListingCardData } from '@/hooks/useListings';

const GoogleMapView = React.lazy(() =>
    import('@/components/portal/GoogleMapView').then(m => ({ default: m.GoogleMapView }))
);

// ─── Google Maps ──────────────────────────────────────────────────────────────

const MAPS_API_KEY = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string;
const MAPS_LIBRARIES: ('visualization')[] = ['visualization'];

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


// ─── Main page ────────────────────────────────────────────────────────────────

export function MapPage() {
    const navigate = useNavigate();
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState('');
    const [queueListingId, setQueueListingId] = React.useState<string | null>(null);

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

    console.log('[MapPage] API Key Check:', MAPS_API_KEY ? `${MAPS_API_KEY.substring(0, 5)}... (Length: ${MAPS_API_KEY.length})` : 'UNDEFINED');

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                <PortalNavbar />
                <LedTicker placement="PORTAL_MAIN" />
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: 'calc(100vh - 102px)' }}>

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
                <div style={{ flex: 1, position: 'relative', height: '100%', minHeight: 0 }}>
                    {!MAPS_API_KEY ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', color: C.muted, textAlign: 'center', padding: 32 }}>
                            <p style={{ fontSize: 48, marginBottom: 16 }}>🗺️</p>
                            <h3 style={{ margin: '0 0 8px', color: C.navy, fontSize: 18 }}>Xəritə xidməti hazırda əlçatmazdır</h3>
                            <p style={{ margin: 0, fontSize: 14 }}>Google Maps API açarı sistemə daxil edilməyib. Zəhmət olmasa inzibatçıya məlumat verin.</p>
                        </div>
                    ) : (
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
                                    listings={mappable}
                                    onQueueClick={l => setQueueListingId(l.id)}
                                />
                            </React.Suspense>
                        </APIProvider>
                    )}

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
