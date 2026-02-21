import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { label: string; value: string | number }[];
}

// Basic Select Implementation
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, options, id, ...props }, ref) => {
        const selectId = id || React.useId();

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label htmlFor={selectId} className="block text-sm font-medium text-text">
                        {label}
                    </label>
                )}
                <select
                    id={selectId}
                    ref={ref}
                    className={cn(
                        'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
                        error && 'border-red focus:ring-red',
                        className
                    )}
                    {...props}
                >
                    <option value="" disabled>Seçim edin</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-red">{error}</p>}
            </div>
        );
    }
);
Select.displayName = 'Select';
