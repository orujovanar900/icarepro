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
import { Eye, EyeOff, Building2 } from 'lucide-react';

const registerSchema = z
    .object({
        entityType: z.enum(['INDIVIDUAL', 'COMPANY']),
        name: z.string().min(2, 'Ad Soyad ən azı 2 simvol olmalıdır.'),
        email: z.string().email('Düzgün e-poçt ünvanı daxil edin.'),
        organizationName: z.string().optional(),
        password: z.string().min(6, 'Şifrə ən azı 6 simvoldan ibarət olmalıdır.'),
        confirmPassword: z.string().min(1, 'Şifrəni təkrarlayın.'),
    })
    .refine((data) => {
        if (data.entityType === 'COMPANY' && (!data.organizationName || data.organizationName.length < 2)) {
            return false;
        }
        return true;
    }, {
        message: 'Şirkət adı ən azı 2 simvol olmalıdır.',
        path: ['organizationName'],
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Şifrələr uyğun gəlmir.',
        path: ['confirmPassword'],
    });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function Register() {
    const navigate = useNavigate();
    const { login } = useAuthStore();
    const { addToast } = useToastStore();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPass, setShowPass] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            entityType: 'INDIVIDUAL',
        }
    });

    const selectedEntityType = watch('entityType');

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            setIsLoading(true);
            const response = await api.post('/auth/register', {
                entityType: data.entityType,
                name: data.name,
                email: data.email,
                password: data.password,
                // If individual, use their name as the implicit 'organization' name behind the scenes
                organizationName: data.entityType === 'COMPANY' ? data.organizationName : data.name,
            });

            const { user, token } = response.data.data;
            login({ user, token });
            addToast({ type: 'success', message: 'Hesabınız uğurla yaradıldı! Xoş gəlmisiniz 🎉' });
            navigate('/dashboard');
        } catch (error: any) {
            addToast({
                type: 'error',
                message: error.response?.data?.error || 'Qeydiyyat uğursuz oldu. Zəhmət olmasa təkrar cəhd edin.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4 relative isolate w-full">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-bg to-bg" />

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl font-heading tracking-tight flex items-center justify-center gap-2">
                        <span className="text-gold font-extrabold">İcarə</span>
                        <span className="text-white font-normal">Pro</span>
                    </h1>
                    <p style={{ fontStyle: 'italic', color: '#8899B0', fontSize: '13px' }} className="mt-1 mb-2">
                        "Mülkünüzü ağıllı idarə edin"
                    </p>
                    <p className="mt-2 text-sm text-text">Yeni hesab yaradın və idarəetməyə başlayın</p>
                </div>

                <Card variant="elevated" className="border-border/50 bg-surface/50 backdrop-blur-md">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
                                <Building2 className="w-6 h-6 text-gold" />
                                Qeydiyyat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Entity Type Toggle */}
                            <div className="flex bg-surface border border-border/50 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setValue('entityType', 'INDIVIDUAL');
                                        setValue('organizationName', '');
                                    }}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${selectedEntityType === 'INDIVIDUAL'
                                        ? 'bg-gold text-[#0A0B0F] shadow-sm'
                                        : 'text-muted hover:text-text hover:bg-white/5'
                                        }`}
                                >
                                    Fiziki Şəxs
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setValue('entityType', 'COMPANY')}
                                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${selectedEntityType === 'COMPANY'
                                        ? 'bg-gold text-[#0A0B0F] shadow-sm'
                                        : 'text-muted hover:text-text hover:bg-white/5'
                                        }`}
                                >
                                    Hüquqi Şəxs
                                </button>
                            </div>

                            <Input
                                label="Ad Soyad"
                                type="text"
                                placeholder="Əli Əliyev"
                                {...register('name')}
                                error={errors.name?.message}
                            />
                            <Input
                                label="E-poçt"
                                type="email"
                                placeholder="ad@email.com"
                                {...register('email')}
                                error={errors.email?.message}
                            />

                            {selectedEntityType === 'COMPANY' && (
                                <Input
                                    label="Şirkət adı"
                                    type="text"
                                    placeholder="Əliyev MMC"
                                    {...register('organizationName')}
                                    error={errors.organizationName?.message}
                                />
                            )}

                            <Input
                                label="Şifrə"
                                type={showPass ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...register('password')}
                                error={errors.password?.message}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        style={{ color: '#4A6080' }}
                                        className="hover:!text-[#C9A84C] transition-colors flex items-center justify-center p-1"
                                    >
                                        {showPass ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                }
                            />
                            <Input
                                label="Şifrəni təkrarla"
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                                error={errors.confirmPassword?.message}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        style={{ color: '#4A6080' }}
                                        className="hover:!text-[#C9A84C] transition-colors flex items-center justify-center p-1"
                                    >
                                        {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                }
                            />
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
                                Hesab yarat
                            </Button>
                            <Link
                                to="/login"
                                className="text-sm text-muted hover:text-gold transition-colors text-center"
                            >
                                Hesabınız var? <span className="text-gold font-medium">Daxil olun</span>
                            </Link>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
