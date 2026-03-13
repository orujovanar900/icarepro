import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';
const ORANGE = '#E8620A';
const NAVY = '#1A1A2E';
const BORDER = 'rgba(0,0,0,0.08)';
const MUTED = '#6B7280';

const btnGold: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: GOLD_GRAD, backgroundSize: '200% 200%',
    color: '#0A0B0F', fontWeight: 700, border: 'none',
    borderRadius: 12, padding: '9px 20px', fontSize: 14,
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
};

const btnGhost: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'transparent', color: NAVY, fontWeight: 500,
    border: '1px solid rgba(26,26,46,0.25)', borderRadius: 12,
    padding: '9px 20px', fontSize: 14,
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
};

const btnOrange: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: ORANGE, color: '#FFF', fontWeight: 700, border: 'none',
    borderRadius: 12, padding: '9px 20px', fontSize: 14,
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
};

export function PortalNavbar() {
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const isOwnerSide = isAuthenticated && ['SUPERADMIN', 'OWNER', 'MANAGER', 'AGENTLIK', 'AGENT'].includes(user?.role ?? '');
    const isTenant = isAuthenticated && !isOwnerSide;

    return (
        <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-6">

                {/* Logo */}
                <Link to="/" className="shrink-0 flex items-center hover:opacity-80 transition-opacity" style={{ textDecoration: 'none', letterSpacing: '-0.5px' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#C9A84C' }}>İcarə</span>
                    <span style={{ fontSize: 24, fontWeight: 400, color: NAVY }}>&nbsp;Pro</span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
                    <Link to="/elanlar" className="hover:opacity-70 transition-opacity" style={{ color: NAVY, textDecoration: 'none' }}>Obyektlər</Link>
                    <Link to="/xerite" className="hover:opacity-70 transition-opacity" style={{ color: MUTED, textDecoration: 'none' }}>Xəritə</Link>
                    <Link to="/haqqinda" className="hover:opacity-70 transition-opacity" style={{ color: MUTED, textDecoration: 'none' }}>Necə işləyir</Link>
                </nav>

                {/* Right actions */}
                <div className="hidden md:flex items-center gap-3">
                    {/* Elan əlavə et — always visible */}
                    <Link to="/elan-elave-et" style={btnOrange}>
                        <Plus style={{ width: 15, height: 15 }} />
                        Elan əlavə et
                    </Link>

                    {!isAuthenticated && (
                        <>
                            <Link to="/login" style={btnGhost}>Daxil ol</Link>
                            <Link to="/register" style={btnGold}>Başla</Link>
                        </>
                    )}
                    {isTenant && (
                        <>
                            <button onClick={() => navigate('/kabinet')} style={btnGhost}>♥ Kabinet</button>
                            <button
                                onClick={() => { logout(); navigate('/'); }}
                                style={{ color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                            >
                                Çıxış
                            </button>
                        </>
                    )}
                    {isOwnerSide && (
                        <button onClick={() => navigate('/dashboard')} style={btnGold}>
                            İdarəetmə paneli →
                        </button>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(v => !v)}
                    className="md:hidden p-2"
                    style={{ color: NAVY, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden bg-white px-5 py-4 flex flex-col gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                    <Link to="/elanlar" style={{ color: NAVY, fontWeight: 500, textDecoration: 'none', fontSize: 15 }} onClick={() => setMobileOpen(false)}>Obyektlər</Link>
                    <Link to="/xerite" style={{ color: MUTED, fontWeight: 500, textDecoration: 'none', fontSize: 15 }} onClick={() => setMobileOpen(false)}>Xəritə</Link>
                    <Link to="/haqqinda" style={{ color: MUTED, fontWeight: 500, textDecoration: 'none', fontSize: 15 }} onClick={() => setMobileOpen(false)}>Necə işləyir</Link>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }} className="flex flex-col gap-2">
                        <Link to="/elan-elave-et" style={{ ...btnOrange, justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>
                            <Plus style={{ width: 15, height: 15 }} /> Elan əlavə et
                        </Link>
                        {!isAuthenticated && (
                            <>
                                <Link to="/login" style={{ ...btnGhost, justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Daxil ol</Link>
                                <Link to="/register" style={{ ...btnGold, justifyContent: 'center' }} onClick={() => setMobileOpen(false)}>Başla</Link>
                            </>
                        )}
                        {isOwnerSide && (
                            <button
                                onClick={() => { navigate('/dashboard'); setMobileOpen(false); }}
                                style={{ ...btnGold, justifyContent: 'center' }}
                            >
                                İdarəetmə paneli →
                            </button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
