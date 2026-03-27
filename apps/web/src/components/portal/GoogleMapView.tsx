import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Map,
    AdvancedMarker,
    InfoWindow,
    useMap,
    useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { ListingCardData } from '@/hooks/useListings';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ListingCardData as Listing };

export interface GoogleMapViewProps {
    listings: ListingCardData[];
    onQueueClick: (listing: ListingCardData) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    white: '#FFFFFF',
    muted: '#6B7280',
    border: 'rgba(0,0,0,0.08)',
};

function markerColor(listing: ListingCardData): string {
    if (listing.availStatus === 'BOSHDUR') return '#22C55E';
    if (listing.availStatus === 'BOSHALIR') return '#E8620A';
    return '#6B7280';
}

function heatLabel(level: string): string {
    if (level === 'YUKSEK') return 'Yüksək';
    if (level === 'ORTA') return 'Orta';
    return 'Az';
}

// Styling controlled via Google Cloud Console (mapId: d19f791f5e30ebc0e5787f51)

// ─── Cluster bubble ───────────────────────────────────────────────────────────

interface ClusterMarkerProps {
    position: google.maps.LatLngLiteral;
    count: number;
    onClick: () => void;
}

function ClusterMarker({ position, count, onClick }: ClusterMarkerProps) {
    return (
        <AdvancedMarker position={position} onClick={onClick}>
            <div
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: C.navy,
                    border: `3px solid ${C.white}`,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: C.white,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                }}
            >
                {count}
            </div>
        </AdvancedMarker>
    );
}

// ─── Heatmap layer (uses google.maps.visualization) ──────────────────────────

type HeatMode = 'queue' | 'price';

interface HeatmapLayerProps {
    listings: ListingCardData[];
    mode: HeatMode;
}

function HeatmapLayer({ listings, mode }: HeatmapLayerProps) {
    const map = useMap();
    const visualization = useMapsLibrary('visualization');
    const heatmapRef = React.useRef<google.maps.visualization.HeatmapLayer | null>(null);

    // Color gradient per mode
    const gradient = React.useMemo(() => {
        if (mode === 'price') {
            return [
                'rgba(0,0,0,0)',
                'rgba(34,197,94,0.4)',   // green low
                'rgba(201,168,76,0.6)',  // gold mid
                'rgba(232,98,10,0.8)',   // orange high
                'rgba(239,68,68,1)',     // red very high
            ];
        }
        // queue — default orange-red
        return [
            'rgba(0,0,0,0)',
            'rgba(232,98,10,0.3)',
            'rgba(232,98,10,0.6)',
            'rgba(239,68,68,0.8)',
            'rgba(200,30,30,1)',
        ];
    }, [mode]);

    React.useEffect(() => {
        if (!map || !visualization) return;

        // Compute max for normalization
        const mappable = listings.filter(l => l.lat != null && l.lng != null);
        const maxVal = mode === 'price'
            ? Math.max(...mappable.map(l => l.basePrice ?? 0), 1)
            : Math.max(...mappable.map(l => l.queueCount ?? 0), 1);

        const points = mappable.map(l => {
            const raw = mode === 'price'
                ? (l.basePrice ?? 0)
                : (l.queueCount > 0 ? l.queueCount : 1);
            return {
                location: new google.maps.LatLng(l.lat!, l.lng!),
                weight: Math.max(raw / maxVal * 10, 0.5), // normalize to 0.5–10
            };
        });

        if (!heatmapRef.current) {
            heatmapRef.current = new visualization.HeatmapLayer({
                data: points,
                map,
                radius: 40,
                opacity: 0.6,
                gradient,
            });
        } else {
            heatmapRef.current.setData(points);
            heatmapRef.current.set('gradient', gradient);
        }

        return () => {
            heatmapRef.current?.setMap(null);
            heatmapRef.current = null;
        };
    }, [map, visualization, listings, mode, gradient]);

    return null;
}

// ─── Auto-fit bounds ─────────────────────────────────────────────────────────

interface FitBoundsProps {
    listings: ListingCardData[];
}

