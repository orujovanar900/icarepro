import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { Settings as SettingsIcon, User, Building, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Settings() {
    const { user, setUser } = useAuthStore();
    const addToast = useToastStore((state) => state.addToast);

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Password State
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsUpdatingProfile(true);
        try {
            const res = await api.patch(`/users/${user.id}`, { name });
            setUser(res.data.data); // Update local store
            addToast({ message: 'Profil uğurla yeniləndi', type: 'success' });
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Profil yenilənərkən xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (password !== passwordConfirm) {
            addToast({ message: 'Şifrələr uyğun gəlmir', type: 'error' });
            return;
        }
        if (password.length < 8) {
            addToast({ message: 'Şifrə ən azı 8 simvol olmalıdır', type: 'error' });
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await api.patch(`/users/${user.id}`, { password });
            addToast({ message: 'Şifrə uğurla yeniləndi', type: 'success' });
            setPassword('');
            setPasswordConfirm('');
        } catch (err: any) {
            addToast({ message: err.response?.data?.error || 'Şifrə yenilənərkən xəta baş verdi', type: 'error' });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (user?.role !== 'OWNER') {
        return (
            <div className="flex-1 flex justify-center items-center p-6 text-red font-bold">
                İcazəniz yoxdur.
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <div className="flex items-center gap-3 border-b border-border pb-6">
                <SettingsIcon className="w-8 h-8 text-gold" />
                <h1 className="text-3xl font-extrabold font-heading text-text">Tənzimləmələr</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Settings */}
                <Card variant="elevated" className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gold" /> Profil Məlumatları
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                            <Input
                                label="Ad Soyad"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="Email"
                                value={user?.email || ''}
                                disabled
                            />
                            <Button type="submit" disabled={isUpdatingProfile || name === user?.name}>
                                {isUpdatingProfile ? 'Yenilənir...' : 'Yadda Saxla'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Password Settings */}
                <Card variant="default" className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-gold" /> Şifrəni Yenilə
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <Input
                                label="Yeni Şifrə"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Şifrənin Təkrarı"
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                            />
                            <Button type="submit" variant="danger" disabled={isUpdatingPassword || !password || !passwordConfirm}>
                                {isUpdatingPassword ? 'Yenilənir...' : 'Şifrəni Dəyiş'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Organization Setup (Read Only) */}
                <Card variant="default" className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-gold" /> Təşkilat Məlumatı
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Input
                                label="Təşkilat İD"
                                value={user?.organizationId || ''}
                                disabled
                            />
                            <p className="text-sm text-muted">
                                Sistemdəki bütün məlumatlarınız bu təşkilata bağlıdır.
                                Təşkilatın adını və ya domenini (slug) dəyişmək üçün dəstək ilə əlaqə saxlayın.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
