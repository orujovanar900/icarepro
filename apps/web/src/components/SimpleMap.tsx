import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Property {
    id: string;
    name: string;
    address?: string;
    tenantName?: string;
    rent?: number;
    status?: 'active' | 'expiring' | 'expired';
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

export default function SimpleMap({ compact = false, hidePanel = false, height: heightProp, properties, onPropertyClick }: SimpleMapProps) {
    const height = compact ? '100%' : (heightProp ?? 280);

    // OpenStreetMap iframe — Baku area, zero JS dependencies
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=49.65,40.30,50.05,40.55&layer=mapnik`;

    return (
        <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
            <iframe
                src={mapUrl}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                title="Baku xəritəsi"
                loading="lazy"
            />

            {/* Property overlay panel — hidden when Dashboard shows its own side list */}
            {!hidePanel && properties.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(255,255,255,0.97)',
                    borderRadius: 10,
                    padding: '6px 6px 2px',
                    maxHeight: compact ? 200 : (height as number) - 20,
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
                            onClick={() => onPropertyClick?.(p.id)}
                            style={{
                                padding: '6px 8px',
                                cursor: onPropertyClick ? 'pointer' : 'default',
                                borderRadius: 6,
                                marginBottom: 4,
                                borderLeft: `3px solid ${STATUS_COLOR[p.status || 'expired']}`,
                                fontSize: 12,
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
