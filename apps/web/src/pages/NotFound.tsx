import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
            <div className="relative mb-8">
                <div className="text-[120px] sm:text-[180px] font-extrabold text-gold/10 leading-none select-none">
                    404
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-text">
                            Səhifə tapılmadı
                        </h1>
                        <p className="text-muted mt-2 text-sm sm:text-base">
                            Axtardığınız səhifə mövcud deyil və ya silinib.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri Qayıt
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                    <Home className="w-4 h-4 mr-2" />
                    Ana Səhifəyə Get
                </Button>
            </div>
        </div>
    );
}
