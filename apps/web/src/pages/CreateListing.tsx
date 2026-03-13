import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { useAuthStore } from '@/store/auth';

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';

export function CreateListing() {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();

    const isOwner = isAuthenticated && ['SUPERADMIN', 'OWNER', 'MANAGER'].includes(user?.role ?? '');

    // If owner — redirect to dashboard property creation
    React.useEffect(() => {
        if (isOwner) {
            navigate('/dashboard/properties/new', { replace: true });
        }
    }, [isOwner, navigate]);

    return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
            <PortalNavbar />

            <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                <div style={{
                    background: C.white, borderRadius: 24, padding: '48px 40px',
                    maxWidth: 520, width: '100%',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                    border: `1px solid ${C.border}`,
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: C.navy, marginBottom: 10 }}>
                        Elan yerləşdirin
                    </h1>
                    <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, marginBottom: 32 }}>
                        İcarəPro platformasında mülkünüzü elan edin. Aktivlik, növbə sistemi və rəqəmsal idarəetmə ilə kirayəçi tapmaq daha asan.
                    </p>

                    {/* Feature pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                        {[
                            '📋 Növbə sistemi',
                            '📊 Real-vaxt statistika',
                            '💬 Kirayəçi profili',
                            '📅 Müqavilə idarəetməsi',
                            '💳 Ödəniş izləməsi',
                        ].map(f => (
                            <span key={f} style={{
                                fontSize: 13, padding: '5px 12px', borderRadius: 20,
                                background: 'rgba(201,168,76,0.1)', color: C.navy,
                                border: '1px solid rgba(201,168,76,0.25)',
                            }}>{f}</span>
                        ))}
                    </div>

                    {/* CTA buttons */}
                    {!isAuthenticated ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Link
                                to="/register"
                                style={{
                                    display: 'block', padding: '14px 0', borderRadius: 14,
                                    background: GOLD_GRAD, backgroundSize: '200% 200%',
                                    color: '#0A0B0F', fontWeight: 700, fontSize: 15,
                                    textDecoration: 'none', textAlign: 'center',
                                }}
                            >
                                Qeydiyyatdan keç &amp; Elan əlavə et
                            </Link>
                            <Link
                                to="/login"
                                style={{
                                    display: 'block', padding: '13px 0', borderRadius: 14,
                                    background: 'transparent', color: C.navy, fontWeight: 600, fontSize: 14,
                                    textDecoration: 'none', border: `1px solid ${C.border}`,
                                }}
                            >
                                Hesabım var — Daxil ol
                            </Link>
                            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                                Qeydiyyat pulsuzdur. İstənilən vaxt ləğv edə bilərsiniz.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <p style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
                                Elan yerləşdirmək üçün sahib hesabına ehtiyacınız var.
                            </p>
                            <Link
                                to="/register"
                                style={{
                                    display: 'block', padding: '14px 0', borderRadius: 14,
                                    background: GOLD_GRAD, backgroundSize: '200% 200%',
                                    color: '#0A0B0F', fontWeight: 700, fontSize: 15,
                                    textDecoration: 'none', textAlign: 'center',
                                }}
                            >
                                Sahib kimi qeydiyyat
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            <PortalFooter />
        </div>
    );
}
