import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shield, Building2, Users, Search, AlertCircle, Trash2, PowerOff, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToastStore } from '@/store/toast';
import { Link } from 'react-router-dom';

export function AdminOrganizations() {
    const queryClient = useQueryClient();
    const addToast = useToastStore((s) => s.addToast);
    const [search, setSearch] = React.useState('');

    const { data: orgsData, isLoading } = useQuery({
        queryKey: ['admin-organizations'],
        queryFn: async () => {
            const res = await api.get('/admin/users');
            return res.data;
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (id: string) => api.post(`/admin/organizations/${id}/toggle-status`),
        onSuccess: () => {
            addToast({ message: 'Təşkilat statusu dəyişdirildi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' })
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/admin/organizations/${id}`),
        onSuccess: () => {
            addToast({ message: 'Təşkilat silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
        onError: () => addToast({ message: 'Silinmə xətası (əlaqədar məlumatlar ola bilər)', type: 'error' })
    });

    const orgs = Array.isArray(orgsData?.data) ? orgsData.data : [];
    const filteredOrgs = orgs.filter((o: any) =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.ownerEmail.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <div className="p-6">Yüklənir...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-gold" />
                        Təşkilatlar (Superadmin)
                    </h1>
                    <p className="text-sm text-muted mt-1">Platformadakı bütün təşkilatları idarə edin.</p>
                </div>
                <div className="w-full sm:w-72">
                    <Input
                        rightElement={<Search className="w-4 h-4 text-muted" />}
                        placeholder="Ad və ya email ilə axtarış..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {filteredOrgs.map((org: any) => (
                    <Card key={org.id} className={`transition-all ${!org.isActive ? 'border-red/50 bg-red/5 border-dashed' : ''}`}>
                        <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${org.isActive ? 'bg-gold/10 text-gold' : 'bg-red/10 text-red'}`}>
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-text">{org.name}</h3>
                                        <Badge variant={org.isActive ? 'aktiv' : 'danger'} className="text-xs">
                                            {org.isActive ? 'Aktiv' : 'Deaktiv edilib'}
                                        </Badge>
                                        <Badge className="bg-surface border-border text-muted text-xs">Plan: {org.plan}</Badge>
                                    </div>
                                    <p className="text-sm text-muted flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5" />
                                        Sahib: <span className="text-text">{org.ownerEmail}</span>
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted mt-2">
                                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {org.usersCount} İstif.</span>
                                        <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {org.propertiesCount} Obyekt</span>
                                        <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {org.contractsCount} Müqavilə</span>
                                        <span>Yaradılıb: {new Date(org.createdAt).toLocaleDateString('az-AZ')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                                <Link to={`/admin/organizations/${org.id}`}>
                                    <Button variant="outline" size="sm" className="w-full md:w-auto">Ətraflı</Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={org.isActive ? 'text-orange hover:bg-orange/10 hover:text-orange border-orange/20' : 'text-green hover:bg-green/10 hover:text-green border-green/20'}
                                    onClick={() => {
                                        if (confirm(org.isActive ? 'Təşkilatı deaktiv etmək istəyirsiniz?' : 'Təşkilatı aktiv etmək istəyirsiniz?')) {
                                            toggleStatusMutation.mutate(org.id);
                                        }
                                    }}
                                >
                                    <PowerOff className="w-4 h-4 mr-2" />
                                    {org.isActive ? 'Dondur' : 'Aktivləşdir'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red hover:bg-red/10 hover:text-red"
                                    onClick={() => {
                                        if (confirm(`DİQQƏT! ${org.name} təşkilatını tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz!`)) {
                                            deleteMutation.mutate(org.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredOrgs.length === 0 && (
                    <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
                        Təşkilat tapılmadı.
                    </div>
                )}
            </div>
        </div>
    );
}
