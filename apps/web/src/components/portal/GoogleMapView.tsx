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

interface HeatmapLayerProps {
    listings: ListingCardData[];
}

function HeatmapLayer({ listings }: HeatmapLayerProps) {
    const map = useMap();
    const visualization = useMapsLibrary('visualization');
    const heatmapRef = React.useRef<google.maps.visualization.HeatmapLayer | null>(null);

    React.useEffect(() => {
        if (!map || !visualization) return;

        const points = listings
            .filter(l => l.lat != null && l.lng != null)
            .map(l => ({
                location: new google.maps.LatLng(l.lat!, l.lng!),
                weight: l.queueCount > 0 ? l.queueCount : 1,
            }));

        if (!heatmapRef.current) {
            heatmapRef.current = new visualization.HeatmapLayer({
                data: points,
                map,
                radius: 40,
                opacity: 0.6,
            });
        } else {
            heatmapRef.current.setData(points);
        }

        return () => {
            heatmapRef.current?.setMap(null);
            heatmapRef.current = null;
        };
    }, [map, visualization, listings]);

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
}

function InnerMap({ listings, onQueueClick, heatmapOn }: InnerMapProps) {
    const navigate = useNavigate();
    const map = useMap();
    const [zoom, setZoom] = React.useState(12);
    const [openId, setOpenId] = React.useState<string | null>(null);

    // Track zoom for clustering
    React.useEffect(() => {
        if (!map) return;
        const listener = map.addListener('zoom_changed', () => {
            setZoom(map.getZoom() ?? 12);
        });
        return () => google.maps.event.removeListener(listener);
    }, [map]);

    const clusters = useClientClusters(listings, zoom);
    const openListing = openId
        ? listings.find(l => l.id === openId) ?? null
        : null;

    return (
        <>
            <FitBounds listings={listings} />
            {heatmapOn && <HeatmapLayer listings={listings} />}

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

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export function GoogleMapView({ listings, onQueueClick }: GoogleMapViewProps) {
    const [heatmapOn, setHeatmapOn] = React.useState(false);

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <Map
                defaultCenter={BAKU_CENTER}
                defaultZoom={12}
                mapId="icarepro-map"
                styles={MAP_STYLES}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={{ height: '100%', width: '100%' }}
            >
                <InnerMap
                    listings={listings}
                    onQueueClick={onQueueClick}
                    heatmapOn={heatmapOn}
                />
            </Map>

            {/* Heatmap toggle button */}
            <button
                onClick={() => setHeatmapOn(v => !v)}
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                    padding: '7px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: heatmapOn ? C.gold : 'rgba(255,255,255,0.95)',
                    color: heatmapOn ? '#0A0B0F' : C.muted,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s',
                    backdropFilter: 'blur(8px)',
                }}
            >
                🔥 İstilik xəritəsi
            </button>
        </div>
    );
}
