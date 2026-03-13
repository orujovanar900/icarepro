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
import { Eye, EyeOff, Check, X } from 'lucide-react';

type SelectedRole = 'OWNER' | 'AGENT' | 'AGENTLIK' | 'ICARECI';

const ROLE_CARDS: { role: SelectedRole; emoji: string; title: string; subtitle: string }[] = [
    { role: 'OWNER',    emoji: '🏠', title: 'Əmlak Sahibiyəm',  subtitle: 'Öz mülkümü icarəyə verirəm' },
    { role: 'AGENT',    emoji: '🤝', title: 'Müstəqil Agentəm', subtitle: 'Əmlak agentliyi xidməti' },
    { role: 'AGENTLIK', emoji: '🏢', title: 'Agentlik / Şirkət', subtitle: 'Korporativ icarə idarəçiliyi' },
    { role: 'ICARECI',  emoji: '🔑', title: 'İcarəçiyəm',        subtitle: 'Əmlak axtarıram' },
];

const passwordRules = [
    { label: 'Minimum 8 simvol', test: (p: string) => p.length >= 8 },
    { label: '1 kiçik hərf (a–z)', test: (p: string) => /[a-z]/.test(p) },
    { label: '1 böyük hərf (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: '1 rəqəm (0–9)', test: (p: string) => /[0-9]/.test(p) },
    { label: '1 xüsusi simvol (!@#$…)', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const registerSchema = z
    .object({
        name: z.string().min(2, 'Ad Soyad ən azı 2 simvol olmalıdır.'),
        email: z.string().email('Düzgün e-poçt ünvanı daxil edin.'),
        organizationName: z.string().optional(),
        password: z
            .string()
            .min(8, 'Şifrə ən azı 8 simvoldan ibarət olmalıdır.')
            .regex(/[a-z]/, 'Şifrədə ən azı 1 kiçik hərf olmalıdır.')
            .regex(/[A-Z]/, 'Şifrədə ən azı 1 böyük hərf olmalıdır.')
            .regex(/[0-9]/, 'Şifrədə ən azı 1 rəqəm olmalıdır.')
            .regex(/[^a-zA-Z0-9]/, 'Şifrədə ən azı 1 xüsusi simvol olmalıdır.'),
        confirmPassword: z.string().min(1, 'Şifrəni təkrarlayın.'),
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
    const [selectedRole, setSelectedRole] = React.useState<SelectedRole>('OWNER');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    });

    const passwordValue = watch('password') ?? '';
    const hasTypedPassword = passwordValue.length > 0;
    const isAgentlik = selectedRole === 'AGENTLIK';

    const onSubmit = async (data: RegisterFormValues) => {
        if (isAgentlik && (!data.organizationName || data.organizationName.trim().length < 2)) {
            addToast({ type: 'error', message: 'Şirkət adı ən azı 2 simvol olmalıdır.' });
            return;
        }
        try {
            setIsLoading(true);
            const response = await api.post('/auth/register', {
                role: selectedRole,
                entityType: isAgentlik ? 'COMPANY' : 'INDIVIDUAL',
                name: data.name,
                email: data.email,
                password: data.password,
                organizationName: isAgentlik ? data.organizationName : data.name,
            });

            const { user, token } = response.data.data;
            login({ user, token });
            addToast({ type: 'success', message: 'Hesabınız uğurla yaradıldı! Xoş gəlmisiniz 🎉' });

            if (selectedRole === 'ICARECI') {
                navigate('/kabinet');
            } else {
                navigate('/dashboard');
            }
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

            <div className="w-full max-w-lg space-y-6">
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
                            <CardTitle className="text-xl text-center">
                                Hesab növünüzü seçin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Role Selection Cards */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {ROLE_CARDS.map(({ role, emoji, title, subtitle }) => {
                                    const isSelected = selectedRole === role;
                                    return (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setSelectedRole(role)}
                                            className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all focus:outline-none ${
                                                isSelected
                                                    ? 'border-gold bg-gold/10 shadow-sm'
                                                    : 'border-border/40 bg-surface hover:border-gold/40 hover:bg-white/5'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold">
                                                    <Check size={11} strokeWidth={3} className="text-[#0A0B0F]" />
                                                </span>
                                            )}
                                            <span className="text-2xl leading-none">{emoji}</span>
                                            <span className={`text-sm font-semibold leading-snug ${isSelected ? 'text-gold' : 'text-text'}`}>
                                                {title}
                                            </span>
                                            <span className="text-[11px] text-muted leading-snug">{subtitle}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border/40" />
                                <span className="text-xs text-muted">Məlumatlarınızı daxil edin</span>
                                <div className="flex-1 h-px bg-border/40" />
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

                            {isAgentlik && (
                                <Input
                                    label="Şirkət / Agentlik adı"
                                    type="text"
                                    placeholder="Əliyev Daşınmaz Əmlak MMC"
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

                            {/* Password strength checklist */}
                            {hasTypedPassword && (
                                <div className="rounded-lg border border-border/40 bg-surface/60 px-4 py-3 space-y-1.5">
                                    {passwordRules.map((rule) => {
                                        const passed = rule.test(passwordValue);
                                        return (
                                            <div
                                                key={rule.label}
                                                className={`flex items-center gap-2 text-xs transition-colors ${passed ? 'text-green-400' : 'text-muted'}`}
                                            >
                                                <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all ${passed ? 'bg-green-400/20' : 'bg-white/5'}`}>
                                                    {passed
                                                        ? <Check size={10} strokeWidth={3} />
                                                        : <X size={10} strokeWidth={3} className="text-muted/50" />
                                                    }
                                                </span>
                                                {rule.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

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

                            <p className="text-[11px] text-muted text-center leading-relaxed px-2">
                                Qeydiyyatdan keçməklə{' '}
                                <a
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gold hover:underline font-medium"
                                >
                                    İstifadə Şərtləri
                                </a>{' '}
                                və{' '}
                                <a
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gold hover:underline font-medium"
                                >
                                    Publik Aferta
                                </a>{' '}
                                ilə razılaşırsınız.
                            </p>

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
