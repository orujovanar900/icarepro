import React, { useState, useCallback } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';

const MAPS_KEY = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string;

interface Property {
    id: string;
    name: string;
    number?: string;
    address?: string;
    tenantName?: string;
    rent?: number;
    area?: number;
    status?: 'active' | 'expiring' | 'expired';
    lat?: number;
    lng?: number;
}

interface SimpleMapProps {
    compact?: boolean;
    hidePanel?: boolean;
    height?: number;
    properties: Property[];
    onPropertyClick?: (id: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
    active: '#22c55e',
    expiring: '#eab308',
    expired: '#ef4444',
};

const STATUS_LABEL: Record<string, string> = {
    active: 'Aktiv',
    expiring: 'Bitmə yaxın',
    expired: 'Bitmişdir',
};

const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

/* ── Custom Controls (zoom +/- and 3D toggle) ────────────────────────── */
function MapControls() {
    const map = useMap();
    const [is3D, setIs3D] = useState(false);

    const zoomIn = useCallback(() => {
        if (!map) return;
        map.setZoom((map.getZoom() ?? 12) + 1);
    }, [map]);

    const zoomOut = useCallback(() => {
        if (!map) return;
        map.setZoom((map.getZoom() ?? 12) - 1);
    }, [map]);

    const toggle3D = useCallback(() => {
        if (!map) return;
        const next = !is3D;
        setIs3D(next);
        map.setTilt(next ? 45 : 0);
    }, [map, is3D]);

    const btn: React.CSSProperties = {
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', border: 'none', cursor: 'pointer',
        fontSize: 18, fontWeight: 700, color: '#333',
        transition: 'background 0.15s',
    };

    return (
        <div style={{
            position: 'absolute', right: 10, top: 10, zIndex: 1,
            display: 'flex', flexDirection: 'column', gap: 6,
        }}>
            {/* Zoom controls */}
            <div style={{
                borderRadius: 8, overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}>
                <button style={{ ...btn, borderBottom: '1px solid #eee' }} onClick={zoomIn}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>+</button>
                <button style={btn} onClick={zoomOut}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>−</button>
            </div>
            {/* 3D toggle */}
            <button
                style={{
                    ...btn,
                    borderRadius: 8,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    fontSize: 11, fontWeight: 800,
                    background: is3D ? '#1A1A2E' : '#fff',
                    color: is3D ? '#C9A84C' : '#333',
                }}
                onClick={toggle3D}
                onMouseEnter={e => { if (!is3D) e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={e => { if (!is3D) e.currentTarget.style.background = '#fff'; }}
            >3D</button>
        </div>
    );
}

/* ── Pin marker with color ────────────────────────────────────────────── */
function PinMarker({ color }: { color: string }) {
    return (
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none">
            <path
                d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.716 23.284 0 15 0z"
                fill={color}
            />
            <circle cx="15" cy="14" r="6" fill="#fff" fillOpacity="0.9" />
        </svg>
    );
}

export default function SimpleMap({ compact = false, hidePanel = false, height: heightProp, properties, onPropertyClick }: SimpleMapProps) {
    const height = compact ? '100%' : (heightProp ?? 280);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedProperty = properties.find(p => p.id === selectedId);

    return (
        <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <APIProvider apiKey={MAPS_KEY}>
                <GoogleMap
                    defaultCenter={BAKU_CENTER}
                    defaultZoom={12}
                    mapId="d19f791f5e30ebc0e5787f51"
                    disableDefaultUI={true}
                    gestureHandling="cooperative"
                    onClick={() => setSelectedId(null)}
                >
                    <MapControls />

                    {properties
                        .filter(p => p.lat && p.lng)
                        .map(p => (
                            <AdvancedMarker
                                key={p.id}
                                position={{ lat: p.lat!, lng: p.lng! }}
                                onClick={() => setSelectedId(s => s === p.id ? null : p.id)}
                            >
                                <PinMarker color={STATUS_COLOR[p.status || 'expired'] ?? '#ef4444'} />
                            </AdvancedMarker>
                        ))}

                    {/* InfoWindow popup */}
                    {selectedProperty && selectedProperty.lat && selectedProperty.lng && (
                        <InfoWindow
                            position={{ lat: selectedProperty.lat, lng: selectedProperty.lng }}
                            onCloseClick={() => setSelectedId(null)}
                            pixelOffset={[0, -40]}
                        >
                            <div style={{ minWidth: 170, padding: '4px 2px', fontFamily: 'system-ui, sans-serif' }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: 4,
                                }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
                                        {selectedProperty.name}
                                    </span>
                                    <span style={{
                                        fontSize: 10, padding: '2px 6px', borderRadius: 10,
                                        background: STATUS_COLOR[selectedProperty.status || 'expired'] + '20',
                                        color: STATUS_COLOR[selectedProperty.status || 'expired'],
                                        fontWeight: 700,
                                    }}>
                                        {STATUS_LABEL[selectedProperty.status || 'expired']}
                                    </span>
                                </div>

                                {selectedProperty.number && (
                                    <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>
                                        🏢 №{selectedProperty.number}
                                    </div>
                                )}

                                {selectedProperty.area != null && selectedProperty.area > 0 && (
                                    <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>
                                        📐 {selectedProperty.area} m²
                                    </div>
                                )}

                                {selectedProperty.address && (
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                                        📍 {selectedProperty.address}
                                    </div>
                                )}

                                {selectedProperty.tenantName && (
                                    <div style={{ fontSize: 11, color: '#374151', marginBottom: 3 }}>
                                        👤 {selectedProperty.tenantName}
                                    </div>
                                )}

                                {selectedProperty.rent != null && selectedProperty.rent > 0 && (
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>
                                        {selectedProperty.rent.toLocaleString()} ₼/ay
                                    </div>
                                )}

                                <button
                                    onClick={() => onPropertyClick?.(selectedProperty.id)}
                                    style={{
                                        marginTop: 8, width: '100%',
                                        padding: '6px 0', border: 'none', borderRadius: 6,
                                        background: '#1A1A2E', color: '#fff',
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                        transition: 'opacity 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    Ətraflı bax →
                                </button>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </APIProvider>

            {/* Property overlay panel — hidden when Dashboard shows its own side list */}
            {!hidePanel && properties.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(255,255,255,0.97)',
                    borderRadius: 10,
                    padding: '6px 6px 2px',
                    maxHeight: compact ? 200 : typeof height === 'number' ? height - 20 : 260,
                    overflowY: 'auto',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                    minWidth: 190,
                    maxWidth: 220,
                }}>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 6px 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        {properties.length} Obyekt
                    </p>
                    {properties.map(p => (
                        <div
                            key={p.id}
                            onClick={() => {
                                setSelectedId(p.id);
                                onPropertyClick?.(p.id);
                            }}
                            style={{
                                padding: '6px 8px',
                                cursor: onPropertyClick ? 'pointer' : 'default',
                                borderRadius: 6,
                                marginBottom: 4,
                                borderLeft: `3px solid ${STATUS_COLOR[p.status || 'expired']}`,
                                fontSize: 12,
                                transition: 'background 0.15s',
                                background: selectedId === p.id ? '#f0f9ff' : 'transparent',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = selectedId === p.id ? '#f0f9ff' : '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = selectedId === p.id ? '#f0f9ff' : 'transparent')}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 1, color: '#111827' }}>{p.name}</div>
                            {p.tenantName && (
                                <div style={{ color: '#6b7280', fontSize: 11 }}>{p.tenantName}</div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                {p.rent ? (
                                    <span style={{ color: '#1a56db', fontWeight: 600, fontSize: 11 }}>{p.rent.toLocaleString()} ₼</span>
                                ) : <span />}
                                <span style={{
                                    fontSize: 10,
                                    padding: '1px 5px',
                                    borderRadius: 10,
                                    background: STATUS_COLOR[p.status || 'expired'] + '18',
                                    color: STATUS_COLOR[p.status || 'expired'],
                                    fontWeight: 600,
                                    border: `1px solid ${STATUS_COLOR[p.status || 'expired']}30`,
                                }}>
                                    {STATUS_LABEL[p.status || 'expired']}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
