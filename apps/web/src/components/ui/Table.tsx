import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
    return (
        <div className="relative w-full overflow-auto rounded-md border border-border bg-card">
            <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead className={cn('[&_tr]:border-b border-border bg-surface/50', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={cn('border-b border-border transition-colors hover:bg-surface/50', className)}
            {...props}
        />
    );
}

export function TableHead({
    className,
    sortable,
    sortDirection,
    onSort,
    children,
    ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
    onSort?: () => void;
}) {
    return (
        <th
            className={cn(
                'h-12 px-4 text-left align-middle font-medium text-muted',
                sortable && 'cursor-pointer select-none hover:text-text hover:bg-surface transition-colors',
                className
            )}
            onClick={sortable ? onSort : undefined}
            {...props}
        >
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                {sortable && sortDirection && (
                    <span className="text-gold">
                        {sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    </span>
                )}
            </div>
        </th>
    );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return <td className={cn('p-4 align-middle text-text', className)} {...props} />;
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <Table>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow key={i}>
                        {Array.from({ length: columns }).map((_, j) => (
                            <TableCell key={j}>
                                <div className="h-4 w-full animate-pulse rounded bg-surface" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
