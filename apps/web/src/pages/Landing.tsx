import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    FileText,
    CreditCard,
    Users,
    BarChart3,
    Bell,
    Menu,
    X,
    ChevronDown,
    CheckCircle2,
    XCircle,
    ArrowRight,
    TrendingUp,
    Home,
    Briefcase,
} from 'lucide-react';

/* ──────────────────────────────────────
   INLINE STYLES (no Tailwind dependency)
   ────────────────────────────────────── */
const C = {
    gold: '#C9A84C',
    goldAlpha: 'rgba(201,168,76,0.15)',
    goldAlpha30: 'rgba(201,168,76,0.30)',
    dark: '#0A0B0F',
    surface: '#12141A',
    surface2: '#1A1D26',
    text: '#F0F2F5',
    muted: '#8899B0',
    green: '#34d399',
    purple: '#a78bfa',
    orange: '#fb923c',
    red: 'rgba(239,68,68,0.15)',
    redBorder: 'rgba(239,68,68,0.25)',
    white10: 'rgba(255,255,255,0.06)',
    white20: 'rgba(255,255,255,0.10)',
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }

  body {
    background: ${C.dark};
    color: ${C.text};
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
  }

  h1,h2,h3,h4 { font-family: 'Syne', sans-serif; }

  @keyframes floatA {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes floatB {
    0%,100% { transform: translateY(-6px); }
    50%      { transform: translateY(8px); }
  }
  @keyframes floatC {
    0%,100% { transform: translateY(4px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translateY(32px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes pulse-gold {
    0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
    50%      { box-shadow: 0 0 0 12px rgba(201,168,76,0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .fade-in-up {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }
  .fade-in-up.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .btn-gold {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #C9A84C, #e8c56b, #C9A84C);
    background-size: 200% 200%;
    color: #0A0B0F;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, background-position 0.4s;
    text-decoration: none;
  }
  .btn-gold:hover {
    transform: scale(1.04);
    box-shadow: 0 0 28px rgba(201,168,76,0.55);
    background-position: right center;
  }

  .btn-ghost {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    color: ${C.text};
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s, background 0.2s;
    text-decoration: none;
  }
  .btn-ghost:hover {
    transform: scale(1.03);
    border-color: ${C.gold};
    background: rgba(201,168,76,0.08);
  }

  .glass-card {
    background: rgba(26,29,38,0.7);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 20px;
  }

  .feature-card:hover {
    border-color: rgba(201,168,76,0.35) !important;
    transform: translateY(-4px);
    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  }
  .feature-card { transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s; }

  .pricing-toggle-pill {
    display: inline-flex;
    background: ${C.surface2};
    border-radius: 50px;
    padding: 4px;
    gap: 4px;
  }
  .pricing-toggle-pill button {
    border: none;
    border-radius: 50px;
    padding: 8px 22px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.25s, color 0.25s;
  }

  .star { color: ${C.gold}; }

  @media (max-width: 768px) {
    .hero-grid { flex-direction: column !important; }
    .features-grid { grid-template-columns: 1fr !important; }
    .pricing-grid { flex-direction: column !important; align-items: center !important; }
    .pricing-card { width: 100% !important; max-width: 360px; }
    .footer-cols { flex-direction: column !important; gap: 32px !important; }
    .steps-row { flex-direction: column !important; }
    .step-connector { display: none !important; }
    .testimonials-grid { flex-direction: column !important; }
    .stats-flex { flex-wrap: wrap !important; gap: 24px !important; }
    .nav-links { display: none !important; }
    .nav-hamburger { display: flex !important; }
    .nav-right { gap: 8px !important; }
    .problems-grid { grid-template-columns: 1fr !important; }
  }
`;

/* ──────────────────────────────────────
   ANIMATED COUNTER HOOK
   ────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(ease * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [start, target, duration]);
    return count;
}

/* ──────────────────────────────────────
   INTERSECTION OBSERVER HOOK
   ────────────────────────────────────── */
function useInView(threshold = 0.2) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting) { setInView(true); obs.disconnect(); }
            },
            { threshold }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

/* ──────────────────────────────────────
   SCROLL FADE HOOK (for multiple cards)
   ────────────────────────────────────── */
function useScrollFade() {
    useEffect(() => {
        const els = document.querySelectorAll('.fade-in-up');
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        els.forEach(el => obs.observe(el));
        return () => obs.disconnect();
    }, []);
}

/* ══════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════ */
export function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [pricingAnnual, setPricingAnnual] = useState(false);

    // Navbar scroll effect
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useScrollFade();

    // Stats counter
    const { ref: statsRef, inView: statsInView } = useInView(0.3);
    const c1 = useCountUp(50, 1600, statsInView);
    const c2 = useCountUp(200, 1800, statsInView);
    const c3 = useCountUp(1200, 2000, statsInView);
    const c4 = useCountUp(2, 1500, statsInView);

    const price = (base: number) => pricingAnnual ? Math.round(base * 0.8) : base;

    return (
        <>
            <style>{globalStyles}</style>

            {/* ─────────────── NAVBAR ─────────────── */}
            <nav style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: '0 24px',
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background 0.35s, backdrop-filter 0.35s, border-bottom 0.35s',
                background: scrolled ? 'rgba(10,11,15,0.85)' : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
                {/* Logo */}
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        fontFamily: 'Syne, sans-serif',
                        fontWeight: 800,
                        fontSize: 22,
                        letterSpacing: '-0.5px',
                    }}>
                        <span style={{ color: C.gold }}>İ</span>
                        <span style={{ color: C.text }}>carə Pro</span>
                    </span>
                </Link>

                {/* Center Links */}
                <div className="nav-links" style={{ display: 'flex', gap: 36, listStyle: 'none' }}>
                    {['Xüsusiyyətlər', 'Qiymətlər', 'Haqqımızda'].map((l, i) => (
                        <a key={i} href={`#${['features', 'pricing', 'about'][i]}`} style={{
                            color: C.muted,
                            textDecoration: 'none',
                            fontSize: 15,
                            fontWeight: 500,
                            transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                        >{l}</a>
                    ))}
                </div>

                {/* Right buttons */}
                <div className="nav-right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link to="/login" className="btn-ghost" style={{ padding: '9px 20px', fontSize: 14 }}>
                        Daxil ol
                    </Link>
                    <Link to="/register" className="btn-gold" style={{ padding: '9px 20px', fontSize: 14 }}>
                        Başla
                    </Link>
                    {/* Hamburger */}
                    <button
                        className="nav-hamburger"
                        onClick={() => setMenuOpen(o => !o)}
                        style={{
                            display: 'none',
                            background: 'none',
                            border: 'none',
                            color: C.text,
                            cursor: 'pointer',
                            padding: 4,
                        }}
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {menuOpen && (
                <div style={{
                    position: 'fixed',
                    top: 68,
                    left: 0,
                    right: 0,
                    zIndex: 999,
                    background: 'rgba(10,11,15,0.97)',
                    backdropFilter: 'blur(20px)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                    borderBottom: `1px solid rgba(255,255,255,0.06)`,
                }}>
                    {['Xüsusiyyətlər', 'Qiymətlər', 'Haqqımızda'].map((l, i) => (
                        <a key={i} href={`#${['features', 'pricing', 'about'][i]}`}
                            onClick={() => setMenuOpen(false)}
                            style={{ color: C.text, textDecoration: 'none', fontSize: 17, fontWeight: 500 }}>
                            {l}
                        </a>
                    ))}
                    <Link to="/login" className="btn-ghost" style={{ padding: '12px 20px', textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Daxil ol</Link>
                    <Link to="/register" className="btn-gold" style={{ padding: '12px 20px', textAlign: 'center', justifyContent: 'center' }} onClick={() => setMenuOpen(false)}>Başla</Link>
                </div>
            )}

            {/* ─────────────── HERO ─────────────── */}
            <section style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                padding: '120px 24px 80px',
                overflow: 'hidden',
            }}>
                {/* BG mesh */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    background: `
            radial-gradient(ellipse 70% 60% at 85% 10%, rgba(201,168,76,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 80%, rgba(167,139,250,0.06) 0%, transparent 55%),
            ${C.dark}
          `,
                }} />
                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px',
                }} />

                <div style={{
                    position: 'relative', zIndex: 1,
                    maxWidth: 1200, margin: '0 auto', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 48,
                }} className="hero-grid">

                    {/* LEFT */}
                    <div style={{ flex: '0 0 58%' }}>
                        {/* Badge */}
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: C.goldAlpha,
                            border: `1px solid ${C.goldAlpha30}`,
                            borderRadius: 50, padding: '6px 16px',
                            fontSize: 13, color: C.gold, fontWeight: 500,
                            marginBottom: 28,
                            animation: 'fadeSlideUp 0.6s ease both',
                        }}>
                            🇦🇿 Azərbaycan üçün hazırlanmış
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(36px, 5vw, 62px)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            letterSpacing: '-1.5px',
                            marginBottom: 24,
                            animation: 'fadeSlideUp 0.6s 0.1s ease both',
                        }}>
                            Əmlakınızı{' '}
                            <span style={{
                                background: `linear-gradient(135deg, ${C.gold}, #e8c56b, ${C.gold})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundSize: '200% 200%',
                                animation: 'gradientShift 4s ease infinite',
                                display: 'inline-block',
                            }}>professional</span>{' '}
                            səviyyədə idarə edin
                        </h1>

                        <p style={{
                            fontSize: 18,
                            color: C.muted,
                            lineHeight: 1.7,
                            maxWidth: 520,
                            marginBottom: 36,
                            fontWeight: 300,
                            animation: 'fadeSlideUp 0.6s 0.2s ease both',
                        }}>
                            Müqavilələr, ödənişlər, kirayəçilər — hamısı bir yerdə.
                            Vaxtınızı qənaət edin, gəlirinizi artırın.
                        </p>

                        <div style={{
                            display: 'flex', gap: 16, flexWrap: 'wrap',
                            marginBottom: 36,
                            animation: 'fadeSlideUp 0.6s 0.3s ease both',
                        }}>
                            <Link to="/register" className="btn-gold" style={{ padding: '14px 30px', fontSize: 16 }}>
                                Pulsuz başla <ArrowRight size={18} />
                            </Link>
                            <a href="#features" className="btn-ghost" style={{ padding: '14px 28px', fontSize: 16 }}>
                                Demo izlə
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div style={{
                            display: 'flex', gap: 20, flexWrap: 'wrap',
                            animation: 'fadeSlideUp 0.6s 0.4s ease both',
                        }}>
                            {['✓ 14 gün pulsuz', '✓ Kart tələb olunmur', '✓ AZ dəstəyi'].map((b, i) => (
                                <span key={i} style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ color: C.green }}>{b.slice(0, 1)}</span>
                                    {b.slice(1)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT — Dashboard mockup */}
                    <div style={{ flex: 1, position: 'relative', minHeight: 380 }}>
                        {/* Main dashboard card */}
                        <div className="glass-card" style={{
                            padding: '24px',
                            position: 'relative',
                            animation: 'fadeSlideUp 0.7s 0.2s ease both',
                        }}>
                            {/* Fake top bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
                                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                                ))}
                                <div style={{
                                    flex: 1, height: 8, background: C.white10,
                                    borderRadius: 4, marginLeft: 8,
                                }} />
                            </div>
                            {/* Fake chart bars */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Aylıq gəlir (AZN)</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                                    {[55, 70, 45, 85, 60, 90, 75, 95, 65, 80, 70, 88].map((h, i) => (
                                        <div key={i} style={{
                                            flex: 1,
                                            height: `${h}%`,
                                            borderRadius: '4px 4px 0 0',
                                            background: i === 11
                                                ? `linear-gradient(to top, ${C.gold}, #e8c56b)`
                                                : 'rgba(201,168,76,0.2)',
                                        }} />
                                    ))}
                                </div>
                            </div>
                            {/* Mini stats row */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[
                                    { label: 'Obyektlər', val: '24', icon: '🏢' },
                                    { label: 'Kirayəçilər', val: '21', icon: '👥' },
                                    { label: 'Aktiv müq.', val: '18', icon: '📋' },
                                ].map((s, i) => (
                                    <div key={i} style={{
                                        flex: 1, background: C.white10,
                                        borderRadius: 12, padding: '10px 12px',
                                        textAlign: 'center',
                                    }}>
                                        <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: C.text }}>{s.val}</div>
                                        <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating stat cards */}
                        <div style={{
                            position: 'absolute', top: -28, right: -24,
                            animation: 'floatA 3.5s ease-in-out infinite',
                        }}>
                            <div className="glass-card" style={{
                                padding: '12px 18px',
                                borderLeft: `3px solid ${C.green}`,
                                whiteSpace: 'nowrap',
                            }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Bu ay gəlir</div>
                                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: C.green }}>
                                    AZN 12,450
                                </div>
                            </div>
                        </div>

                        <div style={{
                            position: 'absolute', bottom: 40, right: -32,
                            animation: 'floatB 4s ease-in-out infinite',
                        }}>
                            <div className="glass-card" style={{
                                padding: '12px 18px',
                                borderLeft: `3px solid ${C.purple}`,
                                whiteSpace: 'nowrap',
                            }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Doluluq dərəcəsi</div>
                                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: C.purple }}>
                                    94%
                                </div>
                            </div>
                        </div>

                        <div style={{
                            position: 'absolute', bottom: -20, left: -20,
                            animation: 'floatC 3s ease-in-out infinite',
                        }}>
                            <div className="glass-card" style={{
                                padding: '12px 18px',
                                borderLeft: `3px solid ${C.orange}`,
                                whiteSpace: 'nowrap',
                            }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Müqavilə yenilənir</div>
                                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: C.orange }}>
                                    3 müqavilə
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────── STATS BAR ─────────────── */}
            <div ref={statsRef} style={{
                background: C.surface,
                borderTop: `1px solid rgba(255,255,255,0.06)`,
                borderBottom: `1px solid rgba(255,255,255,0.06)`,
                padding: '36px 24px',
            }}>
                <div style={{
                    maxWidth: 1000, margin: '0 auto',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    flexWrap: 'wrap', gap: 16,
                }} className="stats-flex">
                    {[
                        { val: `${c1}+`, unit: 'sahibkar' },
                        { val: `${c2}+`, unit: 'obyekt' },
                        { val: `${c3 >= 1000 ? (c3 / 1000).toFixed(1) + 'K' : c3}+`, unit: 'müqavilə' },
                        { val: `AZN ${c4}M+`, unit: 'idarə olunan' },
                    ].map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: 36,
                                fontWeight: 800,
                                fontFamily: 'Syne, sans-serif',
                                color: C.gold,
                                lineHeight: 1,
                                marginBottom: 4,
                            }}>{s.val}</div>
                            <div style={{ fontSize: 14, color: C.muted }}>{s.unit}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─────────────── PROBLEMS ─────────────── */}
            <section style={{ padding: '100px 24px', background: C.dark }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 60 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
                            Tanış problemlər?
                        </h2>
                        <p style={{ fontSize: 17, color: C.muted }}>Əmlak sahiblərinin hər gün üzləşdiyi çətinliklər</p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 24,
                        marginBottom: 56,
                    }} className="problems-grid">
                        {[
                            {
                                icon: '❌',
                                title: 'Ödənişləri Excel-də izləmək',
                                desc: 'Hər ay eyni məlumatları əl ilə daxil etmək, hesablaşmaları səhv etmək',
                            },
                            {
                                icon: '❌',
                                title: 'Müqavilələr harada olduğunu bilməmək',
                                desc: 'Kağız müqavilələr, skan edilmiş fayllar — hər şey dağınıq',
                            },
                            {
                                icon: '❌',
                                title: 'Borclu kirayəçiləri izləmək',
                                desc: 'Kim nə qədər borcludur? Nə vaxt ödəməlidir? Heç vaxt aydın deyil',
                            },
                        ].map((p, i) => (
                            <div key={i} className="glass-card fade-in-up" style={{
                                padding: '30px 28px',
                                background: C.red,
                                borderColor: C.redBorder,
                                transitionDelay: `${i * 0.1}s`,
                            }}>
                                <div style={{ fontSize: 32, marginBottom: 16 }}>{p.icon}</div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: '#fca5a5' }}>{p.title}</h3>
                                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{p.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Arrow down */}
                    <div className="fade-in-up" style={{ textAlign: 'center' }}>
                        <div style={{
                            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                        }}>
                            <div style={{
                                width: 1, height: 48,
                                background: `linear-gradient(to bottom, rgba(255,255,255,0.06), ${C.gold})`,
                            }} />
                            <div style={{
                                fontSize: 13, color: C.gold, fontWeight: 600, letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                            }}>İcarə Pro ilə həll</div>
                            <ChevronDown size={20} color={C.gold} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────── FEATURES ─────────────── */}
            <section id="features" style={{ padding: '100px 24px', background: C.surface }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
                            Hər şey bir platformada
                        </h2>
                        <p style={{ fontSize: 17, color: C.muted }}>
                            Əmlak idarəetməsinin bütün aspektlərini əhatə edirik
                        </p>
                    </div>

                    <div className="features-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 24,
                    }}>
                        {[
                            {
                                Icon: Building2,
                                color: C.gold,
                                title: 'Obyekt İdarəetməsi',
                                desc: 'Mənzil, ofis, mağaza — bütün növ əmlakları idarə edin',
                            },
                            {
                                Icon: FileText,
                                color: C.purple,
                                title: 'Ağıllı Müqavilələr',
                                desc: 'Müqavilə yaradın, imzalayın, avtomatik yeniləmə xatırlatmaları alın',
                            },
                            {
                                Icon: CreditCard,
                                color: C.green,
                                title: 'Ödəniş İzləmə',
                                desc: 'Hər ödənişi qeyd edin, borclular üçün avtomatik bildirişlər',
                            },
                            {
                                Icon: Users,
                                color: '#60a5fa',
                                title: 'Kirayəçi Bazası',
                                desc: 'FİN, pasport, şirkət məlumatları — hamısı bir yerdə',
                            },
                            {
                                Icon: BarChart3,
                                color: C.orange,
                                title: 'Vergi Hesabatları',
                                desc: 'Azərbaycan vergi qanunvericiliyinə uyğun 10%/14%/20% hesablamalar',
                            },
                            {
                                Icon: Bell,
                                color: '#f472b6',
                                title: 'Bildirişlər',
                                desc: 'Müqavilə bitmədən 30 gün əvvəl xəbərdarlıq, ödəniş gecikməsi bildirişi',
                            },
                        ].map(({ Icon, color, title, desc }, i) => (
                            <div key={i} className="glass-card feature-card fade-in-up" style={{
                                padding: '32px 28px',
                                transitionDelay: `${(i % 3) * 0.12}s`,
                            }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: 14,
                                    background: `${color}22`,
                                    border: `1px solid ${color}44`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 20,
                                }}>
                                    <Icon size={24} color={color} />
                                </div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────── HOW IT WORKS ─────────────── */}
            <section style={{ padding: '100px 24px', background: C.dark }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 72 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
                            Necə işləyir?
                        </h2>
                    </div>

                    <div className="steps-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                        {[
                            {
                                num: '①',
                                title: 'Qeydiyyat',
                                sub: '2 dəqiqə',
                                desc: 'E-poçtunuzla hesab açın, şirkət məlumatlarınızı daxil edin',
                                Icon: Home,
                            },
                            {
                                num: '②',
                                title: 'Obyekt əlavə edin',
                                sub: '',
                                desc: 'Əmlakınızı, kirayəçilərinizi və müqavilələrinizi daxil edin',
                                Icon: Briefcase,
                            },
                            {
                                num: '③',
                                title: 'İdarə edin',
                                sub: '',
                                desc: 'Dashboard-dan hər şeyi izləyin, hesabatlar alın',
                                Icon: TrendingUp,
                            },
                        ].map(({ num, title, sub, desc, Icon }, i) => (
                            <React.Fragment key={i}>
                                <div className="fade-in-up" style={{
                                    flex: 1, textAlign: 'center',
                                    transitionDelay: `${i * 0.15}s`,
                                }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: C.goldAlpha,
                                        border: `2px solid ${C.goldAlpha30}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px',
                                        fontSize: 28,
                                        animation: 'pulse-gold 3s ease infinite',
                                        animationDelay: `${i * 0.7}s`,
                                    }}>{num}</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{title}</h3>
                                    {sub && <div style={{ fontSize: 12, color: C.gold, marginBottom: 10 }}>({sub})</div>}
                                    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 210, margin: '10px auto 0' }}>{desc}</p>
                                </div>
                                {i < 2 && (
                                    <div className="step-connector" style={{
                                        flex: '0 0 60px',
                                        height: 2,
                                        background: `linear-gradient(to right, ${C.gold}, rgba(201,168,76,0.2))`,
                                        marginTop: 36,
                                        alignSelf: 'flex-start',
                                    }} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────── PRICING ─────────────── */}
            <section id="pricing" style={{ padding: '100px 24px', background: C.surface }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
                            Şəffaf qiymətlər
                        </h2>

                        {/* Toggle */}
                        <div className="pricing-toggle-pill" style={{ marginTop: 24 }}>
                            <button
                                onClick={() => setPricingAnnual(false)}
                                style={{
                                    background: !pricingAnnual ? C.gold : 'transparent',
                                    color: !pricingAnnual ? C.dark : C.muted,
                                    fontWeight: !pricingAnnual ? 700 : 400,
                                }}
                            >Aylıq</button>
                            <button
                                onClick={() => setPricingAnnual(true)}
                                style={{
                                    background: pricingAnnual ? C.gold : 'transparent',
                                    color: pricingAnnual ? C.dark : C.muted,
                                    fontWeight: pricingAnnual ? 700 : 400,
                                }}
                            >
                                İllik
                                <span style={{
                                    marginLeft: 6, fontSize: 10,
                                    background: C.green, color: C.dark,
                                    borderRadius: 50, padding: '1px 6px', fontWeight: 700,
                                }}>-20%</span>
                            </button>
                        </div>
                    </div>

                    <div className="pricing-grid" style={{
                        display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'stretch',
                    }}>
                        {[
                            {
                                name: 'BAŞLANĞIC',
                                price: price(29),
                                popular: false,
                                features: [
                                    { ok: true, t: '10 obyektə qədər' },
                                    { ok: true, t: 'Müqavilə idarəetməsi' },
                                    { ok: true, t: 'Ödəniş izləmə' },
                                    { ok: true, t: 'Email bildirişlər' },
                                    { ok: false, t: 'Vergi hesabatları' },
                                    { ok: false, t: 'API girişi' },
                                ],
                                cta: 'Başla',
                                ctaLink: '/register',
                                gold: false,
                            },
                            {
                                name: 'BİZNES',
                                price: price(69),
                                popular: true,
                                features: [
                                    { ok: true, t: '50 obyektə qədər' },
                                    { ok: true, t: 'Hər şey Başlanğıcda +' },
                                    { ok: true, t: 'Vergi hesabatları' },
                                    { ok: true, t: 'Kirayəçi bazası' },
                                    { ok: true, t: 'Prioritet dəstək' },
                                    { ok: false, t: 'API girişi' },
                                ],
                                cta: 'Başla',
                                ctaLink: '/register',
                                gold: true,
                            },
                            {
                                name: 'KORPORATİV',
                                price: price(149),
                                popular: false,
                                features: [
                                    { ok: true, t: 'Limitsiz obyekt' },
                                    { ok: true, t: 'Hər şey Biznes-də +' },
                                    { ok: true, t: 'API girişi' },
                                    { ok: true, t: 'Xüsusi inteqrasiyalar' },
                                    { ok: true, t: 'Şəxsi menecer' },
                                ],
                                cta: 'Əlaqə',
                                ctaLink: '/register',
                                gold: false,
                            },
                        ].map((plan, i) => (
                            <div key={i} className="pricing-card glass-card fade-in-up" style={{
                                width: 320,
                                padding: '36px 30px',
                                position: 'relative',
                                border: plan.popular ? `1.5px solid ${C.gold}` : '1px solid rgba(255,255,255,0.08)',
                                transform: plan.popular ? 'scale(1.04)' : 'scale(1)',
                                boxShadow: plan.popular ? `0 0 48px rgba(201,168,76,0.18)` : 'none',
                                transitionDelay: `${i * 0.12}s`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                {plan.popular && (
                                    <div style={{
                                        position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                                        background: C.gold, color: C.dark,
                                        fontSize: 11, fontWeight: 800, fontFamily: 'Syne, sans-serif',
                                        padding: '4px 16px', borderRadius: 50,
                                        letterSpacing: '0.08em', textTransform: 'uppercase',
                                        whiteSpace: 'nowrap',
                                    }}>🔥 Ən populyar</div>
                                )}
                                <div style={{ fontSize: 12, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{plan.name}</div>
                                <div style={{ marginBottom: 28 }}>
                                    <span style={{ fontSize: 42, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: plan.popular ? C.gold : C.text }}>{plan.price}</span>
                                    <span style={{ fontSize: 16, color: C.muted }}> AZN/ay</span>
                                </div>
                                <ul style={{ listStyle: 'none', marginBottom: 32, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {plan.features.map((f, j) => (
                                        <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: f.ok ? C.text : C.muted }}>
                                            {f.ok
                                                ? <CheckCircle2 size={16} color={C.green} />
                                                : <XCircle size={16} color='rgba(255,255,255,0.2)' />}
                                            {f.t}
                                        </li>
                                    ))}
                                </ul>
                                <Link to={plan.ctaLink}
                                    className={plan.gold ? 'btn-gold' : 'btn-ghost'}
                                    style={{ padding: '13px 0', justifyContent: 'center', fontSize: 15 }}>
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="fade-in-up" style={{ textAlign: 'center', marginTop: 36, fontSize: 14, color: C.muted }}>
                        14 gün pulsuz sınaq • Kart tələb olunmur • İstənilən vaxt ləğv edin
                    </div>
                </div>
            </section>

            {/* ─────────────── TESTIMONIALS ─────────────── */}
            <section id="about" style={{ padding: '100px 24px', background: C.dark }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fade-in-up" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
                            Sahibkarlar nə deyir?
                        </h2>
                    </div>

                    <div className="testimonials-grid" style={{ display: 'flex', gap: 24 }}>
                        {[
                            {
                                stars: 5,
                                text: 'İcarə Pro-dan əvvəl ödənişləri Excel-də izləyirdim. İndi hər şey avtomatikdir, ayda 10 saat vaxt qənaət edirəm.',
                                name: 'Elçin M.',
                                role: '15 mənzil sahibi, Bakı',
                            },
                            {
                                stars: 5,
                                text: 'Vergi hesablamalar əla işləyir. Mühasibə xərclərim yarıya düşdü.',
                                name: 'Leyla H.',
                                role: 'Kommersiya əmlak sahibi',
                            },
                            {
                                stars: 5,
                                text: 'Kirayəçilərim gecikmə etdikdə avtomatik bildiriş alıram. Borc problemi həll olundu.',
                                name: 'Rauf Q.',
                                role: '8 obyekt sahibi',
                            },
                        ].map((t, i) => (
                            <div key={i} className="glass-card fade-in-up" style={{
                                flex: 1,
                                padding: '32px 28px',
                                borderLeft: `3px solid ${C.gold}`,
                                transitionDelay: `${i * 0.12}s`,
                            }}>
                                <div style={{ marginBottom: 16 }}>
                                    {'⭐'.repeat(t.stars)}
                                </div>
                                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>
                                    "{t.text}"
                                </p>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: C.gold }}>— {t.name}</div>
                                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────── CTA ─────────────── */}
            <section style={{
                padding: '100px 24px',
                background: C.surface,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse 60% 80% at 50% 50%, rgba(201,168,76,0.10) 0%, transparent 65%)`,
                }} />
                <div className="fade-in-up" style={{
                    position: 'relative', zIndex: 1,
                    maxWidth: 700, margin: '0 auto', textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, marginBottom: 20 }}>
                        Əmlakınızı professional idarə etməyə hazırsınız?
                    </h2>
                    <p style={{ fontSize: 17, color: C.muted, marginBottom: 40, lineHeight: 1.7 }}>
                        14 gün pulsuz, heç bir öhdəlik olmadan başlayın
                    </p>
                    <Link to="/register" className="btn-gold" style={{ padding: '16px 40px', fontSize: 18 }}>
                        Pulsuz Başla <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* ─────────────── FOOTER ─────────────── */}
            <footer style={{
                background: C.dark,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '60px 24px 32px',
            }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="footer-cols" style={{ display: 'flex', gap: 60, marginBottom: 48 }}>
                        {/* Brand */}
                        <div style={{ flex: 2 }}>
                            <div style={{
                                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22,
                                marginBottom: 14, letterSpacing: '-0.5px',
                            }}>
                                <span style={{ color: C.gold }}>İ</span>
                                <span style={{ color: C.text }}>carə Pro</span>
                            </div>
                            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, maxWidth: 240 }}>
                                Azərbaycanın əmlak idarəetmə platforması
                            </p>
                        </div>
                        {/* Links */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Platform</div>
                            {['Xüsusiyyətlər', 'Qiymətlər', 'Bloq', 'Əlaqə'].map((l, i) => (
                                <a key={i} href="#" style={{
                                    display: 'block', fontSize: 14, color: C.muted,
                                    textDecoration: 'none', marginBottom: 10,
                                    transition: 'color 0.2s',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                                >{l}</a>
                            ))}
                        </div>
                        {/* Contact */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Əlaqə</div>
                            <a href="mailto:support@icarepro.az" style={{ display: 'block', fontSize: 14, color: C.muted, textDecoration: 'none', marginBottom: 10 }}>
                                support@icarepro.az
                            </a>
                            <span style={{ fontSize: 14, color: C.muted }}>+994 xx xxx xx xx</span>
                        </div>
                    </div>

                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        paddingTop: 24,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: 12,
                    }}>
                        <span style={{ fontSize: 13, color: C.muted }}>
                            © 2026 İcarə Pro. Bütün hüquqlar qorunur.
                        </span>
                        <div style={{ display: 'flex', gap: 24 }}>
                            {['Məxfilik siyasəti', 'İstifadə şərtləri'].map((l, i) => (
                                <a key={i} href="#" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>{l}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
