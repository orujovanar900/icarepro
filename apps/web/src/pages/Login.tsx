import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';

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

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        try {
            setIsLoading(true);
            const response = await api.post('/auth/login', data);

            const { user, token } = response.data;
            login({ user, token });

            addToast({ type: 'success', message: 'Uğurla daxil oldunuz!' });

            // Role-based redirect
            if (user.role === 'OWNER') {
                navigate('/dashboard');
            } else if (user.role === 'STAFF') {
                navigate('/contracts');
            } else {
                navigate('/dashboard');
            }
        } catch (error: any) {
            addToast({
                type: 'error',
                message: error.response?.data?.message || 'Giriş uğursuz oldu. Zəhmət olmasa təkrar cəhd edin.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-4 inset-0 fixed w-full isolate overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-bg to-bg" />

            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold font-heading tracking-tight text-gold">İcarə Pro</h1>
                    <p className="mt-2 text-sm text-text">Sistemi idarə etmək üçün daxil olun</p>
                </div>

                <Card variant="elevated" className="border-border/50 bg-surface/50 backdrop-blur-md">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle className="text-2xl text-center">Xoş gəlmisiniz!</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                label="E-poçt"
                                type="email"
                                placeholder="ad@email.com"
                                {...register('email')}
                                error={errors.email?.message}
                            />
                            <Input
                                label="Şifrə"
                                type="password"
                                placeholder="••••••••"
                                {...register('password')}
                                error={errors.password?.message}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" variant="primary" className="w-full" size="lg" isLoading={isLoading}>
                                Daxil ol
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
