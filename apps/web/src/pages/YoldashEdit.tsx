import * as React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { YoldashForm } from './YoldashForm';

const C = {
    navy: '#1A1A2E',
    gold: '#C9A84C',
    bg: '#F5F0E8',
    white: '#FFFFFF',
    muted: '#6B7280',
    amber: '#B45309',
    amberBg: '#FEF3C7',
    amberBorder: '#FDE68A',
};

export function YoldashEdit() {
    const { id } = useParams<{ id: string }>();
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to={`/login?returnUrl=/yoldas/edit/${id}`} replace />;
    }

    const { data, isLoading, isError } = useQuery({
        queryKey: ['yoldash-ad', id],
        queryFn: async () => {
            const res = await api.get(`/yoldash/${id}`);
            return res.data?.data ?? res.data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
                <PortalNavbar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: C.muted, fontSize: 15 }}>Yüklənir...</div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: C.bg }}>
                <PortalNavbar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ color: C.navy, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                            Elan tapılmadı
                        </h2>
                        <p style={{ color: C.muted }}>Bu elana giriş hüququnuz yoxdur və ya silinib.</p>
                    </div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    const initial = {
        displayName: data.fullName ?? '',
        age: data.age != null ? String(data.age) : '',
        gender: data.gender ?? '',
        photoUrl: Array.isArray(data.photos) && data.photos.length > 0 ? data.photos[0] : '',
        districts: Array.isArray(data.districts) ? data.districts : [],
        budgetMin: data.budgetMin != null ? String(data.budgetMin) : '',
        budgetMax: data.budgetMax != null ? String(data.budgetMax) : '',
        startMonth: data.startMonth ?? (new Date().getMonth() + 1),
        startYear: data.startYear ?? new Date().getFullYear(),
        durationMonths: data.durationMonths != null ? String(data.durationMonths) : '',
        isLongTerm: !!data.isLongTerm,
        adDurationDays: data.adDurationDays ?? 60,
        phone: data.phone ?? '',
        whatsapp: data.whatsapp ?? '',
        telegram: data.telegram ?? '',
        occupation: data.occupation ?? '',
        smokes: data.smokes ?? null,
        hasPets: data.hasPets ?? null,
        acceptsSmoker: data.acceptsSmoker ?? null,
        acceptsPets: data.acceptsPets ?? null,
        schedule: data.schedule ?? '',
        guests: data.guests ?? '',
        description: data.description ?? '',
    };

    return (
        <>
            <div style={{ background: C.bg }}>
                <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 0' }}>
                    <div style={{
                        background: C.amberBg,
                        border: `1px solid ${C.amberBorder}`,
                        borderRadius: 12,
                        padding: '12px 16px',
                        color: C.amber,
                        fontSize: 14,
                        fontWeight: 600,
                    }}>
                        ⚠️ Dəyişiklik etdikdən sonra elanınız yenidən moderasiyaya göndəriləcək.
                    </div>
                </div>
            </div>
            <YoldashForm mode="edit" initial={initial} editId={id} />
        </>
    );
}
