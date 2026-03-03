import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building2, FileText, Home, TrendingUp, Users, Activity, BarChart4 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function AdminStats() {
    const { data: statsData, isLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const res = await api.get('/admin/stats');
            return res.data;
        }
    });

    if (isLoading) return <div className="p-6">Yüklənir...</div>;

    const stats = statsData?.data || {};

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(amount);

    const STATS = [
        { title: 'Ümumi Təşkilatlar', value: stats.totalOrganizations, icon: <Building2 className="w-5 h-5" />, color: 'bg-blue-500/10 text-blue-500', isMoney: false },
        { title: 'Aktiv Təşkilatlar', value: stats.activeOrganizations, icon: <Activity className="w-5 h-5" />, color: 'bg-green/10 text-green', isMoney: false },
        { title: 'Deaktiv Təşkilatlar', value: stats.inactiveOrganizations, icon: <Activity className="w-5 h-5" />, color: 'bg-red/10 text-red', isMoney: false },
        { title: 'Bu Ay Yeni Qeydiyyat', value: stats.newSignupsThisMonth, icon: <Users className="w-5 h-5" />, color: 'bg-purple-500/10 text-purple-500', isMoney: false },
        { title: 'Ümumi Obyektlər', value: stats.totalProperties, icon: <Home className="w-5 h-5" />, color: 'bg-gold/10 text-gold', isMoney: false },
        { title: 'Ümumi Müqavilələr', value: stats.totalContracts, icon: <FileText className="w-5 h-5" />, color: 'bg-teal-500/10 text-teal-500', isMoney: false },
        { title: 'Sistemdən Keçən Dövriyyə', value: stats.totalRevenue, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green/10 text-green', isMoney: true },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                <BarChart4 className="w-6 h-6 text-gold" />
                Ümumi Statistika (Superadmin)
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {STATS.map((s, i) => (
                    <Card key={i} className="bg-surface border-border shadow-sm hover:border-gold/30 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted">{s.title}</CardTitle>
                            <div className={`p-2 rounded-xl ${s.color}`}>
                                {s.icon}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-text font-heading">
                                {s.isMoney ? formatMoney(s.value || 0) : s.value || 0}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
