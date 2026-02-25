import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Xəta baş verdi. Yenidən cəhd edin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold font-heading text-gold">
                        İcarə<span className="text-text font-light">Pro</span>
                    </h1>
                </div>

                <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-8 h-8 text-green" />
                            </div>
                            <h2 className="text-xl font-bold text-text">Link göndərildi!</h2>
                            <p className="text-sm text-muted">
                                Əgər <b>{email}</b> sistemdə mövcuddursa,<br />
                                şifrə sıfırlama linki göndərildi.
                            </p>
                            <p className="text-xs text-muted">Link 1 saat ərzində etibarlıdır.</p>
                            <Link to="/login" className="text-gold text-sm hover:underline flex items-center justify-center gap-1 mt-4">
                                <ArrowLeft className="w-4 h-4" /> Girişə qayıt
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                                    <Mail className="w-6 h-6 text-gold" />
                                </div>
                                <h2 className="text-xl font-bold text-text">Şifrəni Unutdum</h2>
                                <p className="text-sm text-muted mt-1">
                                    Email adresinizi daxil edin — sıfırlama linki göndərəcəyik.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    required
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@domain.com"
                                />

                                {error && (
                                    <p className="text-sm text-red">{error}</p>
                                )}

                                <Button type="submit" className="w-full" disabled={isLoading || !email}>
                                    {isLoading ? 'Göndərilir...' : 'Link Göndər'}
                                </Button>

                                <Link to="/login" className="text-sm text-muted hover:text-gold flex items-center gap-1 justify-center mt-2">
                                    <ArrowLeft className="w-3 h-3" /> Girişə qayıt
                                </Link>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
