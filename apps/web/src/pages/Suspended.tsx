import React from 'react';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Settings } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';

export function Suspended() {
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();

    // If user is actually not suspended or doesn't exist, they shouldn't be here
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.organization?.subscriptionStatus === 'ACTIVE' || user.organization?.subscriptionStatus === 'GRACE_PERIOD') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg flex-col text-center">
            <div className="w-24 h-24 bg-red/10 text-red rounded-full flex items-center justify-center mb-6 border border-red/20 shadow-lg">
                <AlertTriangle className="w-12 h-12" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-text mb-4 tracking-tight">
                Hesabınız dayandırılıb
            </h1>
            <p className="text-muted text-lg max-w-md mx-auto mb-8 font-medium">
                Abunəlik müddətiniz bitdiyinə görə hesabınız məhdudlaşdırılıb. Məlumatlarınız <strong className="text-text">90 gün</strong> ərzində saxlanılacaq. Davam etmək üçün ödəniş etməyiniz xahiş olunur.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-gold/20"
                    onClick={() => navigate('/settings')}
                >
                    <Settings className="w-5 h-5 mr-2" /> Ayarlara keç və Ödəniş et
                </Button>
            </div>
        </div>
    );
}
