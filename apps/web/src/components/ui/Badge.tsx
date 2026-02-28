import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'aktiv' | 'arxiv' | 'borclu' | 'draft' | 'danger';
}

export function Badge({ className, variant = 'aktiv', ...props }: BadgeProps) {
    const variants = {
        aktiv: 'bg-green/10 text-green border-transparent',
        arxiv: 'bg-muted/10 text-muted border-transparent',
        borclu: 'bg-red/10 text-red border-transparent',
        draft: 'bg-orange/10 text-orange border-transparent',
        danger: 'bg-red/20 text-red border-red/30',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
