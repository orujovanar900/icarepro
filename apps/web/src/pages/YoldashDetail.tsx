import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, MessageCircle, Send } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { LedTicker } from '@/components/portal/LedTicker';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { PhoneReveal } from '@/components/portal/PhoneReveal';
import { api } from '@/lib/api';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    orange: '#E8620A',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const AZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const GENDER_LABELS: Record<string, string> = { MALE: 'Kişi', FEMALE: 'Qadın', ANY: 'Fərq etməz' };
const OCCUPATION_LABELS: Record<string, string> = {
    STUDENT: 'Tələbə', EMPLOYED: 'İşçi', ENTREPRENEUR: 'Sahibkar', OTHER: 'Digər',
};
const SCHEDULE_LABELS: Record<string, string> = {
    EARLY: 'Erkən yatır', LATE: 'Gec yatır', ANY: 'Fərq etməz',
};
const GUESTS_LABELS: Record<string, string> = {
    OFTEN: 'Tez-tez', SOMETIMES: 'Bəzən', NEVER: 'Heç vaxt',
};

interface YoldashAd {
    id: string;
    displayName: string;
    age: number;
    gender: string;
    districts: string[];
    budgetMin: number;
    budgetMax: number;
    startMonth: number;
    startYear: number;
    durationMonths: number | null;
    isLongTerm: boolean;
    phone: string;
    whatsapp: string | null;
    telegram: string | null;
    photoUrl: string | null;
    occupation: string | null;
    smokes: boolean | null;
    hasPets: boolean | null;
    schedule: string | null;
    guests: string | null;
    description: string | null;
    createdAt: string;
}

