import * as React from 'react';
import { APIProvider, Map, AdvancedMarker, MapMouseEvent } from '@vis.gl/react-google-maps';

const MAPS_KEY = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] as string;
const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

export interface MapPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number, address: string) => void;
    onConfirm: () => void;
}

export function MapPicker({ initialLat, initialLng, onLocationSelect, onConfirm }: MapPickerProps) {
    if (!MAPS_KEY) return null;

    const center = initialLat && initialLng ? { lat: initialLat, lng: initialLng } : BAKU_CENTER;

    const [markerPos, setMarkerPos] = React.useState<google.maps.LatLngLiteral | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [address, setAddress] = React.useState('');
    const [isGeocoding, setIsGeocoding] = React.useState(false);

    // Stable ref for onLocationSelect to avoid stale closures
    const onLocationSelectRef = React.useRef(onLocationSelect);
    onLocationSelectRef.current = onLocationSelect;

    const handleClick = React.useCallback(async (e: MapMouseEvent) => {
        if (!e.detail.latLng) return;
        const lat = e.detail.latLng.lat;
        const lng = e.detail.latLng.lng;
        const pos = { lat, lng };

        setMarkerPos(pos);
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setIsGeocoding(true);

        // Immediately notify parent with coordinates
        onLocationSelectRef.current(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        // Try reverse geocoding
        try {
            const geocoder = new google.maps.Geocoder();
            const result = await geocoder.geocode({ location: pos });
            const formatted = result.results?.[0]?.formatted_address;
            if (formatted) {
                setAddress(formatted);
                onLocationSelectRef.current(lat, lng, formatted);
            }
        } catch (err) {
            console.warn('Geocode failed:', err);
            // Keep the coordinate string already set
        }
        setIsGeocoding(false);
    }, []);

    return (
        <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8, border: '1px solid #ddd' }}>

            {/* Instruction banner */}
            <div style={{
                background: '#1A1A2E', color: '#fff',
                padding: '10px 16px', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span>📍</span>
                <span>Dəqiq yeri seçmək üçün xəritəyə klik edin. Zoom artıraraq daha dəqiq yer seçə bilərsiniz.</span>
            </div>

            {/* Map */}
            <div style={{ cursor: 'crosshair', width: '100%', height: '300px' }}>
                <APIProvider apiKey={MAPS_KEY}>
                    <Map
                        defaultCenter={center}
                        defaultZoom={14}
                        mapId="d19f791f5e30ebc0e5787f51"
                        gestureHandling="greedy"
                        disableDefaultUI={true}
                        clickableIcons={false}
                        draggableCursor="crosshair"
                        draggingCursor="grabbing"
                        style={{ width: '100%', height: '100%' }}
                        onClick={handleClick}
                    >
                        {markerPos && <AdvancedMarker position={markerPos} />}
                    </Map>
                </APIProvider>
            </div>

            {/* Address display */}
            <div style={{
                padding: '10px 16px',
                background: address ? '#f0fdf4' : '#f8f8f8',
                borderTop: '1px solid #eee',
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#333',
                transition: 'background 0.2s',
            }}>
                {isGeocoding ? (
                    <span style={{ color: '#166534' }}>📍 <strong>{address}</strong> <span style={{ color: '#999', fontWeight: 400 }}>yüklənir...</span></span>
                ) : address ? (
                    <span style={{ color: '#166534' }}>📍 <strong>{address}</strong></span>
                ) : (
                    <span style={{ color: '#999' }}>📍 Xəritəyə klik edin</span>
                )}
            </div>

            {/* Confirm button */}
            <button
                type="button"
                onClick={onConfirm}
                disabled={!markerPos}
                style={{
                    width: '100%', padding: '12px',
                    border: 'none',
                    background: markerPos ? '#1A1A2E' : '#ccc',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: markerPos ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                    borderRadius: '0 0 12px 12px',
                }}
            >
                {markerPos ? '✓ Bu yeri seç' : 'Xəritəyə klik edin'}
            </button>
        </div>
    );
}
