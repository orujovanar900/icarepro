import React from 'react';

export function PageSkeleton() {
    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto w-full animate-pulse">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-10 w-10 bg-surface rounded-full"></div>
                <div className="h-8 bg-surface rounded w-64"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="h-32 bg-surface rounded-xl"></div>
                <div className="h-32 bg-surface rounded-xl hidden md:block"></div>
                <div className="h-32 bg-surface rounded-xl hidden md:block"></div>
            </div>

            <div className="h-64 bg-surface rounded-xl w-full"></div>
        </div>
    );
}
