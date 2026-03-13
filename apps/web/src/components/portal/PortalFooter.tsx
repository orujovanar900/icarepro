import * as React from 'react';
import { Link } from 'react-router-dom';

export function PortalFooter() {
    return (
        <footer style={{ background: '#1A1A2E', color: '#ffffff' }}>
            <div className="max-w-7xl mx-auto px-5 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Left: logo + tagline */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center">
                        <span className="text-xl font-extrabold tracking-tight text-white">icarə</span>
                        <span className="text-xl font-extrabold tracking-tight" style={{ color: '#E8620A' }}>pro</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Boşalmadan əvvəl növbəni tut. Azərbaycanın etibarlı icarə platformu.
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2026 İcarəPro. Bütün hüquqlar qorunur.</p>
                </div>

                {/* Center: links */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Bağlantılar</p>
                    {[
                        { to: '/', label: 'Obyektlər' },
                        { to: '/haqqinda', label: 'Necə işləyir' },
                        { to: '/haqqinda', label: 'Haqqımızda' },
                        { to: '/register', label: 'Sahib kimi qeydiyyat' },
                    ].map(l => (
                        <Link key={l.label} to={l.to} className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            {l.label}
                        </Link>
                    ))}
                </div>

                {/* Right: contact + social */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Əlaqə</p>
                    <a href="mailto:info@icarepro.az" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        info@icarepro.az
                    </a>
                    <a href="tel:+994501234567" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        +994 50 123 45 67
                    </a>
                    <div className="flex items-center gap-3 mt-3">
                        {[
                            { href: '#', label: 'Instagram', icon: '📸' },
                            { href: '#', label: 'Telegram', icon: '✈️' },
                            { href: '#', label: 'LinkedIn', icon: '💼' },
                        ].map(s => (
                            <a
                                key={s.label}
                                href={s.href}
                                title={s.label}
                                className="w-9 h-9 rounded-full flex items-center justify-center text-lg hover:opacity-80 transition-opacity"
                                style={{ background: 'rgba(255,255,255,0.1)' }}
                            >
                                {s.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
