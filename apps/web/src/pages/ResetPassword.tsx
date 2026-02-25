import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Şifrələr uyğun gəlmir.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, newPassword });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Token etibarsız və ya vaxtı bitib.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center space-y-3">
                    <XCircle className="w-12 h-12 text-red mx-auto" />
                    <p className="text-text font-bold">Token tapılmadı</p>
                    <Link to="/forgot-password" className="text-gold text-sm hover:underline">
                        Yenidən cəhd edin
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold font-heading text-gold">
                        İcarə<span className="text-text font-light">Pro</span>
                    </h1>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    {success ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green" />
                            </div>
                            <h2 className="text-xl font-bold text-text">Şifrə Dəyişdirildi!</h2>
                            <p className="text-sm text-muted">3 saniyə sonra giriş səhifəsinə yönləndiriləcəksiniz.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-gold" />
                                </div>
                                <h2 className="text-xl font-bold text-text">Yeni Şifrə</h2>
                                <p className="text-sm text-muted mt-1">Ən azı 8 simvoldan ibarət yeni şifrə daxil edin.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Yeni Şifrə"
                                    type="password"
                                    required
                                    autoFocus
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 simvol"
                                />
                                <Input
                                    label="Şifrənin Təkrarı"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Şifrəni təkrarlayın"
                                />

                                {error && <p className="text-sm text-red">{error}</p>}

                                <Button type="submit" className="w-full" disabled={isLoading || !newPassword || !confirmPassword}>
                                    {isLoading ? 'Yenilənir...' : 'Şifrəni Yenilə'}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
