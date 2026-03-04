import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { User, LogOut, Camera, Loader2, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translateRole } from '@/utils/roles';

export function Profile() {
    const { user, setUser, logout } = useAuthStore();
    const addToast = useToastStore((state) => state.addToast);
    const navigate = useNavigate();

    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState((user as any)?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

    // Change Password states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await api.put('/users/profile', { name, phone });
            setUser({ ...user, ...res.data.data });
            addToast({ message: 'Profil məlumatları yeniləndi', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await api.post('/users/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // axios automatically handles boundries
            });
            setUser({ ...user, ...res.data.data });
            addToast({ message: 'Şəkil yeniləndi', type: 'success' });
        } catch (error) {
            console.error(error);
            addToast({ message: 'Şəkil yüklənərkən xəta baş verdi', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogoutAll = async () => {
        if (!confirm("Bütün cihazlardan çıxış etdiyiniz üçün hesabınıza yenidən daxil olmalı olacaqsınız. Davam edilsin?")) return;

        setIsLoggingOutAll(true);
        try {
            await api.post('/auth/logout-all');
            addToast({ message: 'Bütün cihazlardan çıxış edildi', type: 'success' });
            logout(); // Clear local store and go back to login
            navigate('/login');
        } catch (error) {
            console.error(error);
            addToast({ message: 'Xəta baş verdi', type: 'error' });
            setIsLoggingOutAll(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            addToast({ message: 'Yeni şifrələr uyğun gəlmir', type: 'error' });
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            addToast({ message: 'Şifrə uğurla dəyişdirildi. Zəhmət olmasa yenidən daxil olun.', type: 'success' });
            logout();
            navigate('/login');
        } catch (error: any) {
            addToast({ message: error.response?.data?.error || 'Şifrə dəyişdirilə bilmədi', type: 'error' });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-6 max-w-4xl mx-auto pb-24">
            <h1 className="text-2xl font-bold font-heading text-text">Profil Parametrləri</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Sol tərəf - Avatar */}
                <Card variant="elevated" className="md:col-span-1 h-fit">
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface bg-bg flex items-center justify-center">
                                {(user as any)?.avatarUrl ? (
                                    <img src={(user as any).avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-muted" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-gold text-bg rounded-full cursor-pointer hover:bg-gold-hover transition-colors shadow-lg">
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                <input type="file" className="hidden" accept="image/*" onChange={handleUploadAvatar} disabled={isUploading} />
                            </label>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text">{user?.name}</h3>
                            <p className="text-sm text-muted">{translateRole(user?.role)}</p>
                            <p className="text-xs text-muted mt-1">{user?.email}</p>
                        </div>

                        <div className="w-full pt-4 border-t border-border mt-4">
                            <Button
                                variant="outline"
                                className="w-full justify-start text-red hover:text-red hover:bg-red/10 border-red/20"
                                onClick={handleLogoutAll}
                                disabled={isLoggingOutAll}
                            >
                                {isLoggingOutAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                                Bütün cihazlardan çıx
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Sağ tərəf - Formalar */}
                <div className="md:col-span-2 space-y-6">

                    {/* Şəxsi Məlumatlar */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle>Şəxsi Məlumatlar</CardTitle>
                            <p className="text-sm text-muted mt-1">Profil məlumatlarınızı buradan yeniləyə bilərsiniz.</p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Ad və Soyad</label>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Adınız"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Telefon</label>
                                        <Input
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="+994"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" className="bg-gold hover:bg-gold2 text-black" disabled={isSaving}>
                                        {isSaving ? 'Yadda saxlanılır...' : 'Yadda Saxla'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Şifrə Yeniləmə */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5" /> Şifrəni Dəyiş
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <Input
                                        type="password"
                                        placeholder="Mövcud şifrə"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Yeni şifrə (min. 8 simvol)"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                    <Input
                                        type="password"
                                        placeholder="Yeni şifrəni təsdiqləyin"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <Button type="submit" variant="outline" disabled={isChangingPassword || !currentPassword || !newPassword}>
                                        {isChangingPassword ? 'Dəyişdirilir...' : 'Şifrəni Yenilə'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
