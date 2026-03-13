import * as React from 'react';

const C = {
    navy: '#1A1A2E',
    orange: '#E8620A',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    muted: '#6B7280',
    border: 'rgba(0,0,0,0.08)',
};

interface Props {
    total: number;
}

export function HeroSection({ total }: Props) {
    return (
        <section className="w-full pt-12 pb-6 px-5" style={{ background: C.bg }}>
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-4">
                {/* Badge pill */}
                <span
                    className="text-[13px] font-medium px-4 py-1.5 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.15)', color: C.gold, border: `1px solid rgba(201,168,76,0.3)` }}
                >
                    • 340+ sahibin etibarlı platformu
                </span>

                {/* Headline */}
                <div className="space-y-1">
                    <h1 className="text-5xl font-extrabold leading-tight tracking-tight" style={{ color: C.navy }}>
                        Boşalmadan əvvəl
                    </h1>
                    <h2 className="text-5xl font-extrabold italic leading-tight tracking-tight" style={{ color: C.orange }}>
                        növbəni tut.
                    </h2>
                </div>

                <p className="text-base max-w-lg leading-relaxed" style={{ color: C.muted }}>
                    İstədiyiniz mülk boşalmadan əvvəl növbəyə yazılın. Real vaxt rejimında tələbatı izləyin.
                </p>

                {/* Stats row */}
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                    {[
                        { value: `${total > 0 ? total : '0'}+`, label: 'Aktiv elan' },
                        { value: '340+', label: 'Qeydiyyatlı sahib' },
                        { value: '1 200+', label: 'Aktiv növbəçi' },
                        { value: '98%', label: 'Məmnuniyyət' },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col items-center gap-0.5 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${C.border}` }}>
                            <span className="text-xl font-bold" style={{ color: C.navy }}>{s.value}</span>
                            <span className="text-[12px]" style={{ color: C.muted }}>{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
