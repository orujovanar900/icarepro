import * as React from 'react';
import { Star } from 'lucide-react';

interface Props {
    rating: number | null | undefined;
    totalReviews?: number;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
}

export const RatingBadge = React.memo(function RatingBadge({
    rating,
    totalReviews = 0,
    size = 'sm',
    showCount = true,
}: Props) {
    const hasRating = typeof rating === 'number' && rating > 0;
    const display = hasRating ? rating!.toFixed(1) : '—';

    const dims = size === 'lg'
        ? { padV: 6, padH: 10, font: 14, icon: 16, gap: 6 }
        : size === 'md'
        ? { padV: 4, padH: 8, font: 12, icon: 13, gap: 5 }
        : { padV: 2, padH: 6, font: 11, icon: 12, gap: 4 };

    const color = hasRating ? '#D97706' : '#9CA3AF';
    const bg = hasRating ? '#FEF3C7' : '#F3F4F6';

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: dims.gap,
                padding: `${dims.padV}px ${dims.padH}px`,
                borderRadius: 999,
                background: bg,
                color,
                fontSize: dims.font,
                fontWeight: 600,
                lineHeight: 1,
            }}
            title={hasRating ? `${display} / 5 · ${totalReviews} rəy` : 'Rəy yoxdur'}
        >
            <Star
                size={dims.icon}
                fill={hasRating ? color : 'none'}
                stroke={color}
                strokeWidth={2}
            />
            <span>{display}</span>
            {showCount && totalReviews > 0 && (
                <span style={{ color: '#6B7280', fontWeight: 500 }}>({totalReviews})</span>
            )}
        </span>
    );
});