function FitBounds({ listings }: FitBoundsProps) {
    const map = useMap();
    const fitted = React.useRef(false);

    React.useEffect(() => {
        if (!map || fitted.current) return;
        const mappable = listings.filter(l => l.lat != null && l.lng != null);
        if (mappable.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        mappable.forEach(l => bounds.extend({ lat: l.lat!, lng: l.lng! }));
        map.fitBounds(bounds);

        // Clamp zoom
        const listener = map.addListener('bounds_changed', () => {
            const z = map.getZoom() ?? 12;
            if (z > 15) map.setZoom(15);
            if (z < 11) map.setZoom(11);
            google.maps.event.removeListener(listener);
        });

        fitted.current = true;
    }, [map, listings]);

    return null;
}

// ─── Clustering logic (client-side, pixel-based) ─────────────────────────────

interface Cluster {
    id: string;
    lat: number;
    lng: number;
    listings: ListingCardData[];
}

function useClientClusters(listings: ListingCardData[], zoom: number): Cluster[] {
    return React.useMemo(() => {
        const mappable = listings.filter(l => l.lat != null && l.lng != null);
        if (zoom >= 14) {
            // No clustering at high zoom
            return mappable.map(l => ({ id: l.id, lat: l.lat!, lng: l.lng!, listings: [l] }));
        }

        // Simple grid clustering
        const gridSize = zoom >= 12 ? 0.005 : zoom >= 10 ? 0.02 : 0.05;
        const clusters: Cluster[] = [];
        const assigned = new Set<string>();

        for (const l of mappable) {
            if (assigned.has(l.id)) continue;
            const group: ListingCardData[] = [l];
            assigned.add(l.id);

            for (const other of mappable) {
                if (assigned.has(other.id)) continue;
                if (
                    Math.abs(other.lat! - l.lat!) < gridSize &&
                    Math.abs(other.lng! - l.lng!) < gridSize
                ) {
                    group.push(other);
                    assigned.add(other.id);
                }
            }

            const avgLat = group.reduce((s, x) => s + x.lat!, 0) / group.length;
            const avgLng = group.reduce((s, x) => s + x.lng!, 0) / group.length;
            clusters.push({ id: l.id, lat: avgLat, lng: avgLng, listings: group });
        }

        return clusters;
    }, [listings, zoom]);
}

// ─── Inner map (needs useMap hook) ───────────────────────────────────────────

interface InnerMapProps extends GoogleMapViewProps {
    heatmapOn: boolean;
    heatMode: HeatMode;
}

function InnerMap({ listings, onQueueClick, heatmapOn, heatMode }: InnerMapProps) {
    const navigate = useNavigate();
    const map = useMap();
    const [zoom, setZoom] = React.useState(12);
    const [openId, setOpenId] = React.useState<string | null>(null);
    const [is3D, setIs3D] = React.useState(false);

    // Track zoom for clustering
    React.useEffect(() => {
        if (!map) return;
        const listener = map.addListener('zoom_changed', () => {
            setZoom(map.getZoom() ?? 12);
        });
        return () => google.maps.event.removeListener(listener);
    }, [map]);

    // 3D tilt
    React.useEffect(() => {
        if (!map) return;
        map.setTilt(is3D ? 45 : 0);
    }, [map, is3D]);

    const clusters = useClientClusters(listings, zoom);
    const openListing = openId
        ? listings.find(l => l.id === openId) ?? null
        : null;

    return (
        <>
            <FitBounds listings={listings} />
            {heatmapOn && <HeatmapLayer listings={listings} mode={heatMode} />}

            {clusters.map(cluster => {
                if (cluster.listings.length > 1) {
                    return (
                        <ClusterMarker
                            key={cluster.id}
                            position={{ lat: cluster.lat, lng: cluster.lng }}
                            count={cluster.listings.length}
                            onClick={() => {
                                if (map) {
                                    map.setCenter({ lat: cluster.lat, lng: cluster.lng });
                                    map.setZoom(Math.min((map.getZoom() ?? 12) + 2, 15));
                                }
                            }}
                        />
                    );
                }

                const l = cluster.listings[0];
                if (!l) return null;
                const color = markerColor(l);

                return (
                    <AdvancedMarker
                        key={l.id}
                        position={{ lat: l.lat!, lng: l.lng! }}
                        onClick={() => setOpenId(prev => prev === l.id ? null : l.id)}
                    >
                        <div
                            style={{
                                minWidth: 44,
                                height: 32,
                                borderRadius: 16,
                                background: color,
                                border: `2.5px solid ${C.white}`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: C.white,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '0 8px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {l.basePrice ? `${l.basePrice.toLocaleString()}₼` : '—'}
                        </div>
                    </AdvancedMarker>
                );
            })}

            {/* ── Custom zoom controls ── */}
            <div style={{
                position: 'absolute', top: 80, right: 12, zIndex: 10,
                display: 'flex', flexDirection: 'column', gap: 4,
            }}>
                <button
                    onClick={() => map && map.setZoom((map.getZoom() ?? 12) + 1)}
                    style={{
                        width: 40, height: 40, borderRadius: 8, border: '1px solid #ddd',
                        background: '#fff', fontSize: 20, cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)', lineHeight: 1,
                    }}
                >+</button>
                <button
                    onClick={() => map && map.setZoom((map.getZoom() ?? 12) - 1)}
                    style={{
                        width: 40, height: 40, borderRadius: 8, border: '1px solid #ddd',
                        background: '#fff', fontSize: 20, cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)', lineHeight: 1,
                    }}
                >−</button>
            </div>

            {/* ── 3D toggle ── */}
            <button
                onClick={() => setIs3D(v => !v)}
                style={{
                    position: 'absolute', top: 180, right: 12, zIndex: 10,
                    width: 40, height: 40, borderRadius: 8, border: '1px solid #ddd',
                    background: is3D ? C.navy : '#fff',
                    color: is3D ? C.white : '#333',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
            >3D</button>

            {openListing && openListing.lat != null && openListing.lng != null && (
                <InfoWindow
                    position={{ lat: openListing.lat, lng: openListing.lng }}
                    onCloseClick={() => setOpenId(null)}
                    pixelOffset={[0, -20]}
                >
                    <div style={{ minWidth: 200, fontFamily: 'system-ui, sans-serif', padding: '4px 2px' }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13, color: C.navy }}>
                            {openListing.title}
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: C.muted }}>
                            {[openListing.district, openListing.address].filter(Boolean).join(' · ')}
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: C.gold }}>
                            {openListing.basePrice ? `${openListing.basePrice.toLocaleString()} AZN/ay` : '—'}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                            {openListing.queueCount > 0 && (
                                <span style={{
                                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                    background: 'rgba(26,26,46,0.08)', color: C.navy, fontWeight: 600,
                                }}>
                                    👥 {openListing.queueCount} növbəçi
                                </span>
                            )}
                            <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                background: openListing.heatLevel === 'YUKSEK'
                                    ? 'rgba(239,68,68,0.1)'
                                    : openListing.heatLevel === 'ORTA'
                                        ? 'rgba(245,158,11,0.1)'
                                        : 'rgba(34,197,94,0.1)',
                                color: openListing.heatLevel === 'YUKSEK'
                                    ? '#EF4444'
                                    : openListing.heatLevel === 'ORTA'
                                        ? '#F59E0B'
                                        : '#22C55E',
                                fontWeight: 600,
                            }}>
                                {openListing.heatLevel === 'YUKSEK' ? '🔥' : openListing.heatLevel === 'ORTA' ? '🌡' : '🟢'}{' '}
                                {heatLabel(openListing.heatLevel)}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    setOpenId(null);
                                    onQueueClick(openListing);
                                }}
                                style={{
                                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12,
                                    fontWeight: 700, border: 'none', cursor: 'pointer',
                                    background: C.gold, color: '#0A0B0F',
                                }}
                            >
                                Sıraya gir
                            </button>
                            <button
                                onClick={() => navigate(`/elan/${openListing.id}`)}
                                style={{
                                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12,
                                    fontWeight: 700, border: `1px solid ${C.border}`, cursor: 'pointer',
                                    background: C.navy, color: C.white,
                                }}
                            >
                                Ətraflı →
                            </button>
                        </div>
                    </div>
                </InfoWindow>
            )}
        </>
    );
}

