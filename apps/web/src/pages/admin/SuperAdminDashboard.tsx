import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Link } from 'react-router-dom';
import {
    Building2, Users, Home, TrendingUp, AlertCircle, Activity,
    Calendar, PencilLine, CheckCircle2, Clock, XCircle, Gift, Info, FileText, UserCheck
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line, Area, AreaChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PlanModal, PLAN_LABELS } from '@/components/admin/PlanModal';

const PLAN_PRICES: Record<string, string> = {
    FREE_TRIAL: '0',
    BASHLANQIC: '29 AZN/ay',
    BIZNES: '69 AZN/ay',
    KORPORATIV: '149 AZN/ay',
};

const PIE_COLORS = ['#60a5fa', '#34d399', '#C9A84C', '#a78bfa', '#2dd4bf'];

function StatCard({ title, value, subtitle, color, icon: Icon }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
    icon: any;
}) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted">{title}</p>
                        <p className="text-3xl font-extrabold mt-1" style={{ color }}>{value}</p>
                        {subtitle && <p className="text-xs mt-1" style={{ color: color + 'aa' }}>{subtitle}</p>}
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ────────────────────────────────────────────────────────────
// Custom Donut Label
// ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-surface border border-border rounded-lg p-3 text-sm shadow-xl">
                <p className="font-bold text-text">{PLAN_LABELS[d.plan] || d.plan}</p>
                <p className="text-muted">{d.count} təşkilat</p>
                {d.price > 0 && <p className="text-gold">{d.count * d.price} AZN MRR</p>}
            </div>
        );
    }
    return null;
};

