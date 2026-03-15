import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { QueueModal } from '@/components/portal/QueueModal';
import { ReportModal } from '@/components/portal/ReportModal';
import { useListingDetail } from '@/hooks/useListingDetail';
import { useAuthStore } from '@/store/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    success: '#16A34A',
};

const AMENITY_MAP: Record<string, string> = {
    MEBEL: '🛋️ Mebel',
    KONDISIONER: '❄️ Kondisioner',
    LIFT: '🛗 Lift',
    BALKON: '🌿 Balkon',
    INTERNET: '📶 İnternet',
    PARKLAMA: '🅿️ Parklama',
    GUVƏNLIK: '🔐 Mühafizə',
    HOVUZ: '🏊 Hovuz',
    ISITME: '🔥 İsitmə',
    TEXNIKI_XIDMET: '🔧 Texniki xidmət',
    MƏTBƏX: '🍳 Mətbəx',
    ÇAMAŞIRXANA: '🫧 Camaşırxana',
};

// Keys must match ListingType enum in schema.prisma
const TYPE_LABELS: Record<string, string> = {
    MENZIL:    'Mənzil',
    OFIS:      'Ofis',
    OBYEKT:    'Obyekt',
    HEYET_EVI: 'Həyət Evi / Bağ Evi',
    GARAJ:     'Qaraj',
    TORPAQ:    'Torpaq',
    ANBAR:     'Anbar',
};

// Keys must match Listing.availStatus in schema.prisma: BOSHDUR | BOSHALIR | INSAAT
const AVAIL_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    BOSHDUR:  { label: '✅ Boşdur',           color: '#15803D', bg: '#DCFCE7' },
    BOSHALIR: { label: '📅 Tezliklə boşalır', color: '#92400E', bg: '#FEF3C7' },
    INSAAT:   { label: '🏗 İnşaat/Təmir',     color: '#1D4ED8', bg: '#DBEAFE' },
};

const HEAT_COLORS = {
    AZ: { bar: '#22C55E', label: 'Az tələbat', pct: 25 },
    ORTA: { bar: '#F59E0B', label: 'Orta tələbat', pct: 60 },
    YUKSEK: { bar: '#EF4444', label: 'Yüksək tələbat', pct: 90 },
};

const AZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];

const GRADIENTS = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

