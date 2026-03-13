import * as React from 'react';
import { List, Map } from 'lucide-react';
import type { ListingFilters } from '@/hooks/useListings';

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    bg: '#F5F0E8',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const TYPE_TABS = [
    { value: '', label: 'Hamısı' },
    { value: 'MENZIL', label: 'Mənzil' },
    { value: 'OFIS', label: 'Ofis' },
    { value: 'MAGAZA', label: 'Mağaza' },
    { value: 'VILLA', label: 'Villa' },
];

const AVAIL_TABS = [
    { value: '', label: 'Hamısı' },
    { value: 'BOSHDUR', label: '✅ Boşdur' },
    { value: 'BOSHALIR', label: '📅 Boşalır' },
    { value: 'TUTULUB', label: '🔒 Tutulub' },
];

const SORT_OPTIONS = [
    { value: 'default', label: 'Tövsiyə edilən' },
    { value: 'price_asc', label: 'Qiymət: aşağıdan' },
    { value: 'price_desc', label: 'Qiymət: yuxarıdan' },
    { value: 'newest', label: 'Ən yeni' },
    { value: 'queue_desc', label: 'Ən çox növbəli' },
];

interface Props {
    filters: ListingFilters;
    total: number;
    viewMode: 'grid' | 'map';
    onViewMode: (v: 'grid' | 'map') => void;
    onUpdateFilter: (key: keyof ListingFilters, value: string | string[]) => void;
}

export function FilterTabsBar({ filters, total, viewMode, onViewMode, onUpdateFilter }: Props) {
    return (
        <div className="sticky top-16 z-40 w-full" style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col gap-3">
                {/* Row 1: type tabs + view toggle */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Type tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {TYPE_TABS.map(t => {
                            const active = filters.type === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => onUpdateFilter('type', t.value)}
                                    className="text-sm font-medium px-4 py-1.5 rounded-full transition-all"
                                    style={active
                                        ? { background: 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)', backgroundSize: '200% 200%', color: '#0A0B0F', fontWeight: 700, border: 'none' }
                                        : { background: C.surface, color: C.muted, border: `1px solid ${C.border}` }
                                    }
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right: count + view toggle */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: C.muted }}>
                            <span className="font-semibold" style={{ color: C.navy }}>{total}</span> elan tapıldı
                        </span>
                        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                            <button
                                onClick={() => onViewMode('grid')}
                                className="p-2 transition-colors"
                                style={{ background: viewMode === 'grid' ? '#C9A84C' : C.surface, color: viewMode === 'grid' ? '#0A0B0F' : C.muted }}
                            >
                                <List className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onViewMode('map')}
                                className="p-2 transition-colors"
                                style={{ background: viewMode === 'map' ? '#C9A84C' : C.surface, color: viewMode === 'map' ? '#0A0B0F' : C.muted }}
                            >
                                <Map className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: avail tabs + sort */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Avail status tabs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {AVAIL_TABS.map(t => {
                            const active = filters.availStatus === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => onUpdateFilter('availStatus', t.value)}
                                    className="text-[12px] font-medium px-3 py-1 rounded-full transition-all"
                                    style={active
                                        ? { background: '#C9A84C', color: '#0A0B0F', fontWeight: 600, border: 'none' }
                                        : { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }
                                    }
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sort */}
                    <select
                        value={filters.sort}
                        onChange={e => onUpdateFilter('sort', e.target.value)}
                        className="text-sm px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                        style={{ background: C.surface, color: C.navy, border: `1px solid ${C.border}` }}
                    >
                        {SORT_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
