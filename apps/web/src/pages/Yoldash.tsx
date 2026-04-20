import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { LedTicker } from '@/components/portal/LedTicker';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { RoommateCard, type RoommateAdCardData } from '@/components/portal/RoommateCard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    orange: '#E8620A',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    border: 'rgba(0,0,0,0.08)',
    muted: '#6B7280',
};

const GOLD_GRAD = 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)';

const DISTRICTS = [
    'Binəqədi', 'Nəsimi', 'Sabunçu', 'Suraxanı', 'Xətai',
    'Nizami', 'Yasamal', 'Nərimanov', 'Nişanqah', 'Pirəkəşkül',
    'Abşeron', 'Qaradağ', 'Sabail', 'Xəzər',
];

export function Yoldash() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();

    const [district, setDistrict] = React.useState('');
    const [gender, setGender] = React.useState('');
    const [budgetMax, setBudgetMax] = React.useState('');
    const [appliedFilters, setAppliedFilters] = React.useState({ district: '', gender: '', budgetMax: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['yoldash-list', appliedFilters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (appliedFilters.district) params.set('district', appliedFilters.district);
            if (appliedFilters.gender) params.set('gender', appliedFilters.gender);
            if (appliedFilters.budgetMax) params.set('budgetMax', appliedFilters.budgetMax);
            const res = await api.get(`/yoldash?${params.toString()}`);
            return res.data;
        },
    });

    const ads: RoommateAdCardData[] = data?.data ?? [];
    const total: number = data?.meta?.total ?? 0;

    const handleSearch = () => setAppliedFilters({ district, gender, budgetMax });

    const handleCreateAd = () => {
        if (!isAuthenticated) {
            sessionStorage.setItem('portalIntent', '/yoldas/yeni');
            navigate('/login');
            return;
        }
        navigate('/yoldas/yeni');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50, flexShrink: 0 }}>
                <PortalNavbar />
                <LedTicker placement="PORTAL_MAIN" />
            </div>

            {/* Header */}
            <section style={{ padding: '40px 20px 20px', background: C.bg }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: C.navy, letterSpacing: '-0.5px' }}>
                            🤝 Yoldaş tap
                        </h1>
                        <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted }}>
                            Kirayə xərclərini bölüşmək üçün etibarlı yoldaş tapın
                        </p>
                    </div>
                    <button
                        onClick={handleCreateAd}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: GOLD_GRAD, color: '#0A0B0F',
                            fontWeight: 700, padding: '12px 22px',
                            borderRadius: 12, border: 'none', cursor: 'pointer',
                            fontSize: 14,
                        }}
                    >
                        ＋ Yoldaş elanı ver
                    </button>
                </div>
            </section>

            {/* Filter bar */}
            <section style={{ padding: '0 20px 20px' }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto',
                    background: C.white, borderRadius: 16,
                    padding: 16, border: `1px solid ${C.border}`,
                    display: 'grid', gap: 12,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                            Rayon
                        </label>
                        <select
                            value={district}
                            onChange={e => setDistrict(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.navy, background: C.white, cursor: 'pointer' }}
                        >
                            <option value="">Hamısı</option>
                            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                            Cins
                        </label>
                        <select
                            value={gender}
                            onChange={e => setGender(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.navy, background: C.white, cursor: 'pointer' }}
                        >
                            <option value="">Hamısı</option>
                            <option value="MALE">Kişi</option>
                            <option value="FEMALE">Qadın</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
                            Büdcə max (AZN)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={budgetMax}
                            onChange={e => setBudgetMax(e.target.value)}
                            placeholder="Məs. 500"
                            style={{ width: '100%', padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.navy, background: C.white, outline: 'none' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={handleSearch}
                            style={{
                                width: '100%', padding: '10px 16px',
                                background: C.navy, color: '#FFF', border: 'none',
                                borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}
                        >
                            <Search style={{ width: 15, height: 15 }} />
                            Axtar
                        </button>
                    </div>
                </div>
            </section>

            {/* Results */}
            <main style={{ flex: 1, padding: '0 20px 60px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                        {isLoading ? 'Yüklənir…' : `${total} nəticə tapıldı`}
                    </p>

                    {isLoading ? (
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{
                                    height: 290, background: C.white, borderRadius: 16,
                                    border: `1px solid ${C.border}`, opacity: 0.6,
                                }} />
                            ))}
                        </div>
                    ) : ads.length === 0 ? (
                        <div style={{
                            background: C.white, borderRadius: 16, padding: '48px 20px',
                            textAlign: 'center', border: `1px solid ${C.border}`,
                        }}>
                            <p style={{ fontSize: 40, margin: '0 0 8px' }}>🤝</p>
                            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: C.navy }}>Elan tapılmadı</h2>
                            <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Filtri dəyişin və ya ilk olaraq öz elanınızı verin.</p>
                            <button
                                onClick={handleCreateAd}
                                style={{
                                    marginTop: 20, background: GOLD_GRAD, color: '#0A0B0F',
                                    padding: '10px 22px', borderRadius: 12, border: 'none',
                                    fontWeight: 700, cursor: 'pointer', fontSize: 14,
                                }}
                            >＋ Yoldaş elanı ver</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {ads.map(ad => <RoommateCard key={ad.id} ad={ad} />)}
                        </div>
                    )}
                </div>
            </main>

            <PortalFooter />
        </div>
    );
}
