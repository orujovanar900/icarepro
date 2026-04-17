import * as React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { PhoneReveal } from './PhoneReveal';

export interface RoommateAdCardData {
    id: string;
    displayName: string;
    age: number;
    gender: 'MALE' | 'FEMALE' | 'ANY' | string;
    districts: string[];
    budgetMin: number;
    budgetMax: number;
    startMonth: number;
    startYear: number;
    durationMonths: number | null;
    isLongTerm: boolean;
    occupation: string | null;
    smokes: boolean | null;
    hasPets: boolean | null;
    schedule: string | null;
    guests: string | null;
    description: string | null;
    photoUrl: string | null;
    createdAt: string;
}

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const AZ_MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const GENDER_LABELS: Record<string, string> = {
    MALE: 'Kişi',
    FEMALE: 'Qadın',
    ANY: 'Fərq etməz',
};

const OCCUPATION_LABELS: Record<string, string> = {
    STUDENT: '🎓 Tələbə',
    EMPLOYED: '💼 İşçi',
    ENTREPRENEUR: '🚀 Sahibkar',
    OTHER: 'Digər',
};

function formatPeriod(ad: RoommateAdCardData): string {
    const month = AZ_MONTHS[ad.startMonth - 1] ?? '';
    const head = `${month} ${ad.startYear}-dan`;
    if (ad.isLongTerm) return `${head}, 1 ildən çox`;
    if (ad.durationMonths) return `${head}, ${ad.durationMonths} ay`;
    return head;
}

export function RoommateCard({ ad }: { ad: RoommateAdCardData }) {
    const period = formatPeriod(ad);

    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column',
                background: C.white, borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${C.border}`,
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        >
            {/* Header with avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 16px 0' }}>
                {ad.photoUrl ? (
                    <img
                        src={ad.photoUrl}
                        alt={ad.displayName}
                        style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${C.bg}` }}
                    />
                ) : (
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #C9A84C, #E8620A)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#FFF', fontSize: 22, fontWeight: 800,
                    }}>{ad.displayName.charAt(0).toUpperCase()}</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
                        {ad.displayName}, {ad.age}
                    </h3>
                    <span style={{
                        display: 'inline-block', marginTop: 4,
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 10,
                        background: ad.gender === 'FEMALE' ? '#FCE7F3' : ad.gender === 'MALE' ? '#DBEAFE' : '#F3F4F6',
                        color: ad.gender === 'FEMALE' ? '#BE185D' : ad.gender === 'MALE' ? '#1D4ED8' : '#374151',
                    }}>{GENDER_LABELS[ad.gender] ?? ad.gender}</span>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {/* Districts */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ad.districts.slice(0, 4).map(d => (
                        <span key={d} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, padding: '3px 9px', borderRadius: 12,
                            background: C.bg, color: C.navy, fontWeight: 500,
                        }}>
                            <MapPin style={{ width: 10, height: 10 }} />
                            {d}
                        </span>
                    ))}
                    {ad.districts.length > 4 && (
                        <span style={{ fontSize: 11, color: C.muted, padding: '3px 4px' }}>+{ad.districts.length - 4}</span>
                    )}
                </div>

                {/* Budget */}
                <div>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Büdcə payı</p>
                    <p style={{ margin: '2px 0 0', fontSize: 17, fontWeight: 800, color: C.gold }}>{ad.budgetMin}–{ad.budgetMax} AZN/ay</p>
                </div>

                {/* Period */}
                <div>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Müddət</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: C.navy, fontWeight: 600 }}>{period}</p>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {ad.occupation && (
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: '#EEF2FF', color: '#3730A3', fontWeight: 500 }}>
                            {OCCUPATION_LABELS[ad.occupation] ?? ad.occupation}
                        </span>
                    )}
                    {ad.smokes === false && (
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: '#DCFCE7', color: '#166534', fontWeight: 500 }}>
                            🚭 Siqaret çəkmir
                        </span>
                    )}
                    {ad.smokes === true && (
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: '#FEF3C7', color: '#92400E', fontWeight: 500 }}>
                            🚬 Siqaret çəkir
                        </span>
                    )}
                    {ad.hasPets === true && (
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, background: '#FAE8FF', color: '#86198F', fontWeight: 500 }}>
                            🐾 Heyvan
                        </span>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                    <PhoneReveal adId={ad.id} compact />
                    <Link
                        to={`/yoldas/${ad.id}`}
                        style={{
                            marginLeft: 'auto',
                            fontSize: 13, fontWeight: 600, color: C.navy,
                            textDecoration: 'none',
                            padding: '6px 12px', borderRadius: 20,
                            border: `1px solid ${C.border}`,
                        }}
                    >Ətraflı bax →</Link>
                </div>
            </div>
        </div>
    );
}