// ─── Main exported component ─────────────────────────────────────────────────

export function GoogleMapView({ listings, onQueueClick }: GoogleMapViewProps) {
    const [heatmapOn, setHeatmapOn] = React.useState(false);
    const [heatMode, setHeatMode] = React.useState<HeatMode>('queue');

    const HEAT_MODES: { key: HeatMode; icon: string; label: string }[] = [
        { key: 'queue', icon: '🔥', label: 'Tələb' },
        { key: 'price', icon: '💰', label: 'Qiymət' },
    ];

    return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '16px', overflow: 'hidden', background: '#f5f1eb' }}>
            <Map
                defaultCenter={BAKU_CENTER}
                defaultZoom={17}
                mapId="d19f791f5e30ebc0e5787f51"
                gestureHandling="greedy"
                disableDefaultUI={true}
                style={{ width: '100%', height: '100%' }}
            >
                <InnerMap
                    listings={listings}
                    onQueueClick={onQueueClick}
                    heatmapOn={heatmapOn}
                    heatMode={heatMode}
                />
            </Map>

            {/* Heatmap controls — top right */}
            <div style={{
                position: 'absolute', top: 12, right: 12, zIndex: 10,
                display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end',
            }}>
                {/* Toggle switch */}
                <div
                    onClick={() => setHeatmapOn(v => !v)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#fff', borderRadius: 20, padding: '6px 12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer',
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                        🔥 İstilik
                    </span>
                    <div style={{
                        width: 40, height: 22, borderRadius: 11,
                        background: heatmapOn ? '#E8620A' : '#ddd',
                        position: 'relative', transition: 'background 0.2s',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 3, left: heatmapOn ? 21 : 3,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#fff', transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                    </div>
                </div>

                {/* Mode pills — only shown when heatmap is on */}
                {heatmapOn && (
                    <div style={{
                        display: 'flex', gap: 4,
                        background: '#fff', borderRadius: 16, padding: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                        {HEAT_MODES.map(m => (
                            <button
                                key={m.key}
                                onClick={() => setHeatMode(m.key)}
                                style={{
                                    padding: '4px 10px', borderRadius: 12, fontSize: 11,
                                    fontWeight: 700, border: 'none', cursor: 'pointer',
                                    background: heatMode === m.key
                                        ? (m.key === 'queue' ? '#E8620A' : '#C9A84C')
                                        : 'transparent',
                                    color: heatMode === m.key ? '#fff' : '#666',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