export function YoldashDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['yoldash-detail', id],
        queryFn: async () => {
            const res = await api.get(`/yoldash/${id}`);
            return res.data?.data as YoldashAd;
        },
        enabled: Boolean(id),
    });

    const ad = data;

    const periodText = ad ? (
        ad.isLongTerm
            ? `${AZ_MONTHS[ad.startMonth - 1]} ${ad.startYear}-dan, 1 ildən çox`
            : ad.durationMonths
                ? `${AZ_MONTHS[ad.startMonth - 1]} ${ad.startYear}-dan, ${ad.durationMonths} ay`
                : `${AZ_MONTHS[ad.startMonth - 1]} ${ad.startYear}-dan`
    ) : '';

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                    <PortalNavbar />
                    <LedTicker placement="LISTING_DETAIL" />
                </div>
                <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
                    <div style={{ height: 200, background: C.white, borderRadius: 16, opacity: 0.6 }} />
                </div>
                <PortalFooter />
            </div>
        );
    }

    if (isError || !ad) {
        return (
            <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                    <PortalNavbar />
                    <LedTicker placement="LISTING_DETAIL" />
                </div>
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: C.white, borderRadius: 20, padding: '48px 40px', textAlign: 'center', maxWidth: 400, border: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 48, marginBottom: 12 }}>🤝</p>
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Elan tapılmadı</h1>
                        <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>
                            Bu Yoldaş elanı artıq mövcud deyil.
                        </p>
                        <button
                            onClick={() => navigate('/yoldas')}
                            style={{ background: C.navy, color: '#FFF', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                        >Yoldaş səhifəsinə qayıt</button>
                    </div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    const whatsappLink = ad.whatsapp ? `https://wa.me/${ad.whatsapp.replace(/\D/g, '')}` : null;
    const telegramLink = ad.telegram
        ? (ad.telegram.startsWith('http') ? ad.telegram : `https://t.me/${ad.telegram.replace(/^@/, '')}`)
        : null;

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
                <PortalNavbar />
                <LedTicker placement="LISTING_DETAIL" />
            </div>

            <main style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '20px 20px 60px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 14, padding: 0 }}
                    >
                        <ArrowLeft style={{ width: 16, height: 16 }} /> Geri
                    </button>
                    <span style={{ color: C.border }}>›</span>
                    <Link to="/yoldas" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Yoldaş</Link>
                </div>

                {/* Card */}
                <div style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: 24, display: 'flex', gap: 20, alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                        {ad.photoUrl ? (
                            <img src={ad.photoUrl} alt={ad.displayName} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.bg}` }} />
                        ) : (
                            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #C9A84C, #E8620A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 40, fontWeight: 800 }}>
                                {ad.displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.navy }}>
                                {ad.displayName}, {ad.age}
                            </h1>
                            <span style={{
                                display: 'inline-block', marginTop: 8,
                                fontSize: 12, fontWeight: 600,
                                padding: '4px 12px', borderRadius: 12,
                                background: ad.gender === 'FEMALE' ? '#FCE7F3' : ad.gender === 'MALE' ? '#DBEAFE' : '#F3F4F6',
                                color: ad.gender === 'FEMALE' ? '#BE185D' : ad.gender === 'MALE' ? '#1D4ED8' : '#374151',
                            }}>{GENDER_LABELS[ad.gender] ?? ad.gender}</span>
                        </div>
                    </div>

                    {/* Body grid */}
                    <div style={{ padding: 24, display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                        <Section label="Axtardığı rayonlar">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {ad.districts.map(d => (
                                    <span key={d} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        fontSize: 12, padding: '4px 10px', borderRadius: 14,
                                        background: C.bg, color: C.navy, fontWeight: 500,
                                    }}>
                                        <MapPin style={{ width: 11, height: 11 }} /> {d}
                                    </span>
                                ))}
                            </div>
                        </Section>

                        <Section label="Büdcə (öz payı)">
                            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.gold }}>{ad.budgetMin}–{ad.budgetMax} AZN/ay</p>
                        </Section>

                        <Section label="Müddət">
                            <p style={{ margin: 0, fontSize: 14, color: C.navy, fontWeight: 600 }}>{periodText}</p>
                        </Section>

                        {ad.occupation && (
                            <Section label="Fəaliyyət növü">
                                <p style={{ margin: 0, fontSize: 14, color: C.navy }}>{OCCUPATION_LABELS[ad.occupation] ?? ad.occupation}</p>
                            </Section>
                        )}

                        {ad.smokes !== null && (
                            <Section label="Siqaret">
                                <p style={{ margin: 0, fontSize: 14, color: C.navy }}>{ad.smokes ? 'Çəkir' : 'Çəkmir'}</p>
                            </Section>
                        )}

                        {ad.hasPets !== null && (
                            <Section label="Ev heyvanı">
                                <p style={{ margin: 0, fontSize: 14, color: C.navy }}>{ad.hasPets ? 'Var' : 'Yoxdur'}</p>
                            </Section>
                        )}

                        {ad.schedule && (
                            <Section label="Rejim">
                                <p style={{ margin: 0, fontSize: 14, color: C.navy }}>{SCHEDULE_LABELS[ad.schedule] ?? ad.schedule}</p>
                            </Section>
                        )}

                        {ad.guests && (
                            <Section label="Qonaq">
                                <p style={{ margin: 0, fontSize: 14, color: C.navy }}>{GUESTS_LABELS[ad.guests] ?? ad.guests}</p>
                            </Section>
                        )}
                    </div>

                    {/* Description */}
                    {ad.description && (
                        <div style={{ padding: '0 24px 24px' }}>
                            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>
                                Özü haqqında
                            </h3>
                            <p style={{ margin: 0, fontSize: 14, color: C.navy, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ad.description}</p>
                        </div>
                    )}

                    {/* Contact */}
                    <div style={{ padding: 24, borderTop: `1px solid ${C.border}`, background: C.bg }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px' }}>
                            Əlaqə
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            <PhoneReveal adId={ad.id} initialPhone={ad.phone} />
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                    background: '#25D366', color: '#FFF', textDecoration: 'none',
                                }}>
                                    <MessageCircle style={{ width: 16, height: 16 }} /> WhatsApp
                                </a>
                            )}
                            {telegramLink && (
                                <a href={telegramLink} target="_blank" rel="noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                    background: '#229ED9', color: '#FFF', textDecoration: 'none',
                                }}>
                                    <Send style={{ width: 16, height: 16 }} /> Telegram
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <Link to="/yoldas/yeni" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)', color: '#0A0B0F',
                        fontWeight: 700, padding: '12px 22px',
                        borderRadius: 12, textDecoration: 'none',
                        fontSize: 14,
                    }}>
                        ＋ Siz də Yoldaş elanı verin
                    </Link>
                </div>
            </main>

            <PortalFooter />
        </div>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</p>
            <div style={{ marginTop: 4 }}>{children}</div>
        </div>
    );
}
