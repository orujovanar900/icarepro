import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

const ACTION_LABELS: Record<string, string> = {
    plan_changed:      'Plan dəyişikliyi',
    org_suspended:     'Dayandırıldı',
    org_activated:     'Aktivləşdirildi',
    listing_approved:  'Elan təsdiqləndi',
    listing_rejected:  'Elan rədd edildi',
    staff_added:       'Staff əlavə edildi',
};

const ACTION_BADGE: Record<string, string> = {
    plan_changed:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
    org_suspended:    'bg-red-500/15 text-red-400 border-red-500/30',
    org_activated:    'bg-green-500/15 text-green-400 border-green-500/30',
    listing_approved: 'bg-green-500/15 text-green-400 border-green-500/30',
    listing_rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
    staff_added:      'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

function ActionBadge({ action }: { action: string }) {
    const cls = ACTION_BADGE[action] ?? 'bg-surface text-muted border-border';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            {ACTION_LABELS[action] ?? action}
        </span>
    );
}

function summariseValue(val: Record<string, unknown> | null | undefined): string {
    if (!val) return '—';
    // For plan changes show plan name
    if ('plan' in val) return String(val['plan']);
    // For status changes
    if ('isActive' in val) return val['isActive'] ? 'Aktiv' : 'Deaktiv';
    if ('status' in val) return String(val['status']);
    // Generic: show first scalar key=value pair
    const entry = Object.entries(val).find(([, v]) => typeof v !== 'object');
    return entry ? `${entry[0]}: ${entry[1]}` : JSON.stringify(val).slice(0, 40);
}

const ENTITY_TYPE_OPTIONS = [
    { label: 'Hamısı',       value: '' },
    { label: 'Təşkilat',     value: 'organization' },
    { label: 'İstifadəçi',   value: 'staff' },
    { label: 'Elan',         value: 'listing' },
];

const LIMIT = 50;

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditLogPage() {
    const [entityType, setEntityType] = useState('');
    const [actorEmail, setActorEmail] = useState('');
    const [page, setPage] = useState(1);

    const queryKey = ['admin-audit-log', page, entityType, actorEmail];

    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
                ...(entityType  ? { entityType }  : {}),
                ...(actorEmail  ? { actorEmail }   : {}),
            });
            const res = await api.get(`/admin/audit-log?${params}`);
            return res.data as { data: any[]; total: number; page: number; limit: number };
        },
        placeholderData: (prev) => prev,
    });

    const rows     = data?.data ?? [];
    const total    = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setPage(1);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 pb-24">
            <div>
                <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-gold" />
                    Audit Log
                </h1>
                <p className="text-sm text-muted mt-1">Platformada edilən bütün dəyişikliklər</p>
            </div>

            {/* Filter bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                            value={entityType}
                            onChange={(e) => handleFilterChange(setEntityType)(e.target.value)}
                            options={ENTITY_TYPE_OPTIONS}
                        />
                        <Input
                            placeholder="Email ilə axtar..."
                            value={actorEmail}
                            onChange={(e) => handleFilterChange(setActorEmail)(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface border-b border-border text-muted">
                            <tr>
                                <th className="p-4 font-medium text-left">Tarix</th>
                                <th className="p-4 font-medium text-left">Kim</th>
                                <th className="p-4 font-medium text-left">Əməliyyat</th>
                                <th className="p-4 font-medium text-left">Obyekt</th>
                                <th className="p-4 font-medium text-left">Əvvəlki dəyər</th>
                                <th className="p-4 font-medium text-left">Yeni dəyər</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading && Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} className="p-4">
                                            <div className="h-4 bg-surface rounded w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-muted">
                                        <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                        <p>Hələ heç bir əməliyyat qeyd edilməyib.</p>
                                    </td>
                                </tr>
                            )}

                            {!isLoading && rows.map((row: any) => (
                                <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                                    <td className="p-4 text-muted whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                                    <td className="p-4">
                                        <div className="text-text text-sm leading-tight">
                                            {row.actor?.name ?? row.actorEmail ?? 'System'}
                                        </div>
                                        {row.actor?.email && (
                                            <div className="text-xs text-muted">{row.actor.email}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <ActionBadge action={row.action} />
                                    </td>
                                    <td className="p-4">
                                        <div className="text-text text-sm">{row.entityLabel ?? '—'}</div>
                                        <div className="text-xs text-muted">{row.entityType}</div>
                                    </td>
                                    <td className="p-4 text-muted text-sm">
                                        {summariseValue(row.oldValue)}
                                    </td>
                                    <td className="p-4 text-muted text-sm">
                                        {summariseValue(row.newValue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && total > 0 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                        <span className="text-sm text-muted">
                            Cəmi: {total} qeyd
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="flex items-center gap-1 text-sm text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Əvvəlki
                            </button>
                            <span className="text-sm text-text">Səhifə {page} / {totalPages}</span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="flex items-center gap-1 text-sm text-muted hover:text-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Sonrakı <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
