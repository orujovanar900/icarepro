import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2, FileText, CreditCard, Users, BarChart3, Bell,
    Menu, X, ChevronDown, CheckCircle2, XCircle, ArrowRight,
    TrendingUp, Home, Briefcase, ArrowUp, Instagram, Linkedin,
    MapPin, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';

const C = {
    gold: '#C9A84C', goldA: 'rgba(201,168,76,0.14)', goldA3: 'rgba(201,168,76,0.28)',
    dark: '#141820', surf: '#1C2130', surf2: '#222840',
    text: '#F0F2F5', muted: '#9AAABB', green: '#34d399', purple: '#a78bfa',
    orange: '#fb923c', red: 'rgba(239,68,68,0.12)', redB: 'rgba(239,68,68,0.22)',
    w06: 'rgba(255,255,255,0.06)', w10: 'rgba(255,255,255,0.10)',
    f: "'Plus Jakarta Sans',sans-serif",
};
const G = `
*{box-sizing:border-box;margin:0;padding:0;}html{scroll-behavior:smooth;}
body{background:${C.dark};color:${C.text};font-family:${C.f};overflow-x:hidden;}
a{text-decoration:none;}
@keyframes floatA{0%,100%{transform:translateY(0);}50%{transform:translateY(-12px);}}
@keyframes floatB{0%,100%{transform:translateY(-5px);}50%{transform:translateY(9px);}}
@keyframes floatC{0%,100%{transform:translateY(4px);}50%{transform:translateY(-10px);}}
@keyframes fsu{from{opacity:0;transform:translateY(28px);}to{opacity:1;transform:translateY(0);}}
@keyframes gs{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
@keyframes pg{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,.4);}50%{box-shadow:0 0 0 14px rgba(201,168,76,0);}}
.fiu{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;}
.fiu.vis{opacity:1;transform:translateY(0);}
.gc{background:rgba(28,33,48,.75);border:1px solid rgba(201,168,76,0.13);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:20px;}
.btn-gold{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C);background-size:200% 200%;color:#0A0B0F;font-family:${C.f};font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:transform .2s,box-shadow .2s,background-position .4s;text-decoration:none;}
.btn-gold:hover{transform:scale(1.04);box-shadow:0 0 28px rgba(201,168,76,.55);background-position:right center;}
.btn-gold:hover .arr{transform:translateX(4px);}
.arr{display:inline-flex;transition:transform .25s;}
.btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${C.text};font-family:${C.f};font-weight:500;border:1px solid rgba(255,255,255,.18);border-radius:12px;cursor:pointer;transition:transform .2s,border-color .2s,background .2s;text-decoration:none;}
.btn-ghost:hover{transform:scale(1.03);border-color:${C.gold};background:rgba(201,168,76,.08);}
.fc{transition:transform .3s,border-color .3s,box-shadow .3s;}
.fc:hover{border-color:rgba(201,168,76,.4)!important;transform:translateY(-5px);box-shadow:0 18px 50px rgba(0,0,0,.45);}
.pc{transition:transform .3s,box-shadow .3s;}
.pc:hover{transform:scale(1.025);box-shadow:0 20px 60px rgba(0,0,0,.5);}
.ptg{display:inline-flex;background:${C.surf2};border-radius:50px;padding:4px;gap:4px;}
.ptg button{border:none;border-radius:50px;padding:8px 24px;font-family:${C.f};font-weight:500;font-size:14px;cursor:pointer;transition:background .25s,color .25s;}
.mbg{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:24px;animation:fsu .25s ease both;}
.stt{position:fixed;bottom:90px;right:24px;z-index:900;width:44px;height:44px;border-radius:50%;background:${C.gold};color:#0A0B0F;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(201,168,76,.4);transition:transform .2s,box-shadow .2s;}
.stt:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(201,168,76,.6);}
.prop-wrap{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none;padding-bottom:4px;}
.prop-wrap::-webkit-scrollbar{display:none;}
@media(max-width:768px){
  .hg{flex-direction:column!important;}
  .fg{grid-template-columns:1fr!important;}
  .pricg{flex-direction:column!important;align-items:center!important;}
  .pricc{width:100%!important;max-width:360px;}
  .ftc{flex-direction:column!important;gap:32px!important;}
  .sr{flex-direction:column!important;}
  .sc{display:none!important;}
  .tg{flex-direction:column!important;}
  .sf{flex-wrap:wrap!important;gap:24px!important;}
  .nl{display:none!important;}
  .nh{display:flex!important;}
  .nr{gap:8px!important;}
  .pg2{grid-template-columns:1fr!important;}
}
`;

