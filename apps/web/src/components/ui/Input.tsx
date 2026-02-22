import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, id, ...props }, ref) => {
        const inputId = id || React.useId();

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-text">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        id={inputId}
                        ref={ref}
                        className={cn(
                            'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                            error && 'border-red focus:ring-red',
                            props.rightElement && 'pr-10',
                            className
                        )}
                        {...props}
                    />
                    {props.rightElement && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            {props.rightElement}
                        </div>
                    )}
                </div>
                {(error || helperText) && (
                    <p className={cn('text-xs', error ? 'text-red' : 'text-muted')}>
                        {error || helperText}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
