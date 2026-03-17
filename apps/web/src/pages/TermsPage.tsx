import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
    const navigate = useNavigate();

    return (
        <div
            className="flex min-h-screen flex-col items-center p-6 w-full"
            style={{ backgroundColor: '#F5F0E8' }}
        >
            <div className="w-full max-w-2xl space-y-8 py-10">
                <div className="text-center">
                    <Link
                        to="/"
                        className="text-4xl font-heading tracking-tight flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <span className="font-extrabold">
                            <span className="text-gold">icare</span>
                            <span style={{ color: '#1A1A2E' }}>pro</span>
                        </span>
                    </Link>
                </div>

                <div
                    className="rounded-2xl border p-8 shadow-md"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E0D8' }}
                >
                    <h1
                        className="text-2xl font-bold font-heading mb-2"
                        style={{ color: '#1A1A2E' }}
                    >
                        İstifadə Şərtləri və Publik Aferta
                    </h1>
                    <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
                        Son yenilənmə: 2026
                    </p>

                    <div
                        className="text-sm leading-relaxed space-y-4"
                        style={{ color: '#6B7280' }}
                    >
                        <p>
                            Bu sənəd hazırlanır. Tezliklə əlavə ediləcək.
                        </p>
                        <p>
                            İcarePro xidmətindən istifadə etməklə siz bu şərtlərlə razılaşmış hesab
                            olunursunuz. Suallarınız üçün{' '}
                            <a
                                href="mailto:support@icare.pro.az"
                                className="text-gold hover:underline"
                            >
                                support@icare.pro.az
                            </a>{' '}
                            ünvanına müraciət edə bilərsiniz.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="mt-8 flex items-center gap-2 text-sm hover:text-gold transition-colors"
                        style={{ color: '#9CA3AF' }}
                    >
                        <ArrowLeft size={16} />
                        Geri qayıt
                    </button>
                </div>
            </div>
        </div>
    );
}
