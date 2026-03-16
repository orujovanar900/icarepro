import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
    email: z.string().email('Geçərli bir e-poçt ünvanı daxil edin.'),
    password: z.string().min(6, 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function Login() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const { addToast } = useToastStore();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPass, setShowPass] = React.useState(false);
    const [remember, setRemember] = React.useState(true);
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const emailValue = watch('email')
    React.useEffect(() => {
        if (emailValue) setSubmitError(null)
    }, [emailValue])

    function mapLoginError(msg: string): string {
        if (msg.includes('yanlış') || msg.includes('yanlışdır')) {
            return 'E-poçt və ya şifrə yanlışdır.'
        }
        if (msg.includes('tapılmadı') || msg.includes('mövcud deyil')) {
            return 'Bu e-poçt ünvanı ilə hesab tapılmadı.'
        }
        if (msg.includes('bloklan') || msg.includes('müvəqqəti')) {
            return msg
        }
        return 'Daxil olmaq mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.'
    }

    const onSubmit = async (data: LoginFormValues) => {
        setSubmitError(null);
        try {
            setIsLoading(true);
            const response = await api.post('/auth/login', data);

            const { user, token } = response.data.data;

            if (!remember) {
                sessionStorage.setItem('auth-session-only', 'true');
            } else {
                sessionStorage.removeItem('auth-session-only');
            }

            login({ user, token });

            addToast({ type: 'success', message: 'Uğurla daxil oldunuz!' });

            // Role + subscription-based redirect
            const PLATFORM_STAFF = ['SUPERADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT']
            if (PLATFORM_STAFF.includes(user.role)) {
                navigate('/admin');
            } else if (user.role === 'ICARECI') {
                navigate('/kabinet');
            } else if (user.organization?.subscriptionStatus === 'ACTIVE') {
                navigate('/dashboard');
            } else {
                navigate('/dashboard/elanlar');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Daxil olmaq mümkün olmadı.'
            setSubmitError(mapLoginError(msg))
            addToast({ type: 'error', message: mapLoginError(msg) })
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center p-6 w-full"
            style={{ backgroundColor: '#F5F0E8' }}
        >
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <Link
                        to="/"
                        className="text-5xl font-heading tracking-tight flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <span className="font-extrabold">
                            <span className="text-gold">icare</span>
                            <span style={{ color: '#1A1A2E' }}>pro</span>
                        </span>
                    </Link>
                    <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>
                        Sistemi idarə etmək üçün daxil olun
                    </p>
                </div>

                <Card
                    variant="elevated"
                    className="border border-[#E5E0D8] shadow-md"
                    style={{ backgroundColor: '#FFFFFF' }}
                >
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-center" style={{ color: '#1A1A2E' }}>
                                Xoş gəlmisiniz!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {submitError && (
                                <div style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '8px',
                                }}>
                                    <p style={{
                                        color: '#DC2626',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        margin: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>⚠️</span>
                                        {submitError}
                                    </p>
                                    {submitError.includes('mövcuddur') && (
                                        <Link to="/login" style={{
                                            color: '#C9A84C',
                                            fontSize: '13px',
                                            textDecoration: 'underline',
                                            display: 'block',
                                            marginTop: '6px',
                                            marginLeft: '24px'
                                        }}>
                                            Daxil olun →
                                        </Link>
                                    )}
                                </div>
                            )}
                            <Input
                                label="E-poçt"
                                type="email"
                                placeholder="ad@email.com"
                                variant="light"
                                {...register('email')}
                                error={errors.email?.message}
                            />
                            <Input
                                label="Şifrə"
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••••"
                                variant="light"
                                {...register('password')}
                                error={errors.password?.message}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        style={{ color: '#9CA3AF' }}
                                        className="hover:!text-[#C9A84C] transition-colors flex items-center justify-center p-1"
                                    >
                                        {showPass ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                }
                            />

                            <label
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}
                                className="text-sm cursor-pointer w-fit pt-2 hover:opacity-80 transition-opacity"
                            >
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={e => setRemember(e.target.checked)}
                                    className="accent-gold w-4 h-4 cursor-pointer"
                                />
                                <span>Məni xatırla</span>
                            </label>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            {submitError && (
                                <div style={{
                                    background: '#FEF2F2',
                                    border: '1px solid #FECACA',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    marginBottom: '8px',
                                }}>
                                    <p style={{
                                        color: '#DC2626',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        margin: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>⚠️</span>
                                        {submitError}
                                    </p>
                                    {submitError.includes('mövcuddur') && (
                                        <Link to="/login" style={{
                                            color: '#C9A84C',
                                            fontSize: '13px',
                                            textDecoration: 'underline',
                                            display: 'block',
                                            marginTop: '6px',
                                            marginLeft: '24px'
                                        }}>
                                            Daxil olun →
                                        </Link>
                                    )}
                                </div>
                            )}
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                size="lg"
                                isLoading={isLoading}
                                style={{ backgroundColor: '#1A1A2E', color: '#C9A84C' }}
                            >
                                Daxil ol
                            </Button>
                            <Link
                                to="/forgot-password"
                                className="text-sm text-center transition-colors hover:text-gold"
                                style={{ color: '#9CA3AF' }}
                            >
                                Şifrəni unutmusunuz?
                            </Link>
                            <Link
                                to="/register"
                                className="text-sm text-center transition-colors hover:text-gold"
                                style={{ color: '#9CA3AF' }}
                            >
                                Hesabınız yoxdur? <span className="text-gold font-medium">Qeydiyyat</span>
                            </Link>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
