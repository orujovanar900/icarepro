import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { RatingBadge } from './RatingBadge';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
    cream: '#F5F0E8',
};

interface Review {
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    updatedAt: string;
    author: { id: string; name: string; avatarUrl?: string | null };
}

interface SubjectData {
    id: string;
    name: string;
    avatarUrl?: string | null;
    averageRating: number | null;
    totalReviews: number;
}

interface ReviewsResponse {
    success: boolean;
    data: { subject: SubjectData; reviews: Review[] };
}

interface Props {
    userId: string;
    /** Visible title. Default "Rəylər" */
    title?: string;
}

function formatReviewDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
    const [hover, setHover] = useState<number | null>(null);
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => {
                const active = (hover ?? value) >= n;
                return (
                    <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        onMouseEnter={() => !disabled && setHover(n)}
                        onMouseLeave={() => setHover(null)}
                        onClick={() => !disabled && onChange(n)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: disabled ? 'default' : 'pointer',
                            padding: 4,
                            lineHeight: 0,
                        }}
                        aria-label={`${n} ulduz`}
                    >
                        <Star
                            size={28}
                            fill={active ? '#D97706' : 'none'}
                            stroke={active ? '#D97706' : '#9CA3AF'}
                            strokeWidth={2}
                        />
                    </button>
                );
            })}
        </div>
    );
}

function ReviewForm({ userId }: { userId: string }) {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { addToast } = useToastStore();

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const isSelf = isAuthenticated && user?.id === userId;

    const mutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`/reviews/${userId}`, {
                rating,
                comment: comment.trim() || undefined,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews', userId] });
            queryClient.invalidateQueries({ queryKey: ['listing'] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            addToast({ type: 'success', message: 'Rəyiniz göndərildi' });
            setRating(0);
            setComment('');
        },
        onError: (err: any) => {
            addToast({ type: 'error', message: err?.response?.data?.error || 'Rəy göndərilmədi' });
        },
    });

    if (isSelf) {
        return (
            <div
                style={{
                    background: C.cream,
                    borderRadius: 12,
                    padding: 16,
                    color: C.muted,
                    fontSize: 13,
                    textAlign: 'center',
                }}
            >
                Öz hesabınıza rəy yaza bilməzsiniz.
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div
                style={{
                    background: C.cream,
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                }}
            >
                <span style={{ fontSize: 13, color: C.navy }}>Rəy yazmaq üçün daxil olun.</span>
                <button
                    onClick={() => {
                        sessionStorage.setItem('portalIntent', window.location.pathname);
                        navigate('/login');
                    }}
                    style={{
                        background: C.navy,
                        color: C.gold,
                        border: 'none',
                        borderRadius: 10,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Daxil ol
                </button>
            </div>
        );
    }

    const canSubmit = rating >= 1 && rating <= 5 && !mutation.isPending;

    return (
        <form
            onSubmit={e => {
                e.preventDefault();
                if (!canSubmit) return;
                mutation.mutate();
            }}
            style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
            }}
        >
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.navy }}>Rəy yazın</p>
            <StarPicker value={rating} onChange={setRating} disabled={mutation.isPending} />
            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Təcrübənizi bölüşün (könüllü)"
                rows={3}
                maxLength={1000}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    color: C.navy,
                    resize: 'vertical',
                    outline: 'none',
                }}
            />
            <button
                type="submit"
                disabled={!canSubmit}
                style={{
                    alignSelf: 'flex-start',
                    background: canSubmit ? C.navy : '#9CA3AF',
                    color: canSubmit ? C.gold : '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
            >
                {mutation.isPending ? 'Göndərilir…' : 'Rəy göndər'}
            </button>
        </form>
    );
}

function ReviewsList({ reviews, subjectId }: { reviews: Review[]; subjectId: string }) {
    const { user, isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const { addToast } = useToastStore();

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/reviews/${subjectId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            queryClient.invalidateQueries({ queryKey: ['listing'] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            addToast({ type: 'success', message: 'Rəy silindi' });
        },
        onError: () => addToast({ type: 'error', message: 'Rəy silinmədi' }),
    });

    if (reviews.length === 0) {
        return (
            <div
                style={{
                    background: C.cream,
                    borderRadius: 12,
                    padding: 24,
                    textAlign: 'center',
                    color: C.muted,
                    fontSize: 14,
                }}
            >
                Hələ rəy yoxdur. İlk rəy yazan siz olun.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(rv => {
                const isOwn = isAuthenticated && user?.id === rv.author.id;
                return (
                    <div
                        key={rv.id}
                        style={{
                            background: C.white,
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: C.navy,
                                        color: C.gold,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {rv.author.avatarUrl ? (
                                        <img src={rv.author.avatarUrl} alt={rv.author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        rv.author.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.navy }}>{rv.author.name}</p>
                                    <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{formatReviewDate(rv.createdAt)}</p>
                                </div>
                            </div>
                            <RatingBadge rating={rv.rating} totalReviews={0} showCount={false} size="sm" />
                        </div>
                        {rv.comment && (
                            <p style={{ margin: '12px 0 0', fontSize: 14, color: C.navy, whiteSpace: 'pre-wrap' }}>
                                {rv.comment}
                            </p>
                        )}
                        {isOwn && (
                            <div style={{ marginTop: 10 }}>
                                <button
                                    type="button"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate()}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#DC2626',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        padding: 0,
                                        textDecoration: 'underline',
                                    }}
                                >
                                    {deleteMutation.isPending ? 'Silinir…' : 'Rəyi sil'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function ReviewsSection({ userId, title = 'Rəylər' }: Props) {
    const query = useQuery<ReviewsResponse>({
        queryKey: ['reviews', userId],
        queryFn: async () => {
            const res = await api.get(`/reviews/${userId}`);
            return res.data;
        },
        enabled: Boolean(userId),
        staleTime: 30_000,
    });

    const subject = query.data?.data.subject;
    const reviews = query.data?.data.reviews ?? [];

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>{title}</h2>
                {subject && (
                    <RatingBadge
                        rating={subject.averageRating}
                        totalReviews={subject.totalReviews}
                        size="md"
                    />
                )}
            </div>

            <ReviewForm userId={userId} />

            {query.isLoading ? (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: 14, padding: 20 }}>Yüklənir…</div>
            ) : (
                <ReviewsList reviews={reviews} subjectId={userId} />
            )}
        </section>
    );
}
