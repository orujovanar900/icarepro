import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Building2, Mail, Users, Home, ArrowLeft, Activity, CalendarDays, KeyRound, UserCheck, PencilLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { translateRole } from '@/utils/roles';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToastStore } from '@/store/toast';
import { PlanModal, PLAN_LABELS } from '@/components/admin/PlanModal';

export function AdminOrganizationDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const addToast = useToastStore((s) => s.addToast);
    const queryClient = useQueryClient();

    // Role Edit Modal State
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newRole, setNewRole] = useState<string>('');
    const [planModalOrg, setPlanModalOrg] = useState<any>(null);

    const { data: orgData, isLoading } = useQuery({
        queryKey: ['admin-organization', id],
        queryFn: async () => {
            const res = await api.get(`/admin/organizations/${id}`);
            return res.data;
        }
    });

    const roleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
            const res = await api.patch(`/admin/users/${userId}/role`, { role });
            return res.data;
        },
        onSuccess: () => {
            addToast({ message: 'İstifadəçi rolu uğurla dəyişdirildi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['admin-organization', id] });
            setIsRoleModalOpen(false);
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        }
    });

    if (isLoading) return <div className="p-6">Yüklənir...</div>;

    const org = orgData?.data;
    if (!org) return <div className="p-6">Təşkilat tapılmadı.</div>;

    const handleOpenRoleModal = (user: any) => {
        setEditingUser(user);
        setNewRole(user.role);
        setIsRoleModalOpen(true);
    };

    const handleRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        roleMutation.mutate({ userId: editingUser.id, role: newRole });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-sm text-muted hover:text-text transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Geriyə
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gold" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-text font-heading">{org.name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant={org.isActive ? 'aktiv' : 'danger'} className="text-xs">
                                {org.isActive ? 'Aktiv' : 'Deaktiv edilib'}
                            </Badge>
                            <Badge className="bg-surface border-border text-muted text-xs flex items-center gap-1">
                                Plan: {PLAN_LABELS[org.subscriptionPlan] || org.subscriptionPlan}
                                <button onClick={() => setPlanModalOrg(org)} className="ml-1 text-gold hover:text-white transition-colors" title="Plan dəyiş">
                                    <PencilLine className="w-3 h-3" />
                                </button>
                            </Badge>
                            <span className="text-sm text-muted ml-2">ID: {org.id}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-gold" />
                            İstifadəçilər ({org.users?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {org.users?.map((u: any) => (
                            <div key={u.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-surface hover:bg-surface-hover hover:border-gold/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gold/10 text-gold rounded-full flex items-center justify-center">
                                        {u.role === 'OWNER' ? <KeyRound className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-text">{u.name}</p>
                                        <p className="text-xs text-muted flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <Badge className="bg-bg text-muted border-border">{translateRole(u.role)}</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => handleOpenRoleModal(u)} className="h-7 px-2 text-xs text-gold hover:text-gold hover:bg-gold/10">
                                        Dəyiş
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-gold" />
                            Obyektlər ({org.properties?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {org.properties?.map((p: any) => (
                            <div key={p.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-surface">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                                        <Home className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-text">{p.name}</p>
                                        <p className="text-xs text-muted">{p.address}</p>
                                    </div>
                                </div>
                                <Badge className="bg-bg text-muted border-border">{p.status}</Badge>
                            </div>
                        ))}
                        {(!org.properties || org.properties.length === 0) && (
                            <p className="text-sm text-muted text-center py-4">Obyekt yoxdur.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-gold" />
                            İcarəçilər ({org.tenants?.length || 0})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {org.tenants?.map((t: any) => (
                                <div key={t.id} className="flex flex-col p-3 border border-border rounded-lg bg-surface hover:border-gold/30 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center">
                                                <UserCheck className="w-4 h-4" />
                                            </div>
                                            <span className="font-semibold text-text text-sm">
                                                {t.tenantType === 'HÜQUQİ' ? t.companyName : `${t.firstName} ${t.lastName}`}
                                            </span>
                                        </div>
                                        {t.isBlacklisted && <Badge variant="danger" className="text-[10px]">Qara Siyahı</Badge>}
                                    </div>
                                    <p className="text-xs text-muted flex items-center gap-1 mt-auto pt-2 border-t border-border/50">
                                        {t.phone || 'Nömrə yoxdur'} &bull; {t.tenantType === 'HÜQUQİ' ? 'Hüquqi şəxs' : 'Fiziki şəxs'}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {(!org.tenants || org.tenants.length === 0) && (
                            <p className="text-sm text-muted text-center py-4">İcarəçi yoxdur.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Modal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                title={`Rol Dəyişdir: ${editingUser?.name || ''}`}
            >
                <form onSubmit={handleRoleSubmit} className="space-y-4">
                    <Select
                        label="Yeni Rol"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        options={[
                            { label: 'Superadmin', value: 'SUPERADMIN' },
                            { label: 'Owner (Sahib)', value: 'OWNER' },
                            { label: 'Menecer', value: 'MANAGER' },
                            { label: 'Kassir', value: 'CASHIER' },
                            { label: 'Mühasib', value: 'ACCOUNTANT' },
                            { label: 'Administrator', value: 'ADMINISTRATOR' },
                            { label: 'İcarəçi', value: 'TENANT' },
                        ]}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                        <Button type="button" variant="outline" onClick={() => setIsRoleModalOpen(false)}>Ləğv et</Button>
                        <Button type="submit" disabled={roleMutation.isPending || newRole === editingUser?.role}>
                            {roleMutation.isPending ? 'Dəyişdirilir...' : 'Dəyişdir'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {planModalOrg && <PlanModal org={planModalOrg} onClose={() => setPlanModalOrg(null)} />}
        </div>
    );
}
