/**
 * DashboardMap - Compact 220px map for the Dashboard page.
 * Lazy-loaded. Uses colored circle markers with hover tooltips.
 */
import React from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createMarker = (color: string) =>
    L.divIcon({
        className: '',
        html: `<div style="
            width:14px;height:14px;
            background:${color};
            border:2.5px solid white;
            border-radius:50%;
            box-shadow:0 2px 5px rgba(0,0,0,0.3)">
        </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        tooltipAnchor: [7, 0],
    });

function getColor(contract: any): string {
    if (!contract) return '#ef4444';
    const days = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return '#ef4444';
    if (days <= 30) return '#eab308';
    return '#22c55e';
}

function stableOffset(id: string, scale = 0.035): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return ((hash & 0xffff) / 0xffff - 0.5) * scale;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('az-AZ', { maximumFractionDigits: 0 }).format(v) + ' ₼';

interface Props {
    properties: any[];
    contracts: any[];
}

export default function DashboardMap({ properties, contracts }: Props) {
    const navigate = useNavigate();

    return (
        <MapContainer
            center={[40.4093, 49.8671]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: 220, width: '100%', zIndex: 0 }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((p: any) => {
                const lat = p.lat ? Number(p.lat) : 40.4093 + stableOffset(p.id);
                const lng = p.lng ? Number(p.lng) : 49.8671 + stableOffset(p.id + '_lng');
                const contract = contracts.find((c: any) => c.propertyId === p.id);
                const color = getColor(contract);

                return (
                    <Marker
                        key={p.id}
                        position={[lat, lng]}
                        icon={createMarker(color)}
                        eventHandlers={{ click: () => navigate(`/properties/${p.id}`) }}
                    >
                        <Tooltip direction="top" offset={[0, -4]} opacity={0.97}>
                            <div style={{ fontFamily: 'sans-serif', fontSize: 12, lineHeight: 1.5 }}>
                                <p style={{ margin: 0, fontWeight: 700 }}>{p.name}</p>
                                {contract && (
                                    <>
                                        <p style={{ margin: 0, color: '#6b7280' }}>{contract.tenant?.fullName}</p>
                                        <p style={{ margin: 0, color: '#16a34a', fontWeight: 600 }}>{fmt(Number(contract.monthlyRent))}</p>
                                    </>
                                )}
                                {!contract && <p style={{ margin: 0, color: '#ef4444' }}>Müqavilə yoxdur</p>}
                            </div>
                        </Tooltip>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