function useCountUp(target: number, dur = 1800, go = false) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!go) return;
        let t0: number | null = null;
        const s = (ts: number) => { if (!t0) t0 = ts; const p = Math.min((ts - t0) / dur, 1); setN(Math.floor((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(s); };
        requestAnimationFrame(s);
    }, [go, target, dur]);
    return n;
}
function useInView(thr = 0.25) {
    const ref = useRef<HTMLDivElement>(null);
    const [v, setV] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(es => { const e = es[0]; if (e && e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: thr });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [thr]);
    return { ref, v };
}
function useReveal() {
    useEffect(() => {
        const els = document.querySelectorAll('.fiu');
        const obs = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); obs.unobserve(e.target); } }); }, { threshold: .1 });
        els.forEach(el => obs.observe(el));
        return () => obs.disconnect();
    }, []);
}

function Toast({ msg, done }: { msg: string; done: () => void }) {
    useEffect(() => { const t = setTimeout(done, 3200); return () => clearTimeout(t); }, [done]);
    return (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 3000, background: C.gold, color: '#0A0B0F', fontFamily: C.f, fontWeight: 700, fontSize: 14, padding: '11px 24px', borderRadius: 50, boxShadow: '0 8px 32px rgba(201,168,76,.5)', whiteSpace: 'nowrap', animation: 'fsu .3s ease both' }}>
            {msg}
        </div>
    );
}

function DemoModal({ close }: { close: () => void }) {
    return (
        <div className="mbg" onClick={close}>
            <div onClick={e => e.stopPropagation()} style={{ background: C.surf, borderRadius: 24, border: `1px solid ${C.goldA3}`, padding: '40px 36px', maxWidth: 460, width: '100%', position: 'relative' }}>
                <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={20} /></button>
                <div style={{ fontSize: 36, marginBottom: 16 }}>🎬</div>
                <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Demo yaxında hazır olacaq</h2>
                <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 28 }}>Platformamızı canlı sınamaq üçün 14 günlük pulsuz sınaqdan istifadə edin</p>
                <Link to="/register" className="btn-gold" style={{ padding: '13px 28px', fontSize: 15 }} onClick={close}>
                    Pulsuz Başla <span className="arr"><ArrowRight size={16} /></span>
                </Link>
            </div>
        </div>
    );
}

const SLIDES = [
    'https://bm.ge/uploads/files/2024/10/26/262375/sea_w_h.jpeg',
    'https://www.scottbrownrigg.com/media/f3ad00xf/img_2006.jpg?width=1920&height=1080&format=webp&quality=90&v=1db982bb80bfa50',
    'https://www.azernews.az/media/2025/07/17/sea-breeze_3.png',
];

