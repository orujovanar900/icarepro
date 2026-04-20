import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { ListingCard } from '@/components/portal/ListingCard';
import { ReviewsSection } from '@/components/portal/ReviewsSection';
import { RatingBadge } from '@/components/portal/RatingBadge';
import { api } from '@/lib/api';
import type { ListingCardData } from '@/hooks/useListings';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

interface Subject {
    id: string;
    name: string;
    avatarUrl?: string | null;
    averageRating: number | null;
    totalReviews: number;
}

export function OwnerProfile() {
    const { ownerId } = useParams<{ ownerId: string }>();

    const reviewsQuery = useQuery({
        queryKey: ['reviews', ownerId],
        queryFn: async () => {
            const res = await api.get(`/reviews/${ownerId}`);
            return res.data?.data as { subject: Subject; reviews: unknown[] };
        },
        enabled: Boolean(ownerId),
        staleTime: 30_000,
    });

    const listingsQuery = useQuery({
        queryKey: ['listings', 'by-owner', ownerId],
        queryFn: async () => {
            const res = await api.get(`/listings?ownerUserId=${ownerId}&limit=50`);
            return res.data?.data as ListingCardData[];
        },
        enabled: Boolean(ownerId),
        staleTime: 30_000,
    });

    const subject = reviewsQuery.data?.subject;
    const listings = listingsQuery.data ?? [];

    if (reviewsQuery.isLoading) {
        return (
            <div style={{ background: C.bg, minHeight: '100vh' }}>
                <PortalNavbar />
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', color: C.muted }}>
                    Yüklənir…
                </div>
            </div>
        );
    }

    if (reviewsQuery.isError || !subject) {
        return (
            <div style={{ background: C.bg, minHeight: '100vh' }}>
                <PortalNavbar />
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', color: C.muted }}>
                    İstifadəçi tapılmadı.
                </div>
                <PortalFooter />
            </div>
        );
    }

    return (
        <div style={{ background: C.bg, minHeight: '100vh' }}>
            <PortalNavbar />

            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 20px 60px' }}>
                {/* Back */}
                <Link
                    to="/elanlar"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 14,
                        color: C.muted,
                        textDecoration: 'none',
                        marginBottom: 20,
                    }}
                >
                    <ArrowLeft size={16} /> Geri
                </Link>

                {/* Owner header */}
                <section
                    style={{
                        background: C.white,
                        borderRadius: 16,
                        padding: 24,
                        border: `1px solid ${C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: C.navy,
                            color: C.gold,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                            fontWeight: 700,
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        {subject.avatarUrl ? (
                            <img src={subject.avatarUrl} alt={subject.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            subject.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 240 }}>
                        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.navy }}>{subject.name}</h1>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <RatingBadge rating={subject.averageRating} totalReviews={subject.totalReviews} size="md" />
                        </div>
                    </div>
                </section>

                {/* Active listings */}
                <section style={{ marginTop: 32 }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: C.navy }}>
                        Aktiv elanlar {listings.length > 0 && <span style={{ color: C.muted, fontWeight: 500 }}>({listings.length})</span>}
                    </h2>

                    {listingsQuery.isLoading ? (
                        <div style={{ color: C.muted }}>Yüklənir…</div>
                    ) : listings.length === 0 ? (
                        <div
                            style={{
                                background: C.white,
                                borderRadius: 12,
                                padding: 24,
                                textAlign: 'center',
                                color: C.muted,
                                border: `1px solid ${C.border}`,
                                fontSize: 14,
                            }}
                        >
                            Aktiv elan yoxdur.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 20,
                            }}
                        >
                            {listings.map((l, i) => (
                                <ListingCard key={l.id} listing={l} index={i} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Reviews */}
                <section style={{ marginTop: 40 }}>
                    {ownerId && <ReviewsSection userId={ownerId} />}
                </section>
            </main>

            <PortalFooter />
        </div>
    );
}