function formatDate(str?: string): string {
    if (!str) return '—';
    const d = new Date(str);
    return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonDetail() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 20px 60px' }}>
            <div style={{ height: 20, width: 80, background: '#E5E7EB', borderRadius: 6, marginBottom: 24 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
                <div>
                    <div style={{ height: 400, background: '#E5E7EB', borderRadius: 16, marginBottom: 16 }} />
                    <div style={{ height: 16, width: '70%', background: '#E5E7EB', borderRadius: 6, marginBottom: 10 }} />
                    <div style={{ height: 16, width: '50%', background: '#E5E7EB', borderRadius: 6 }} />
                </div>
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                    {[120, 80, 100, 60, 140].map((h, i) => (
                        <div key={i} style={{ height: h, background: '#E5E7EB', borderRadius: 10, marginBottom: 12 }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Raw Leaflet mini-map component ──────────────────────────────────────────

interface LocationMapProps {
    lat: number;
    lng: number;
}

function LocationMap({ lat, lng }: LocationMapProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const mapRef = React.useRef<L.Map | null>(null);

    React.useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom: 15,
            scrollWheelZoom: false,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Privacy circle — blurred ~200m radius
        L.circle([lat, lng], {
            radius: 200,
            color: 'transparent',
            fillColor: '#E8620A',
            fillOpacity: 0.15,
        }).addTo(map);

        // Marker with default icon fix
        const icon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
        });
        L.marker([lat, lng], { icon }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [lat, lng]);

    return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}

interface PhotoGalleryProps {
    photos: string[];
    title: string;
    listingId: string;
}

function PhotoGallery({ photos, title, listingId }: PhotoGalleryProps) {
    const [activeIdx, setActiveIdx] = React.useState(0);
    const [lightboxOpen, setLightboxOpen] = React.useState(false);

    React.useEffect(() => {
        if (!lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(i + 1, photos.length - 1));
            if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(i - 1, 0));
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [lightboxOpen, photos.length]);

    const gradientBg = GRADIENTS[listingId.charCodeAt(0) % GRADIENTS.length];

    return (
        <>
            <div>
                {/* Main photo */}
                <div
                    onClick={() => photos.length > 0 && setLightboxOpen(true)}
                    style={{
                        height: 400,
                        borderRadius: 16,
                        overflow: 'hidden',
                        cursor: photos.length > 0 ? 'pointer' : 'default',
                        position: 'relative',
                        background: photos.length === 0 ? gradientBg : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {photos.length > 0 ? (
                        <>
                            <img
                                src={photos[activeIdx]}
                                alt={title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {photos.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveIdx(i => Math.max(i - 1, 0)); }}
                                        style={{
                                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: '#FFF',
                                        }}
                                    >
                                        <ChevronLeft style={{ width: 18, height: 18 }} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveIdx(i => Math.min(i + 1, photos.length - 1)); }}
                                        style={{
                                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                                            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', color: '#FFF',
                                        }}
                                    >
                                        <ChevronRight style={{ width: 18, height: 18 }} />
                                    </button>
                                    <div style={{
                                        position: 'absolute', bottom: 12, right: 14,
                                        background: 'rgba(0,0,0,0.55)', color: '#FFF',
                                        fontSize: 12, borderRadius: 20, padding: '3px 10px',
                                    }}>
                                        {activeIdx + 1}/{photos.length}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.9)' }}>
                            <div style={{ fontSize: 64, marginBottom: 8 }}>🏠</div>
                            <p style={{ fontSize: 14 }}>Şəkil yoxdur</p>
                        </div>
                    )}
                </div>

                {/* Thumbnail strip */}
                {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                        {photos.map((p, i) => (
                            <img
                                key={i}
                                src={p}
                                alt=""
                                onClick={() => setActiveIdx(i)}
                                style={{
                                    width: 80, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                                    border: activeIdx === i ? `2px solid ${C.orange}` : `2px solid transparent`,
                                    transition: 'border-color 0.15s',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && photos.length > 0 && (
                <div
                    onClick={() => setLightboxOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999,
                        background: 'rgba(0,0,0,0.92)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <img
                        src={photos[activeIdx]}
                        alt={title}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveIdx(i => Math.max(i - 1, 0)); }}
                        disabled={activeIdx === 0}
                        style={{
                            position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: activeIdx === 0 ? 'not-allowed' : 'pointer', color: '#FFF', opacity: activeIdx === 0 ? 0.3 : 1,
                        }}
                    ><ChevronLeft style={{ width: 22, height: 22 }} /></button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveIdx(i => Math.min(i + 1, photos.length - 1)); }}
                        disabled={activeIdx === photos.length - 1}
                        style={{
                            position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: activeIdx === photos.length - 1 ? 'not-allowed' : 'pointer', color: '#FFF',
                            opacity: activeIdx === photos.length - 1 ? 0.3 : 1,
                        }}
                    ><ChevronRight style={{ width: 22, height: 22 }} /></button>
                    <button
                        onClick={() => setLightboxOpen(false)}
                        style={{
                            position: 'absolute', top: 20, right: 20,
                            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#FFF', fontSize: 20,
                        }}
                    >×</button>
                    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                        {activeIdx + 1} / {photos.length}
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ListingDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const {
        listing,
        isLoading,
        isError,
        queueSummary,
        queueFull,
        isInQueue,
        isFavorited,
        joinQueue,
        updateOffer,
        withdrawQueue,
        handleFavorite,
    } = useListingDetail(id);

    const [queueModalOpen, setQueueModalOpen] = React.useState(false);
    const [reportModalOpen, setReportModalOpen] = React.useState(false);
    const [withdrawConfirm, setWithdrawConfirm] = React.useState(false);
    const [newOffer, setNewOffer] = React.useState('');
    const [offerEditOpen, setOfferEditOpen] = React.useState(false);
    const [offerError, setOfferError] = React.useState('');

    // Set document title
    React.useEffect(() => {
        if (listing) {
            document.title = `${listing.title} — İcarə Pro`;
        }
        return () => { document.title = 'İcarə Pro'; };
    }, [listing]);

    // Auth gate for queue join
    function handleQueueJoin() {
        if (!isAuthenticated) {
            sessionStorage.setItem('portalIntent', JSON.stringify({ action: 'queue', listingId: id }));
            navigate('/login');
            return;
        }
        setQueueModalOpen(true);
    }

    async function handleWithdraw() {
        if (!queueFull?.myEntry?.id) return;
        try {
            await withdrawQueue.mutateAsync(queueFull.myEntry.id);
            setWithdrawConfirm(false);
        } catch {
            // error handled by mutation
        }
    }

    async function handleUpdateOffer() {
        if (!queueFull?.myEntry?.id || !newOffer) return;
        setOfferError('');
        try {
            await updateOffer.mutateAsync({ entryId: queueFull.myEntry.id, priceOffer: Number(newOffer) });
            setOfferEditOpen(false);
            setNewOffer('');
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? 'Xəta baş verdi';
            setOfferError(msg);
        }
    }

    // ─── Loading / Error states ──────────────────────────────────────────────

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg }}>
                <PortalNavbar />
                <SkeletonDetail />
                <PortalFooter />
            </div>
        );
    }

    if (isError || !listing) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
                <PortalNavbar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        background: C.white, borderRadius: 20, padding: '48px 40px',
                        textAlign: 'center', maxWidth: 400, border: `1px solid ${C.border}`,
                    }}>
                        <p style={{ fontSize: 48, marginBottom: 12 }}>🏚️</p>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Elan tapılmadı</h1>
                        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
                            Bu elan artıq mövcud deyil və ya silinib.
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: C.navy, color: '#FFF', border: 'none',
                                borderRadius: 12, padding: '12px 28px', fontSize: 14,
                                fontWeight: 700, cursor: 'pointer',
                            }}
                        >Ana səhifəyə qayıt</button>
                    </div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    // ─── Derived display data ────────────────────────────────────────────────

    const avail = AVAIL_LABELS[listing.availStatus] ?? { label: listing.availStatus, color: C.muted, bg: '#F3F4F6' };
    const heat = HEAT_COLORS[listing.heatLevel ?? queueSummary?.heatLevel ?? 'AZ'];
    const queueCount = queueSummary?.queueCount ?? listing.queueCount ?? 0;
    const highestOffer = queueSummary?.highestOffer ?? listing.highestOffer;

    const infoRows = [
        { label: 'Növ', value: TYPE_LABELS[listing.type] ?? listing.type },
        { label: 'Rayon', value: listing.district ?? '—' },
        { label: 'Ünvan', value: listing.address },
        ...(listing.floor ? [{ label: 'Mərtəbə', value: `${listing.floor}/${listing.totalFloors ?? '?'}` }] : []),
        ...(listing.area ? [{ label: 'Sahə', value: `${listing.area} m²` }] : []),
        ...(listing.rooms ? [{ label: 'Otaq', value: `${listing.rooms} otaq` }] : []),
    ];

    const queueTableRows = queueFull?.entries?.slice(0, 10) ?? [];
    const myPos = queueFull?.myEntry?.position;

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <PortalNavbar />

            <main style={{ flex: 1, maxWidth: 1200, width: '100%', margin: '0 auto', padding: '20px 20px 60px' }}>
                {/* Back button + breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 14, padding: '4px 8px 4px 0' }}
                    >
                        <ArrowLeft style={{ width: 16, height: 16 }} /> Geri
                    </button>
                    <span style={{ color: C.border }}>›</span>
                    <Link to="/" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Elanlar</Link>
                    <span style={{ color: C.border }}>›</span>
                    <span style={{ fontSize: 13, color: C.navy, fontWeight: 500 }}>{listing.title}</span>
                </div>

                {/* Title + badges row (mobile) */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, margin: 0, lineHeight: 1.2, flex: 1 }}>{listing.title}</h1>
                        <span style={{ background: avail.bg, color: avail.color, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {avail.label}
                        </span>
                    </div>
                    {listing.district && (
                        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted }}>📍 {listing.district}, {listing.address}</p>
                    )}
                </div>

                {/* Two-column grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 32, alignItems: 'start' }}>

                    {/* ── LEFT COLUMN ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                        {/* Photo Gallery */}
                        <PhotoGallery photos={listing.photos} title={listing.title} listingId={listing.id} />

                        {/* Description */}
                        {listing.description && (
                            <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Açıqlama</h3>
                                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, margin: 0 }}>{listing.description}</p>
                            </div>
                        )}

                        {/* Amenities */}
                        {listing.amenities?.length > 0 && (
                            <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Şərtlər & Avadanlıq</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {listing.amenities.map(a => (
                                        <span key={a} style={{
                                            background: C.bg, color: C.navy, borderRadius: 20,
                                            padding: '6px 14px', fontSize: 13, fontWeight: 500,
                                            border: `1px solid ${C.border}`,
                                        }}>
                                            {AMENITY_MAP[a] ?? a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Location map */}
                        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Yer</h3>
                            {listing.lat && listing.lng ? (
                                <div style={{ borderRadius: 12, overflow: 'hidden', height: 300 }}>
                                    <LocationMap lat={listing.lat} lng={listing.lng} />
                                </div>
                            ) : (
                                <div style={{
                                    height: 160, borderRadius: 12, background: '#F3F4F6',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}>
                                    <span style={{ fontSize: 32 }}>🗺️</span>
                                    <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Xəritə koordinatları qeyd edilməyib</p>
                                </div>
                            )}
                        </div>

                        {/* Report button */}
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={() => setReportModalOpen(true)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, textDecoration: 'underline' }}
                            >
                                🚩 Şikayət et
                            </button>
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN (sticky) ── */}
                    <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* Property Info Card */}
                        <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {infoRows.map(row => (
                                    <div key={row.label}>
                                        <p style={{ fontSize: 11, color: C.muted, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{row.label}</p>
                                        <p style={{ fontSize: 14, color: C.navy, margin: 0, fontWeight: 600 }}>{row.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Publisher */}
                        <div style={{ background: '#F0EDE6', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 16 }}>
                                {listing.publisherType === 'Hüquqi şəxs' ? '🏢' : '👤'}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.navy }}>{listing.publisherName ?? '—'}</p>
                                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{listing.publisherType ?? '—'}</p>
                            </div>
                        </div>

                        {/* Queue Info Box */}
                        <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 14 }}>📋 Növbə vəziyyəti</h3>

                            {!isInQueue ? (
                                /* State 1 — not in queue */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.navy }}>{queueCount}</p>
                                            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>növbəçi</p>
                                        </div>
                                        {highestOffer && (
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.gold }}>₼{highestOffer.toLocaleString()}</p>
                                                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>ən yüksək təklif</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Heat bar */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <span style={{ fontSize: 12, color: C.muted }}>Tələbat</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: heat.bar }}>{heat.label}</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${heat.pct}%`, background: heat.bar, borderRadius: 3, transition: 'width 0.6s ease' }} />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleQueueJoin}
                                        style={{
                                            width: '100%', height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700,
                                            background: C.navy, color: '#FFF', border: 'none', cursor: 'pointer',
                                        }}
                                    >
                                        🟢 Növbəyə gir — Pulsuz
                                    </button>
                                </div>
                            ) : (
                                /* State 2 — in queue */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Position badge */}
                                    <div style={{
                                        background: 'rgba(201,168,76,0.12)',
                                        border: '1px solid rgba(201,168,76,0.3)',
                                        borderRadius: 12, padding: '12px 16px',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                    }}>
                                        <div style={{ fontSize: 28, fontWeight: 900, color: C.navy }}>{myPos}</div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.navy }}>Siz növbədasınız</p>
                                            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Cari pozisiyunuz</p>
                                        </div>
                                    </div>

                                    {/* Anonymous queue table */}
                                    {queueTableRows.length > 0 && (
                                        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', background: '#F9FAFB', padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>#</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Təklif (₼/ay)</span>
                                            </div>
                                            {queueTableRows.map((row, i) => {
                                                const isMe = row.position === myPos;
                                                return (
                                                    <div key={i} style={{
                                                        display: 'grid', gridTemplateColumns: '40px 1fr',
                                                        padding: '8px 12px',
                                                        background: isMe ? 'rgba(201,168,76,0.12)' : 'transparent',
                                                        borderBottom: i < queueTableRows.length - 1 ? `1px solid ${C.border}` : 'none',
                                                    }}>
                                                        <span style={{ fontSize: 13, color: C.muted }}>{row.position}</span>
                                                        <span style={{ fontSize: 13, fontWeight: isMe ? 700 : 400, color: isMe ? C.navy : C.muted }}>
                                                            {row.priceOffer > 0 ? `₼${row.priceOffer.toLocaleString()}` : '—'}
                                                            {isMe && <span style={{ marginLeft: 6, fontSize: 11, color: C.gold }}>← siz</span>}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Update offer */}
                                    {!offerEditOpen ? (
                                        <button
                                            onClick={() => {
                                                setNewOffer(String(queueFull?.myEntry?.priceOffer ?? ''));
                                                setOfferEditOpen(true);
                                            }}
                                            style={{
                                                padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                                background: 'transparent', color: C.navy, border: `1px solid ${C.border}`, cursor: 'pointer',
                                            }}
                                        >✏️ Təklifi yenilə</button>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <input
                                                type="number"
                                                value={newOffer}
                                                onChange={e => setNewOffer(e.target.value)}
                                                placeholder="Yeni qiymət ₼"
                                                style={{
                                                    padding: '10px 14px', borderRadius: 10, fontSize: 14,
                                                    border: `1px solid ${offerError ? '#DC2626' : C.border}`,
                                                    color: C.navy, outline: 'none',
                                                }}
                                            />
                                            {offerError && <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{offerError}</p>}
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => { setOfferEditOpen(false); setOfferError(''); }}
                                                    style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                                                >Ləğv et</button>
                                                <button
                                                    onClick={handleUpdateOffer}
                                                    disabled={updateOffer.isPending}
                                                    style={{
                                                        flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                                                        background: C.gold, color: '#0A0B0F', border: 'none',
                                                        cursor: updateOffer.isPending ? 'not-allowed' : 'pointer',
                                                    }}
                                                >{updateOffer.isPending ? '...' : 'Saxla'}</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Withdraw */}
                                    {!withdrawConfirm ? (
                                        <button
                                            onClick={() => setWithdrawConfirm(true)}
                                            style={{
                                                padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                                background: 'transparent', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer',
                                            }}
                                        >🗑 Növbədən çıx</button>
                                    ) : (
                                        <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(220,38,38,0.15)' }}>
                                            <p style={{ margin: '0 0 10px', fontSize: 13, color: C.navy, fontWeight: 600 }}>Əminsiniz? Bu geri alına bilməz.</p>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => setWithdrawConfirm(false)}
                                                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                                                >Xeyr</button>
                                                <button
                                                    onClick={handleWithdraw}
                                                    disabled={withdrawQueue.isPending}
                                                    style={{
                                                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                                                        background: '#DC2626', color: '#FFF', border: 'none',
                                                        cursor: withdrawQueue.isPending ? 'not-allowed' : 'pointer',
                                                    }}
                                                >{withdrawQueue.isPending ? '...' : 'Bəli, çıx'}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Date Panel */}
                        {(listing.contractStartDate || listing.contractEndDate || listing.expectedFreeDate) && (
                            <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 14 }}>📅 Tarixlər</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {listing.contractStartDate && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 13, color: C.muted }}>Müqavilə başlanğıcı</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{formatDate(listing.contractStartDate)}</span>
                                        </div>
                                    )}
                                    {listing.contractEndDate && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 13, color: C.muted }}>Müqavilə sonu</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: C.orange }}>{formatDate(listing.contractEndDate)}</span>
                                        </div>
                                    )}
                                    {listing.expectedFreeDate && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: 13, color: C.muted }}>Gözlənilən boşalma</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: C.success }}>{formatDate(listing.expectedFreeDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Favorite Button */}
                        <button
                            onClick={handleFavorite}
                            style={{
                                width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                background: 'transparent',
                                color: isFavorited ? C.gold : C.muted,
                                border: `1px solid ${isFavorited ? C.gold : C.border}`,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'all 0.2s',
                            }}
                        >
                            <span style={{ fontSize: 18 }}>{isFavorited ? '♥' : '♡'}</span>
                            {isFavorited ? 'Seçilmişlərə əlavə edildi' : 'Seçilmişlərə əlavə et'}
                        </button>
                    </div>
                </div>
            </main>

            <PortalFooter />

            {/* Modals */}
            {queueModalOpen && id && (
                <QueueModal
                    listingId={id}
                    onClose={() => setQueueModalOpen(false)}
                    joinQueue={joinQueue}
                />
            )}
            {reportModalOpen && id && (
                <ReportModal
                    listingId={id}
                    onClose={() => setReportModalOpen(false)}
                />
            )}
        </div>
    );
}