const PROPS = [
    { img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80', label: 'Mənzil • Bakı, Nərimanov', price: 'AZN 800/ay', badge: 'Aktiv', bc: C.green },
    { img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', label: 'Ofis • Bakı, Nəftçilər pr.', price: 'AZN 2,500/ay', badge: 'Aktiv', bc: C.green },
    { img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80', label: 'Mağaza • Bakı, Nizami', price: 'AZN 1,200/ay', badge: 'Boş', bc: C.orange },
    { img: 'https://www.pashamalls.az/resized/resize1900/center/pages/12/pbm-1.jpg', label: 'Ticarət Mərkəzi • Port Baku Mall', price: 'AZN 8,500/ay', badge: 'Aktiv', bc: C.green },
];

export function Landing() {
    const [sc, setSc] = useState(false);
    const [mo, setMo] = useState(false);
    const [pa, setPa] = useState(false);
    const [sl, setSl] = useState(0);
    const [hover, setHover] = useState(false);
    const [stt, setStt] = useState(false);
    const [dm, setDm] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const propRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((m: string) => setToast(m), []);

    useEffect(() => {
        const fn = () => { setSc(window.scrollY > 60); setStt(window.scrollY > 400); };
        window.addEventListener('scroll', fn, { passive: true });
        return () => window.removeEventListener('scroll', fn);
    }, []);

    useEffect(() => {
        if (hover) return;
        const id = setInterval(() => setSl(s => (s + 1) % SLIDES.length), 5000);
        return () => clearInterval(id);
    }, [hover]);

    useReveal();
    const { ref: sRef, v: sIn } = useInView(0.3);
    const c1 = useCountUp(50, 1600, sIn), c2 = useCountUp(200, 1800, sIn), c3 = useCountUp(1200, 2000, sIn), c4 = useCountUp(2, 1500, sIn);
    const prc = (b: number) => pa ? Math.round(b * .8) : b;

    const scrollProps = (dir: number) => {
        const el = propRef.current;
        if (el) el.scrollBy({ left: dir * 300, behavior: 'smooth' });
    };

    return (
        <>
            <style>{G}</style>
            {dm && <DemoModal close={() => setDm(false)} />}
            {toast && <Toast msg={toast} done={() => setToast(null)} />}
            {stt && <button className="stt" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={20} /></button>}

            {/* NAVBAR */}
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background .35s', background: sc ? 'rgba(14,17,26,.9)' : 'transparent', backdropFilter: sc ? 'blur(22px)' : 'none', borderBottom: sc ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                <Link to="/"><span style={{ fontFamily: C.f, fontWeight: 800, fontSize: 22, letterSpacing: '-.5px' }}><span style={{ color: C.gold }}>İ</span><span style={{ color: C.text }}>carə Pro</span></span></Link>
                <div className="nl" style={{ display: 'flex', gap: 36 }}>
                    {[['Xüsusiyyətlər', '#features'], ['Qiymətlər', '#pricing'], ['Haqqımızda', '#about']].map(([l, h]) => (
                        <a key={h} href={h} style={{ fontFamily: C.f, fontWeight: 500, fontSize: 15, color: C.muted, transition: 'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.muted}>{l}</a>
                    ))}
                </div>
                <div className="nr" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link to="/login" className="btn-ghost" style={{ padding: '9px 20px', fontSize: 14 }}>Daxil ol</Link>
                    <Link to="/register" className="btn-gold" style={{ padding: '9px 20px', fontSize: 14 }}>Başla</Link>
                    <button className="nh" onClick={() => setMo(o => !o)} style={{ display: 'none', background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 4 }}>{mo ? <X size={24} /> : <Menu size={24} />}</button>
                </div>
            </nav>
            {mo && (
                <div style={{ position: 'fixed', top: 68, left: 0, right: 0, zIndex: 999, background: 'rgba(14,17,26,.97)', backdropFilter: 'blur(22px)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    {[['Xüsusiyyətlər', '#features'], ['Qiymətlər', '#pricing'], ['Haqqımızda', '#about']].map(([l, h]) => (
                        <a key={h} href={h} onClick={() => setMo(false)} style={{ color: C.text, fontSize: 17, fontWeight: 500 }}>{l}</a>
                    ))}
                    <Link to="/login" className="btn-ghost" style={{ padding: '12px 20px', textAlign: 'center' }} onClick={() => setMo(false)}>Daxil ol</Link>
                    <Link to="/register" className="btn-gold" style={{ padding: '12px 20px', justifyContent: 'center' }} onClick={() => setMo(false)}>Başla</Link>
                </div>
            )}

            {/* HERO */}
            <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 32px 90px', overflow: 'hidden' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                {SLIDES.map((src, i) => (
                    <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: sl === i ? 1 : 0, transition: 'opacity 1.2s ease-in-out', zIndex: 0 }} />
                ))}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,.82)', zIndex: 1 }} />
                <div style={{ position: 'absolute', inset: 0, zIndex: 2, backgroundImage: `linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)`, backgroundSize: '64px 64px' }} />
                <div style={{ position: 'absolute', top: -100, right: -100, zIndex: 2, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,168,76,.10) 0%,transparent 65%)', pointerEvents: 'none' }} />
                {/* Slide dots */}
                <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 8 }}>
                    {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => setSl(i)} style={{ width: sl === i ? 24 : 8, height: 8, borderRadius: 4, background: sl === i ? C.gold : 'rgba(255,255,255,.3)', border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />
                    ))}
                </div>
                <div style={{ position: 'relative', zIndex: 3, maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 56 }} className="hg">
                    <div style={{ flex: '0 0 58%' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.goldA, border: `1px solid ${C.goldA3}`, borderRadius: 50, padding: '6px 18px', marginBottom: 30, fontSize: 13, fontWeight: 600, color: C.gold, animation: 'fsu .6s ease both' }}>
                            🇦🇿 Azərbaycan üçün hazırlanmış
                        </div>
                        <h1 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(3rem,6vw,5rem)', lineHeight: 1.08, letterSpacing: '-1.5px', marginBottom: 24, animation: 'fsu .6s .1s ease both' }}>
                            Əmlakınızı{' '}
                            <span style={{ background: `linear-gradient(135deg,${C.gold},#e8c56b,${C.gold})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gs 4s ease infinite', display: 'inline-block' }}>professional</span>{' '}
                            səviyyədə idarə edin
                        </h1>
                        <p style={{ fontSize: '1.1rem', lineHeight: 1.75, color: C.muted, maxWidth: 520, marginBottom: 36, animation: 'fsu .6s .2s ease both' }}>
                            Müqavilələr, ödənişlər, kirayəçilər — hamısı bir yerdə. Vaxtınızı qənaət edin, gəlirinizi artırın.
                        </p>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 36, animation: 'fsu .6s .3s ease both' }}>
                            <Link to="/register" className="btn-gold" style={{ padding: '15px 32px', fontSize: 16 }}>Pulsuz başla <span className="arr"><ArrowRight size={18} /></span></Link>
                            <button className="btn-ghost" style={{ padding: '15px 30px', fontSize: 16 }} onClick={() => setDm(true)}>Demo izlə</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', animation: 'fsu .6s .4s ease both' }}>
                            {['✓ 14 gün pulsuz', '✓ Kart tələb olunmur', '✓ AZ dəstəyi'].map((b, i) => (
                                <React.Fragment key={i}>
                                    <span style={{ fontSize: 13, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: C.green }}>{b[0]}</span>{b.slice(1)}</span>
                                    {i < 2 && <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 12 }}>•</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1, position: 'relative', minHeight: 380 }}>
                        <div style={{ position: 'absolute', inset: -24, borderRadius: 32, background: 'radial-gradient(ellipse at center,rgba(201,168,76,.13) 0%,transparent 70%)', pointerEvents: 'none' }} />
                        <div className="gc" style={{ padding: '24px', position: 'relative', animation: 'fsu .7s .2s ease both' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                                <div style={{ flex: 1, height: 8, background: C.w10, borderRadius: 4, marginLeft: 8 }} />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 500 }}>Aylıq gəlir (AZN)</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                                    {[55, 70, 45, 85, 60, 90, 75, 95, 65, 80, 70, 88].map((h, i) => (
                                        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', background: i === 11 ? `linear-gradient(to top,${C.gold},#e8c56b)` : 'rgba(201,168,76,.18)' }} />
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[{ l: 'Obyektlər', v: '24', ic: '🏢' }, { l: 'Kirayəçilər', v: '21', ic: '👥' }, { l: 'Aktiv müq.', v: '18', ic: '📋' }].map((s, i) => (
                                    <div key={i} style={{ flex: 1, background: C.w10, borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 18, marginBottom: 2 }}>{s.ic}</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{s.v}</div>
                                        <div style={{ fontSize: 10, color: C.muted }}>{s.l}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {[
                            { s: { top: -28, right: -24 }, a: 'floatA 3.5s ease-in-out infinite', bc: C.green, lb: 'Bu ay gəlir', vl: 'AZN 12,450' },
                            { s: { bottom: 40, right: -32 }, a: 'floatB 4s ease-in-out infinite', bc: C.purple, lb: 'Doluluq dərəcəsi', vl: '94%' },
                            { s: { bottom: -20, left: -20 }, a: 'floatC 3s ease-in-out infinite', bc: C.orange, lb: 'Müqavilə yenilənir', vl: '3 müqavilə' },
                        ].map((fc, i) => (
                            <div key={i} style={{ position: 'absolute', ...fc.s, animation: fc.a }}>
                                <div className="gc" style={{ padding: '12px 18px', borderLeft: `3px solid ${fc.bc}`, whiteSpace: 'nowrap' }}>
                                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{fc.lb}</div>
                                    <div style={{ fontSize: 17, fontWeight: 700, color: fc.bc }}>{fc.vl}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* STATS */}
            <div ref={sRef} style={{ background: C.surf, borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '40px 32px' }}>
                <div className="sf" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    {[{ v: `${c1}+`, u: 'sahibkar' }, { v: `${c2}+`, u: 'obyekt' }, { v: `${c3 >= 1000 ? (c3 / 1000).toFixed(1) + 'K' : c3}+`, u: 'müqavilə' }, { v: `AZN ${c4}M+`, u: 'idarə olunan' }].map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 38, fontWeight: 800, color: C.gold, lineHeight: 1, marginBottom: 4 }}>{s.v}</div>
                            <div style={{ fontSize: 14, color: C.muted }}>{s.u}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PROBLEMS */}
            <section style={{ padding: '110px 32px', background: C.dark }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 60 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Tanış problemlər?</h2>
                        <p style={{ fontSize: 17, color: C.muted }}>Əmlak sahiblərinin hər gün üzləşdiyi çətinliklər</p>
                    </div>
                    <div className="pg2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, marginBottom: 56 }}>
                        {[{ icon: '❌', title: 'Ödənişləri Excel-də izləmək', desc: 'Hər ay eyni məlumatları əl ilə daxil etmək, hesablaşmaları səhv etmək' },
                        { icon: '❌', title: 'Müqavilələr harada olduğunu bilməmək', desc: 'Kağız müqavilələr, skan edilmiş fayllar — hər şey dağınıq' },
                        { icon: '❌', title: 'Borclu kirayəçiləri izləmək', desc: 'Kim nə qədər borcludur? Nə vaxt ödəməlidir? Heç vaxt aydın deyil' },
                        ].map((p, i) => (
                            <div key={i} className="gc fiu" style={{ padding: '30px 28px', background: C.red, borderColor: C.redB, transitionDelay: `${i * .1}s` }}>
                                <div style={{ fontSize: 32, marginBottom: 16 }}>{p.icon}</div>
                                <h3 style={{ fontFamily: C.f, fontWeight: 700, fontSize: 17, marginBottom: 10, color: '#fca5a5' }}>{p.title}</h3>
                                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{p.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="fiu" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 1, height: 48, background: `linear-gradient(to bottom,${C.w06},${C.gold})` }} />
                            <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>İcarə Pro ilə həll</div>
                            <ChevronDown size={20} color={C.gold} />
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" style={{ padding: '110px 32px', background: C.surf }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Hər şey bir platformada</h2>
                        <p style={{ fontSize: 17, color: C.muted }}>Əmlak idarəetməsinin bütün aspektlərini əhatə edirik</p>
                    </div>
                    <div className="fg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
                        {[
                            { Icon: Building2, color: C.gold, title: 'Obyekt İdarəetməsi', desc: 'Mənzil, ofis, mağaza — bütün növ əmlakları idarə edin' },
                            { Icon: FileText, color: C.purple, title: 'Ağıllı Müqavilələr', desc: 'Müqavilə yaradın, imzalayın, avtomatik yeniləmə xatırlatmaları alın' },
                            { Icon: CreditCard, color: C.green, title: 'Ödəniş İzləmə', desc: 'Hər ödənişi qeyd edin, borclular üçün avtomatik bildirişlər' },
                            { Icon: Users, color: '#60a5fa', title: 'Kirayəçi Bazası', desc: 'FİN, pasport, şirkət məlumatları — hamısı bir yerdə' },
                            { Icon: BarChart3, color: C.orange, title: 'Vergi Hesabatları', desc: 'Azərbaycan vergi qanunvericiliyinə uyğun 10%/14%/20% hesablamalar' },
                            { Icon: Bell, color: '#f472b6', title: 'Bildirişlər', desc: 'Müqavilə bitmədən 30 gün əvvəl xəbərdarlıq, ödəniş gecikməsi bildirişi' },
                        ].map(({ Icon, color, title, desc }, i) => (
                            <div key={i} className="gc fc fiu" style={{ padding: '32px 28px', transitionDelay: `${(i % 3) * .12}s` }}>
                                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Icon size={24} color={color} /></div>
                                <h3 style={{ fontFamily: C.f, fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{title}</h3>
                                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROPERTY SHOWCASE */}
            <section style={{ padding: '110px 32px', background: C.dark }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 56 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Hər növ əmlak üçün</h2>
                        <p style={{ fontSize: 17, color: C.muted }}>Mənzildən ticarət mərkəzinə — hər əmlak bir yerdə</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => scrollProps(-1)} style={{ position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: C.surf, border: `1px solid ${C.goldA3}`, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} /></button>
                        <div ref={propRef} className="prop-wrap">
                            {PROPS.map((p, i) => (
                                <div key={i} className="pc fiu" style={{ flex: '0 0 calc(33.33% - 14px)', minWidth: 260, borderRadius: 20, overflow: 'hidden', position: 'relative', aspectRatio: '4/3', scrollSnapAlign: 'start', transitionDelay: `${i * .1}s` }}>
                                    <img src={p.img} alt={p.label} loading="lazy" onError={e => (e.currentTarget.style.background = '#1A1D26')} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top,rgba(10,11,15,.92) 0%,transparent 100%)', padding: '48px 20px 20px' }}>
                                        <div style={{ display: 'inline-block', marginBottom: 8, background: `${p.bc}22`, border: `1px solid ${p.bc}55`, borderRadius: 50, padding: '3px 12px', fontSize: 11, fontWeight: 700, color: p.bc }}>{p.badge}</div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{p.label}</div>
                                        <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{p.price}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => scrollProps(1)} style={{ position: 'absolute', right: -20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 40, height: 40, borderRadius: '50%', background: C.surf, border: `1px solid ${C.goldA3}`, color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={20} /></button>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section style={{ padding: '110px 32px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('https://www.scottbrownrigg.com/media/bxrfkczr/20504_n106.jpg?width=1920&height=1080&format=webp&quality=90&v=1db981d2753abb0')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', zIndex: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,20,.93)', zIndex: 1 }} />
                <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 72 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Necə işləyir?</h2>
                    </div>
                    <div className="sr" style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                        {[
                            { n: '①', t: 'Qeydiyyat', s: '2 dəqiqə', d: 'E-poçtunuzla hesab açın, şirkət məlumatlarınızı daxil edin', I: Home },
                            { n: '②', t: 'Obyekt əlavə edin', s: '', d: 'Əmlakınızı, kirayəçilərinizi və müqavilələrinizi daxil edin', I: Briefcase },
                            { n: '③', t: 'İdarə edin', s: '', d: 'Dashboard-dan hər şeyi izləyin, hesabatlar alın', I: TrendingUp },
                        ].map(({ n, t, s, d }, i) => (
                            <React.Fragment key={i}>
                                <div className="fiu" style={{ flex: 1, textAlign: 'center', transitionDelay: `${i * .15}s` }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.goldA, border: `2px solid ${C.goldA3}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, animation: `pg 3s ease infinite`, animationDelay: `${i * .7}s` }}>{n}</div>
                                    <h3 style={{ fontFamily: C.f, fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{t}</h3>
                                    {s && <div style={{ fontSize: 12, color: C.gold, marginBottom: 8 }}>({s})</div>}
                                    <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, maxWidth: 210, margin: '10px auto 0' }}>{d}</p>
                                </div>
                                {i < 2 && <div className="sc" style={{ flex: '0 0 60px', height: 2, background: `linear-gradient(to right,${C.gold},rgba(201,168,76,.2))`, marginTop: 36, alignSelf: 'flex-start' }} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" style={{ padding: '110px 32px', background: C.dark }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Şəffaf qiymətlər</h2>
                        <div className="ptg" style={{ marginTop: 24 }}>
                            <button onClick={() => setPa(false)} style={{ background: !pa ? C.gold : 'transparent', color: !pa ? '#0A0B0F' : C.muted, fontWeight: !pa ? 700 : 400 }}>Aylıq</button>
                            <button onClick={() => setPa(true)} style={{ background: pa ? C.gold : 'transparent', color: pa ? '#0A0B0F' : C.muted, fontWeight: pa ? 700 : 400 }}>
                                İllik <span style={{ marginLeft: 6, fontSize: 10, background: C.green, color: '#0A0B0F', borderRadius: 50, padding: '1px 7px', fontWeight: 700 }}>-20%</span>
                            </button>
                        </div>
                    </div>
                    <div className="pricg" style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'stretch' }}>
                        {[
                            { name: 'BAŞLANĞIC', p: prc(29), popular: false, gold: false, cta: 'Başla', link: '/register', feats: [{ ok: true, t: '10 obyektə qədər' }, { ok: true, t: 'Müqavilə idarəetməsi' }, { ok: true, t: 'Ödəniş izləmə' }, { ok: true, t: 'Email bildirişlər' }, { ok: false, t: 'Vergi hesabatları' }, { ok: false, t: 'API girişi' }] },
                            { name: 'BİZNES', p: prc(69), popular: true, gold: true, cta: 'Başla', link: '/register', feats: [{ ok: true, t: '50 obyektə qədər' }, { ok: true, t: 'Hər şey Başlanğıcda +' }, { ok: true, t: 'Vergi hesabatları' }, { ok: true, t: 'Kirayəçi bazası' }, { ok: true, t: 'Prioritet dəstək' }, { ok: false, t: 'API girişi' }] },
                            { name: 'KORPORATİV', p: prc(149), popular: false, gold: false, cta: 'Əlaqə', link: '/register', feats: [{ ok: true, t: 'Limitsiz obyekt' }, { ok: true, t: 'Hər şey Biznes-də +' }, { ok: true, t: 'API girişi' }, { ok: true, t: 'Xüsusi inteqrasiyalar' }, { ok: true, t: 'Şəxsi menecer' }] },
                        ].map((plan, i) => (
                            <div key={i} className="pricc gc fiu" style={{ width: 320, padding: '36px 30px', position: 'relative', border: plan.popular ? `1.5px solid ${C.gold}` : `1px solid rgba(201,168,76,.13)`, transform: plan.popular ? 'scale(1.04)' : 'scale(1)', boxShadow: plan.popular ? `0 0 48px rgba(201,168,76,.18)` : 'none', display: 'flex', flexDirection: 'column', transitionDelay: `${i * .12}s` }}>
                                {plan.popular && <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.gold, color: '#0A0B0F', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 50, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>🔥 Ən populyar</div>}
                                <div style={{ fontSize: 12, color: C.muted, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>{plan.name}</div>
                                <div style={{ marginBottom: 28 }}><span style={{ fontSize: 44, fontWeight: 800, color: plan.popular ? C.gold : C.text }}>{plan.p}</span><span style={{ fontSize: 16, color: C.muted }}> AZN/ay</span></div>
                                <ul style={{ listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                    {plan.feats.map((f, j) => (
                                        <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: f.ok ? C.text : C.muted }}>
                                            {f.ok ? <CheckCircle2 size={16} color={C.green} /> : <XCircle size={16} color="rgba(255,255,255,.18)" />}{f.t}
                                        </li>
                                    ))}
                                </ul>
                                <Link to={plan.link} className={plan.gold ? 'btn-gold' : 'btn-ghost'} style={{ padding: '13px 0', justifyContent: 'center', fontSize: 15 }}>{plan.cta}</Link>
                            </div>
                        ))}
                    </div>
                    <div className="fiu" style={{ textAlign: 'center', marginTop: 36, fontSize: 14, color: C.muted }}>
                        14 gün pulsuz sınaq • Kart tələb olunmur • İstənilən vaxt ləğv edin
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section id="about" style={{ padding: '110px 32px', background: C.surf }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="fiu" style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,46px)', marginBottom: 14 }}>Sahibkarlar nə deyir?</h2>
                    </div>
                    <div className="tg" style={{ display: 'flex', gap: 24 }}>
                        {[
                            { stars: 5, text: 'İcarə Pro-dan əvvəl ödənişləri Excel-də izləyirdim. İndi hər şey avtomatikdir, ayda 10 saat vaxt qənaət edirəm.', name: 'Elçin M.', role: '15 mənzil sahibi, Bakı' },
                            { stars: 5, text: 'Vergi hesablamalar əla işləyir. Mühasibə xərclərim yarıya düşdü.', name: 'Leyla H.', role: 'Kommersiya əmlak sahibi' },
                            { stars: 5, text: 'Kirayəçilərim gecikmə etdikdə avtomatik bildiriş alıram. Borc problemi həll olundu.', name: 'Rauf Q.', role: '8 obyekt sahibi' },
                        ].map((t, i) => (
                            <div key={i} className="gc fiu" style={{ flex: 1, padding: '32px 28px', borderLeft: `3px solid ${C.gold}`, transitionDelay: `${i * .12}s` }}>
                                <div style={{ marginBottom: 16, fontSize: 18 }}>{'⭐'.repeat(t.stars)}</div>
                                <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>"{t.text}"</p>
                                <div style={{ fontWeight: 700, fontSize: 14, color: C.gold }}>— {t.name}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t.role}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '110px 32px', background: C.dark, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 70% at 50% 50%,rgba(201,168,76,.11) 0%,transparent 65%)' }} />
                <div className="fiu" style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: C.f, fontWeight: 800, fontSize: 'clamp(28px,4vw,48px)', marginBottom: 20 }}>Əmlakınızı professional idarə etməyə hazırsınız?</h2>
                    <p style={{ fontSize: 17, color: C.muted, marginBottom: 40, lineHeight: 1.75 }}>14 gün pulsuz, heç bir öhdəlik olmadan başlayın</p>
                    <Link to="/register" className="btn-gold" style={{ padding: '17px 42px', fontSize: 18 }}>Pulsuz Başla <span className="arr"><ArrowRight size={20} /></span></Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ background: C.surf, borderTop: '1px solid rgba(255,255,255,.06)', padding: '64px 32px 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div className="ftc" style={{ display: 'flex', gap: 64, marginBottom: 52 }}>
                        <div style={{ flex: 2 }}>
                            <div style={{ fontFamily: C.f, fontWeight: 800, fontSize: 22, marginBottom: 14, letterSpacing: '-.5px' }}><span style={{ color: C.gold }}>İ</span><span style={{ color: C.text }}>carə Pro</span></div>
                            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, maxWidth: 230, marginBottom: 20 }}>Azərbaycanın əmlak idarəetmə platforması</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                <a href="mailto:support@icarepro.az" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted, transition: 'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.muted}><Mail size={14} color={C.gold} /> support@icarepro.az</a>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.muted }}><MapPin size={14} color={C.gold} /> Bakı, Azərbaycan</div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[{ Icon: Instagram, l: 'Instagram' }, { Icon: Linkedin, l: 'LinkedIn' }].map(({ Icon, l }) => (
                                    <button key={l} onClick={() => showToast('Tezliklə hazır olacaq 🚀')} title={l} style={{ width: 38, height: 38, borderRadius: '50%', background: C.w10, border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .2s,border-color .2s' }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.goldA; (e.currentTarget as HTMLButtonElement).style.borderColor = C.gold; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.w10; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.1)'; }}>
                                        <Icon size={16} color={C.muted} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.1em' }}>Platform</div>
                            {[{ l: 'Xüsusiyyətlər', h: '#features', t: null }, { l: 'Qiymətlər', h: '#pricing', t: null }, { l: 'Bloq', h: '#', t: 'Bloq tezliklə hazır olacaq 🚀' }, { l: 'Əlaqə', h: 'mailto:support@icarepro.az', t: null }].map(({ l, h, t }, i) => (
                                <a key={i} href={h} onClick={t ? (e) => { e.preventDefault(); showToast(t); } : undefined} style={{ display: 'block', fontSize: 14, color: C.muted, marginBottom: 12, transition: 'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.muted}>{l}</a>
                            ))}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 18, textTransform: 'uppercase', letterSpacing: '.1em' }}>Hüquqi</div>
                            {[{ l: 'Məxfilik siyasəti', m: 'Tezliklə hazır olacaq' }, { l: 'İstifadə şərtləri', m: 'Tezliklə hazır olacaq' }, { l: 'GDPR', m: 'Tezliklə hazır olacaq' }].map(({ l, m }, i) => (
                                <a key={i} href="#" onClick={e => { e.preventDefault(); showToast(m); }} style={{ display: 'block', fontSize: 14, color: C.muted, marginBottom: 12, transition: 'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = C.text} onMouseLeave={e => e.currentTarget.style.color = C.muted}>{l}</a>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ fontSize: 13, color: C.muted }}>© 2026 İcarə Pro. Bütün hüquqlar qorunur. | Bakı, Azərbaycan</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
                            <span style={{ fontSize: 13, color: C.muted }}>Sistem işləkdir</span>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
