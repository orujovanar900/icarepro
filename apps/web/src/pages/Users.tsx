import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

export function Users() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);

    // Main fetch
    const { data: usersData, isLoading, isError, refetch } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data;
        }
    });

    const users = usersData?.data || [];

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formRole, setFormRole] = useState('STAFF');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addUserMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/users', payload);
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });

            // Show success and the temp password
            const tempPassword = data?.meta?.tempPassword || 'Bilinmir';
            addToast({ message: `İstifadəçi yaradıldı. Müvəqqəti şifrə: ${tempPassword}`, type: 'success' });

            setIsModalOpen(false);
            setFormName('');
            setFormEmail('');
            setFormPhone('');
            setFormRole('STAFF');
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        },
        onSettled: () => setIsSubmitting(false)
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
            const res = await api.patch(`/users/${id}`, { isActive });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            addToast({ message: 'Status yeniləndi', type: 'success' });
        },
        onError: (err: any) => {
            addToast({ message: err.response?.data?.error || 'Xəta baş verdi', type: 'error' });
        }
    });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        addUserMutation.mutate({
            name: formName,
            email: formEmail,
            phone: formPhone,
            role: formRole
        });
    };

    const handleToggleActive = (id: string, currentStatus: boolean) => {
        // Find user to prevent deactivating self (UI prevention)
        if (id === user?.id) {
            addToast({ message: 'Öz hesabınızı deaktiv edə bilməzsiniz', type: 'error' });
            return;
        }
        toggleActiveMutation.mutate({ id, isActive: !currentStatus });
    };

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex-1 flex justify-center items-center p-6 pb-24 text-red font-bold">
                İcazəniz yoxdur.
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Shield className="w-8 h-8 text-gold" />
                    İstifadəçilər
                </h1>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni İstifadəçi
                </Button>
            </div>

            <Card variant="default">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={5} columns={5} /></div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red">
                            <p>Məlumatları yükləmək mümkün olmadı.</p>
                            <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-16 text-muted">
                            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>İstifadəçi tapılmadı.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ad Soyad</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                    <TableHead>Yaradılıb</TableHead>
                                    <TableHead className="text-right">Status / Əməliyyat</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u: any) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium text-text">{u.name}</TableCell>
                                        <TableCell className="text-sm text-muted">{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={u.role === 'OWNER' ? 'draft' : u.role === 'STAFF' ? 'aktiv' : 'arxiv'}>
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted">
                                            {new Date(u.createdAt).toLocaleDateString('az-AZ')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {u.isActive ? (
                                                    <span className="text-xs font-semibold text-green">Aktiv</span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-red">Deaktiv</span>
                                                )}

                                                {u.id !== user?.id && (
                                                    <Button
                                                        variant={u.isActive ? 'danger' : 'outline'}
                                                        size="sm"
                                                        onClick={() => handleToggleActive(u.id, u.isActive)}
                                                        disabled={toggleActiveMutation.isPending}
                                                    >
                                                        {u.isActive ? 'Deaktiv Et' : 'Aktivləşdir'}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni İstifadəçi Əlavə Et">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <Input
                        label="Ad Soyad"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                    />
                    <Input
                        label="Email"
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                    />
                    <Input
                        label="Əlaqə nömrəsi"
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                    />
                    <Select
                        label="Rol"
                        required
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        options={[
                            { label: 'Sistem İstifadəçisi (STAFF)', value: 'STAFF' },
                            { label: 'Sahibkar (OWNER)', value: 'OWNER' },
                            { label: 'İcarəçi (TENANT)', value: 'TENANT' },
                        ]}
                    />

                    <p className="text-xs text-muted mb-4 border-l-2 pl-2 border-gold/50">
                        Qeyd: Yeni istifadəçi üçün sistem avtomatik şifrə (IcarePro2024!) təyin edəcək.
                    </p>

                    <div className="flex gap-4 pt-4 mt-6 border-t border-border">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Ləğv et</Button>
                        <Button type="submit" className="flex-1" disabled={isSubmitting || !formName || !formEmail}>
                            {isSubmitting ? 'Əlavə edilir...' : 'Təsdiqlə'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