// ────────────────────────────────────────────────────────────
// Main Dashboard
// ────────────────────────────────────────────────────────────
export function SuperAdminDashboard() {
    const addToast = useToastStore((s) => s.addToast);
    const [planModalOrg, setPlanModalOrg] = useState<any>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: async () => {
            const res = await api.get('/admin/stats');
            return res.data?.data;
        },
        refetchInterval: 60000,
    });

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
                <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted">Dashboard yüklənir...</p>
            </div>
        </div>
    );

    if (isError || !data) return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-red">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-60" />
                <p>Məlumatları yükləmək mümkün olmadı.</p>
            </div>
        </div>
    );

    const { overview, mrr, planDistribution, monthlyRegistrations, mrrTrend, health, expiringInWeek, recentActivity, topOrganizations } = data;

    const mrrGrowth = mrrTrend.length >= 2
        ? Math.round(((mrrTrend[mrrTrend.length - 1].mrr - mrrTrend[mrrTrend.length - 2].mrr) / Math.max(1, mrrTrend[mrrTrend.length - 2].mrr)) * 100)
        : 0;

    const getActivityIcon = (action: string) => {
        if (action === 'PLAN_CHANGED') return <TrendingUp className="w-4 h-4 text-green-400" />;
        if (action === 'SUSPENDED') return <XCircle className="w-4 h-4 text-red-400" />;
        if (action === 'GRACE_STARTED') return <Clock className="w-4 h-4 text-yellow-400" />;
        if (action === 'ACTIVATED') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        if (action === 'CREATE_CONTRACT' || action === 'UPDATE_CONTRACT' || action === 'DELETE_CONTRACT') return <FileText className="w-4 h-4 text-blue-400" />;
        if (action === 'CREATE_PROPERTY' || action === 'UPDATE_PROPERTY' || action === 'DELETE_PROPERTY') return <Home className="w-4 h-4 text-blue-400" />;
        if (action === 'CREATE_TENANT') return <UserCheck className="w-4 h-4 text-blue-400" />;
        return <Activity className="w-4 h-4 text-blue-400" />;
    };

    const getReadableAction = (action: string) => {
        const map: Record<string, string> = {
            UPDATE_CONTRACT: 'Müqavilə yeniləndi',
            CREATE_CONTRACT: 'Yeni müqavilə yaradıldı',
            DELETE_CONTRACT: 'Müqavilə silindi',
            CREATE_PROPERTY: 'Yeni obyekt əlavə edildi',
            UPDATE_PROPERTY: 'Obyekt məlumatları dəyişdirildi',
            DELETE_PROPERTY: 'Obyekt silindi',
            CREATE_TENANT: 'Yeni kirayəçi əlavə edildi',
            USER_LOGIN: 'İstifadəçi daxil oldu',
            PLAN_CHANGED: 'Abunəlik planı dəyişdirildi',
            SUSPENDED: 'Hesab dayandırıldı',
            ACTIVATED: 'Hesab aktivləşdirildi',
            REGISTER: 'Yeni qeydiyyat',
            CREATE_PAYMENT: 'Ödəniş əlavə edildi',
            GRACE_STARTED: 'Möhlət dövrü başladı',
        };
        return map[action] || action;
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins} dəq əvvəl`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} saat əvvəl`;
        return `${Math.floor(hrs / 24)} gün əvvəl`;
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-[1400px] mx-auto pb-24">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Activity className="w-8 h-8 text-gold" />
                    SuperAdmin Dashboard
                </h1>
                <p className="text-sm text-muted mt-1">Platform ümumi vəziyyəti — real vaxt</p>
            </div>

            {/* ── SECTION 1: Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Cəmi Təşkilatlar" value={overview.totalOrganizations} icon={Building2} color="#60a5fa" />
                <StatCard title="Aktiv Planlar" value={overview.activePlans} icon={CheckCircle2} color="#34d399" />
                <StatCard
                    title="Bu ay yeni"
                    value={`+${overview.newThisMonth}`}
                    subtitle={`${overview.newThisMonthGrowth >= 0 ? '▲' : '▼'} ${Math.abs(overview.newThisMonthGrowth)}%`}
                    icon={TrendingUp}
                    color="#C9A84C"
                />
                <StatCard title="Cəmi İstifadəçi" value={overview.totalUsers} icon={Users} color="#a78bfa" />
                <StatCard title="Cəmi Obyekt" value={overview.totalProperties} icon={Home} color="#2dd4bf" />
                <StatCard title="Dayandırılmış" value={overview.suspendedCount} icon={XCircle} color="#f87171" />
            </div>

            {/* ── SECTION 2: Plan Distribution + Registrations ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Donut: Plan distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Gift className="w-4 h-4 text-gold" />
                            Plan bölgüsü
                            <div className="group relative ml-auto flex items-center">
                                <Info className="w-4 h-4 text-muted hover:text-text transition-colors cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 bg-surface border border-border rounded-lg p-3 text-sm text-white shadow-xl z-50">
                                    <p className="font-bold text-gold mb-1">MRR (Monthly Recurring Revenue)</p>
                                    <p className="text-xs text-muted leading-relaxed">
                                        Aylıq Təkrarlanan Gəlir. Aktiv abunəliklərdən əldə edilən ümumi aylıq gəliri göstərir.<br /><br />
                                        Hesablama: (Başlanğıc × 29) + (Biznes × 69) + (Korporativ × 149) AZN
                                    </p>
                                    <div className="absolute right-1.5 -bottom-1.5 w-3 h-3 bg-surface border-b border-r border-border transform rotate-45"></div>
                                </div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center mb-3">
                            <p className="text-xs text-muted">Aylıq Gəlir (MRR)</p>
                            <p className="text-3xl font-extrabold text-gold">{mrr.toLocaleString('az-AZ')} AZN</p>
                            <p className="text-xs text-muted mt-1">
                                {mrrGrowth >= 0 ? '▲' : '▼'} {Math.abs(mrrGrowth)}% ötən aya nəzərən
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={planDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="count"
                                >
                                    {planDistribution.map((_: any, index: number) => (
                                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {planDistribution.map((d: any, i: number) => (
                                <div key={d.plan} className="flex items-center gap-2 text-xs">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span className="text-muted">{PLAN_LABELS[d.plan] || d.plan}: <span className="text-text font-bold">{d.count}</span></span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Bar: New Registrations */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="w-4 h-4 text-gold" />
                            Yeni qeydiyyatlar (son 12 ay)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={monthlyRegistrations} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }} />
                                <Bar dataKey="count" fill="#C9A84C" radius={[4, 4, 0, 0]} name="Yeni qeydiyyat" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ── SECTION 3: MRR Trend ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gold" />
                        MRR Trendi (son 12 ay)
                        <div className="group relative ml-2 flex items-center">
                            <Info className="w-4 h-4 text-muted hover:text-text transition-colors cursor-help" />
                            <div className="absolute left-1/2 -ml-36 bottom-full mb-2 hidden group-hover:block w-72 bg-surface border border-border rounded-lg p-3 text-sm text-white shadow-xl z-50">
                                <p className="font-bold text-gold mb-1">MRR (Monthly Recurring Revenue)</p>
                                <p className="text-xs text-muted leading-relaxed">
                                    Aylıq Təkrarlanan Gəlir. Aktiv abunəliklərdən əldə edilən ümumi aylıq gəliri göstərir.<br /><br />
                                    Hesablama: (Başlanğıc × 29) + (Biznes × 69) + (Korporativ × 149) AZN
                                </p>
                                <div className="absolute left-1/2 -ml-1.5 -bottom-1.5 w-3 h-3 bg-surface border-b border-r border-border transform rotate-45"></div>
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={mrrTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs>
                                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text)' }}
                                formatter={(val: any) => [`${val} AZN`, 'MRR']}
                            />
                            <Area type="monotone" dataKey="mrr" stroke="#C9A84C" strokeWidth={2} fill="url(#mrrGradient)" name="MRR" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* ── SECTION 4: Subscription Health ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gold" />
                            Abunəlik Vəziyyəti
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[
                                { label: 'Aktiv', count: health.active, color: '#34d399', icon: '🟢' },
                                { label: 'Möhlət (Grace)', count: health.gracePeriod, color: '#fbbf24', icon: '🟡' },
                                { label: 'Dayandırılmış', count: health.suspended, color: '#f87171', icon: '🔴' },
                                { label: 'Pulsuz Sınaq', count: health.freeTrial, color: '#6b7280', icon: '⚪' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface/30">
                                    <div className="flex items-center gap-2">
                                        <span>{item.icon}</span>
                                        <span className="text-sm text-text">{item.label}</span>
                                    </div>
                                    <span className="font-bold text-lg" style={{ color: item.color }}>{item.count} təşkilat</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gold" />
                            Bu həftə bitən planlar
                            {expiringInWeek.length > 0 && (
                                <Badge className="bg-red/20 text-red border-red/30 ml-1">{expiringInWeek.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {expiringInWeek.length === 0 ? (
                            <div className="text-center py-8 text-muted">
                                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Bu həftə bitən plan yoxdur</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {expiringInWeek.map((org: any) => (
                                    <div key={org.id} className="flex items-center justify-between p-3 rounded-lg border border-red/20 bg-red/5">
                                        <div>
                                            <p className="font-semibold text-text text-sm">{org.name}</p>
                                            <p className="text-xs text-red">{org.daysLeft} gün qalıb</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="h-7 px-2 text-xs"
                                            onClick={() => setPlanModalOrg(org)}
                                        >
                                            Plan yenilə
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── SECTION 5: Recent Activity ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gold" />
                        Son fəaliyyət
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <p className="text-sm text-muted text-center py-6">Hələlik heç bir fəaliyyət yoxdur</p>
                    ) : (
                        <div className="space-y-2">
                            {recentActivity.map((log: any) => (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface/50 transition-colors">
                                    <div className="mt-0.5">{getActivityIcon(log.action)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-text font-medium truncate">
                                            <span className="text-gold"><Building2 className="inline w-3 h-3 mr-1 mb-0.5" />{log.orgName}</span>
                                            {' — '}
                                            {getReadableAction(log.action)}
                                        </p>
                                        {log.meta?.newPlan && (
                                            <p className="text-xs text-muted">→ {PLAN_LABELS[log.meta.newPlan] || log.meta.newPlan}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted shrink-0">{timeAgo(log.createdAt)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── SECTION 6: Top Organizations ── */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gold" />
                            Ən aktiv təşkilatlar
                        </CardTitle>
                        <p className="text-xs text-muted mt-1">Obyekt və müqavilə sayına görə sıralanır</p>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border text-muted">
                                <tr>
                                    <th className="p-4 text-left font-medium">Sıra</th>
                                    <th className="p-4 text-left font-medium">Təşkilat</th>
                                    <th className="p-4 text-left font-medium">Plan</th>
                                    <th className="p-4 text-right font-medium">Obyekt</th>
                                    <th className="p-4 text-right font-medium">Müqavilə</th>
                                    <th className="p-4 text-right font-medium">
                                        <div className="flex items-center justify-end gap-1 group relative cursor-help">
                                            <span>Aktivlik</span>
                                            <Info className="w-3.5 h-3.5 mb-0.5" />
                                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-surface border border-border rounded-lg p-2 text-xs text-white shadow-xl z-50 normal-case text-left">
                                                Aktivlik skoru = Obyekt sayı × 2 + Müqavilə sayı × 3 + Ödəniş sayı
                                                <div className="absolute right-2 -bottom-1.5 w-3 h-3 bg-surface border-b border-r border-border transform rotate-45"></div>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="p-4 text-right font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topOrganizations.map((org: any, i: number) => (
                                    <tr key={org.id} className="hover:bg-surface/50 transition-colors">
                                        <td className="p-4 text-muted font-mono">#{i + 1}</td>
                                        <td className="p-4">
                                            <Link to={`/admin/organizations/${org.id}`} className="font-bold text-text hover:text-gold transition-colors">
                                                {org.name}
                                            </Link>
                                            <p className="text-xs text-muted">{org.ownerEmail}</p>
                                        </td>
                                        <td className="p-4">
                                            <Badge className="bg-surface border-border text-muted text-xs">
                                                {PLAN_LABELS[org.plan] || org.plan}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right font-bold text-text">{org.propertiesCount}</td>
                                        <td className="p-4 text-right text-muted">{org.contractsCount}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <div className="w-20 bg-surface border border-border rounded-full h-2 overflow-hidden">
                                                    <div className="bg-gold h-full" style={{ width: `${Math.min(100, (org.propertiesCount * 2 + org.contractsCount * 3) / 2)}%` }}></div>
                                                </div>
                                                <span className="text-xs font-mono">{org.propertiesCount * 2 + org.contractsCount * 3 + (org.paymentsCount || 0)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPlanModalOrg(org)}
                                                className="h-7 px-2 text-xs text-gold hover:bg-gold/10"
                                            >
                                                <PencilLine className="w-3 h-3 mr-1" />
                                                Plan dəyiş
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Plan Change Modal */}
            {planModalOrg && <PlanModal org={planModalOrg} onClose={() => setPlanModalOrg(null)} />}
        </div>
    );
}
