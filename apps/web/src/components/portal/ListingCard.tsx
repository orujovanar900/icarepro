import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { ListingCardData } from '@/hooks/useListings';

// Portal palette
const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    text: '#1A1A2E',
};

// Gradient pool — index cycles through
const GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
];

const AMENITY_MAP: Record<string, string> = {
    MEBEL: '🛋 Mebel',
    KONDISIONER: '❄️ Kondisioner',
    LIFT: '🛗 Lift',
    BALKON: '🪟 Balkon',
    INTERNET: '📶 İnternet',
    PARKLAMA: '🅿️ Parklama',
    TEXNIKI_XIDMET: '🔧 Texniki xidmət',
    ISITME: '🌡 İsitmə',
    GUVƏNLIK: '🔒 Güvənlik',
    HOVUZ: '🏊 Hovuz',
};

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

function formatFreeDate(dateStr?: string): string | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()} sonu`;
}

function HeatBar({ level }: { level: 'AZ' | 'ORTA' | 'YUKSEK' }) {
    const pct = level === 'AZ' ? 12 : level === 'ORTA' ? 50 : 88;
    const dotColor = level === 'AZ' ? '#9CA3AF' : level === 'ORTA' ? C.orange : '#EF4444';
    const label = level === 'AZ' ? 'Az tələbat' : level === 'ORTA' ? 'Orta tələbat' : 'Yüksək tələbat';
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: C.muted }}>Tələbat səviyyəsi:</span>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: dotColor }} />
                <span className="text-[11px] font-medium" style={{ color: dotColor }}>{label}</span>
            </div>
            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #E5E7EB 0%, #FB923C 50%, #EF4444 100%)' }}>
                <div
                    className="absolute top-0 bottom-0 w-2.5 h-2.5 rounded-full -translate-y-1/4 shadow"
                    style={{ left: `calc(${pct}% - 5px)`, background: dotColor, border: '2px solid white' }}
                />
            </div>
            <div className="flex justify-between text-[10px]" style={{ color: C.muted }}>
                <span>Az</span><span>Orta</span><span>Yüksək</span>
            </div>
        </div>
    );
}

interface Props {
    listing: ListingCardData;
    index?: number;
}

export const ListingCard = React.memo(function ListingCard({ listing, index = 0 }: Props) {
    const navigate = useNavigate();
    const gradient = listing.photos[0] ? undefined : GRADIENTS[index % GRADIENTS.length];
    const freeDate = formatFreeDate(listing.expectedFreeDate ?? listing.contractEndDate ?? undefined);
    const isVacant = listing.availStatus === 'BOSHDUR';

    // Heat badge on photo
    const photoBadge = listing.heatLevel === 'YUKSEK'
        ? { label: '🔥 Çox istənilən', bg: '#FEE2E2', color: '#DC2626' }
        : listing.isVip
        ? { label: '⭐ VIP', bg: '#FEF3C7', color: '#D97706' }
        : listing.isPanorama
        ? { label: '👁 360°', bg: '#EFF6FF', color: '#1D4ED8' }
        : { label: '⚡ Yeni', bg: '#FEF9C3', color: '#A16207' };

    const typeIcon = listing.type === 'OFIS' ? '🏢' : listing.type === 'MAGAZA' ? '🏪' : '🏠';

    return (
        <div
            className="flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-200"
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            onClick={() => navigate(`/elan/${listing.id}`)}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        >
            {/* Photo / Gradient area */}
            <div className="relative overflow-hidden" style={{ height: '220px', background: gradient ?? '#F5F0E8' }}>
                {listing.photos[0] ? (
                    <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl opacity-40">{typeIcon}</span>
                    </div>
                )}

                {/* Overlay for better badge readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.3) 100%)' }} />

                {/* Heat badge top-left */}
                <span className="absolute top-3 left-3 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: photoBadge.bg, color: photoBadge.color }}>
                    {photoBadge.label}
                </span>

                {/* Queue badge top-right */}
                {listing.queueCount > 0 && (
                    <span className="absolute top-3 right-3 text-[11px] font-medium px-2 py-1 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        {listing.queueCount} növbədə 👥
                    </span>
                )}

                {/* Free date badge bottom-left */}
                {freeDate && (
                    <span className="absolute bottom-3 left-3 text-[11px] font-medium px-2 py-1 rounded-full text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        Son gün: {freeDate.replace(' sonu', '')}
                    </span>
                )}

                {/* Vacant overlay */}
                {isVacant && (
                    <div className="absolute bottom-3 right-3">
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
                            ✅ Hazırda boşdur
                        </span>
                    </div>
                )}
            </div>

            {/* Card body */}
            <div className="flex flex-col flex-1 p-4 gap-3">
                {/* Title */}
                <div>
                    <h3 className="font-semibold text-base leading-tight" style={{ color: C.text }}>
                        {listing.rooms ? `${listing.rooms} otaqlı ` : ''}{listing.title}
                    </h3>
                    <p className="flex items-center gap-1 mt-1 text-[13px]" style={{ color: C.muted }}>
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {[listing.district, listing.address, listing.area ? `${listing.area}m²` : null, (listing.floor && listing.totalFloors) ? `${listing.floor}/${listing.totalFloors} mərtəbə` : null].filter(Boolean).join(' · ')}
                    </p>
                </div>

                {/* Amenity pills */}
                {listing.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {listing.amenities.slice(0, 5).map(a => (
                            <span key={a} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}>
                                {AMENITY_MAP[a] ?? a}
                            </span>
                        ))}
                    </div>
                )}

                {/* Price row */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[11px]" style={{ color: C.muted }}>Başlanğıc qiymət</p>
                        <p className="text-base font-bold" style={{ color: C.gold }}>{listing.basePrice ? `${listing.basePrice.toLocaleString()} AZN/ay` : '—'}</p>
                    </div>
                    {listing.highestOffer && (
                        <div className="text-right">
                            <p className="text-[11px]" style={{ color: C.muted }}>Ən yüksək təklif</p>
                            <p className="text-base font-bold" style={{ color: C.orange }}>{listing.highestOffer.toLocaleString()} AZN</p>
                        </div>
                    )}
                </div>

                {/* Free date row */}
                {freeDate && (
                    <p className="text-[13px]" style={{ color: C.muted }}>
                        Təxmini boşalma tarixi: <span className="font-medium" style={{ color: C.text }}>📅 {freeDate}</span>
                    </p>
                )}

                {/* Heat bar */}
                <HeatBar level={listing.heatLevel} />

                {/* CTA */}
                <button
                    className="w-full mt-auto py-2.5 rounded-[10px] text-sm font-medium text-white transition-colors"
                    style={{ background: C.navy }}
                    onClick={e => { e.stopPropagation(); navigate(`/elan/${listing.id}`); }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#252540'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.navy; }}
                >
                    Sıraya gir &amp; Profil yarat →
                </button>
            </div>
        </div>
    );
});
