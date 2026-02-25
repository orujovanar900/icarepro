/**
 * PropertyMap - Full-size map for the Properties/Obyektlər page.
 * Lazy-loaded so Leaflet never runs during SSR or initial page parse.
 * Colored markers: green = active, yellow = expiring ≤30 days, red = no/expired contract.
 */
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

// Delete the broken _getIconUrl then set CDN urls — most reliable prod-safe approach
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Colored circle markers using DivIcon
const createMarker = (color: string) =>
    L.divIcon({
        className: '',
        html: `<div style="
            width:16px;height:16px;
            background:${color};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 2px 6px rgba(0,0,0,0.35)">
        </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        popupAnchor: [0, -10],
    });

const GREEN = '#22c55e';
const YELLOW = '#eab308';
const RED = '#ef4444';

function getMarkerColor(contract: any): string {
    if (!contract) return RED;
    const daysLeft = Math.floor(
        (new Date(contract.endDate).getTime() - Date.now()) / 86_400_000
    );
    if (daysLeft < 0) return RED;
    if (daysLeft <= 30) return YELLOW;
    return GREEN;
}

function statusLabel(contract: any): { text: string; color: string } {
    if (!contract) return { text: 'Müqavilə yoxdur', color: RED };
    const daysLeft = Math.floor(
        (new Date(contract.endDate).getTime() - Date.now()) / 86_400_000
    );
    if (daysLeft < 0) return { text: 'Müddəti bitib', color: RED };
    if (daysLeft <= 30) return { text: `${daysLeft} gün qalıb`, color: YELLOW };
    return { text: 'Aktiv', color: GREEN };
}

const formatMoney = (v: number) =>
    new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(v);

// Stable jitter per property id so random positions don't jump on re-render
function stableOffset(id: string, scale = 0.04): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return ((hash & 0xffff) / 0xffff - 0.5) * scale;
}

interface Props {
    properties: any[];
    contracts: any[];     // active contracts list
    height?: number;
}

export default function PropertyMap({ properties, contracts, height = 380 }: Props) {
    const navigate = useNavigate();

    return (
        <MapContainer
            center={[40.4093, 49.8671]}
            zoom={12}
            scrollWheelZoom={false}
            style={{ height, width: '100%', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((property: any) => {
                const lat = property.lat ? Number(property.lat) : 40.4093 + stableOffset(property.id);
                const lng = property.lng ? Number(property.lng) : 49.8671 + stableOffset(property.id + '_lng');
                const contract = contracts.find((c: any) => c.propertyId === property.id);
                const color = getMarkerColor(contract);
                const status = statusLabel(contract);

                return (
                    <Marker
                        key={property.id}
                        position={[lat, lng]}
                        icon={createMarker(color)}
                    >
                        <Popup minWidth={200}>
                            <div style={{ fontFamily: 'sans-serif', lineHeight: 1.5, padding: '2px 0' }}>
                                <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{property.name}</p>
                                <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>{property.address || '—'}</p>
                                <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
                                {contract ? (
                                    <>
                                        <p style={{ fontSize: 12, margin: '2px 0' }}>
                                            <span style={{ color: '#6b7280' }}>İcarəçi: </span>
                                            <strong>{contract.tenant?.fullName}</strong>
                                        </p>
                                        {contract.tenant?.phone && (
                                            <p style={{ fontSize: 12, margin: '2px 0', color: '#6b7280' }}>
                                                {contract.tenant.phone}
                                            </p>
                                        )}
                                        <p style={{ fontSize: 12, margin: '4px 0' }}>
                                            <span style={{ color: '#6b7280' }}>Aylıq icarə: </span>
                                            <strong style={{ color: '#16a34a' }}>{formatMoney(Number(contract.monthlyRent))}</strong>
                                        </p>
                                    </>
                                ) : (
                                    <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0' }}>İcarəçi tapşırılmayıb</p>
                                )}
                                <span style={{
                                    display: 'inline-block', marginTop: 4, padding: '2px 8px',
                                    borderRadius: 12, fontSize: 11, fontWeight: 600,
                                    background: status.color + '20', color: status.color,
                                    border: `1px solid ${status.color}40`
                                }}>{status.text}</span>
                                <br />
                                <button
                                    onClick={() => navigate(`/properties/${property.id}`)}
                                    style={{
                                        marginTop: 8, width: '100%', padding: '5px 0',
                                        background: '#1a56db', color: 'white',
                                        border: 'none', borderRadius: 6, fontSize: 12,
                                        fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Ətraflı bax →
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
