import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Props {
    /** Yoldaş ad id */
    adId: string;
    /** Full phone number already loaded (used as fallback display once revealed) */
    initialPhone?: string | null;
    /** Mask mode — called on card list vs. detail */
    compact?: boolean;
}

function maskPhone(phone?: string | null): string {
    if (!phone) return '••• ••• •• ••';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '••• ••• •• ••';
    const visible = digits.slice(0, digits.length - 4);
    return `+${visible}•• ••`;
}

export function PhoneReveal({ adId, initialPhone, compact = false }: Props) {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const [revealed, setRevealed] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const displayPhone = revealed ?? maskPhone(initialPhone);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (revealed) return;
        if (!isAuthenticated) {
            sessionStorage.setItem('portalIntent', window.location.pathname + window.location.search);
            navigate('/login');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post(`/yoldash/${adId}/reveal-phone`);
            const phone = res.data?.data?.phone ?? initialPhone ?? '';
            setRevealed(phone);
        } catch {
            setRevealed(initialPhone ?? '');
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <button
                onClick={handleClick}
                disabled={loading}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: revealed ? '#DCFCE7' : '#F5F0E8',
                    color: revealed ? '#166534' : '#1A1A2E',
                    border: '1px solid rgba(0,0,0,0.08)',
                    cursor: revealed ? 'default' : 'pointer',
                }}
            >
                <Phone style={{ width: 12, height: 12 }} />
                {loading ? 'Yüklənir…' : (revealed ? displayPhone : 'Nömrəni aç')}
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: revealed ? 'linear-gradient(135deg,#C9A84C,#e8c56b,#C9A84C)' : '#1A1A2E',
                color: revealed ? '#0A0B0F' : '#FFFFFF',
                border: 'none',
                cursor: revealed ? 'default' : 'pointer',
            }}
        >
            <Phone style={{ width: 16, height: 16 }} />
            {loading ? 'Yüklənir…' : (revealed ? displayPhone : 'Telefonu göstər')}
        </button>
    );
}
