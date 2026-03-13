import * as React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortalNavbar } from '@/components/portal/PortalNavbar';
import { PortalFooter } from '@/components/portal/PortalFooter';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { api } from '@/lib/api';

const NAVY = '#1A1A2E';
const ORANGE = '#E8620A';
const GOLD = '#C9A84C';
const CREAM = '#F5F0E8';
const MUTED = '#6B7280';
const WHITE = '#FFFFFF';

const LISTING_TYPE_GRADIENTS: Record<string, string> = {
    MENZIL: 'linear-gradient(135deg,#667eea,#764ba2)',
    OFIS: 'linear-gradient(135deg,#f093fb,#f5576c)',
    MAGAZA: 'linear-gradient(135deg,#4facfe,#00f2fe)',
    ANBAR: 'linear-gradient(135deg,#43e97b,#38f9d7)',
    KOMERSIYA: 'linear-gradient(135deg,#fa709a,#fee140)',
    TORPAQ: 'linear-gradient(135deg,#a8edea,#fed6e3)',
    HEYET_EVI: 'linear-gradient(135deg,#ffecd2,#fcb69f)',
    VILLA: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    DEFAULT: 'linear-gradient(135deg,#C9A84C,#e8c56b)',
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function getAvatarColor(name: string): string {
    const colors = ['#E8620A', '#C9A84C', '#1A1A2E', '#667eea', '#f093fb', '#43e97b'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length] ?? '#E8620A';
}

function getRoleBadge(role: string): string {
    const map: Record<string, string> = {
        TENANT: 'İcarəçi',
        ICARECI: 'İcarəçi',
        OWNER: 'Sahib',
        MANAGER: 'Menecer',
        SUPERADMIN: 'Admin',
        AGENT: 'Agent',
        AGENTLIK: 'Agentlik',
    };
    return map[role] ?? role;
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
    switch (status) {
        case 'ACTIVE':
            return { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' };
        case 'SELECTED':
            return { background: '#fef9c3', color: '#b45309', border: '1px solid #fde68a' };
        case 'WITHDRAWN':
        default:
            return { background: '#f3f4f6', color: MUTED, border: '1px solid #e5e7eb' };
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'ACTIVE': return 'Aktiv';
        case 'SELECTED': return 'Seçildi';
        case 'WITHDRAWN': return 'Çıxılıb';
        default: return status;
    }
}

type Tab = 'queue' | 'favorites' | 'profile';

export function Kabinet() {
    const { isAuthenticated, user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('queue');

    // Profile form state
    const [profileName, setProfileName] = useState(user?.name ?? '');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

    // Queue inline edit state
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<number>(0);

    // Auth guard
    if (!isAuthenticated || !user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: CREAM }}>
                <PortalNavbar />
                <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                        <h2 style={{ color: NAVY, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>
                            Kabinetə daxil olmaq üçün giriş edin
                        </h2>
                        <p style={{ color: MUTED, marginBottom: 24 }}>
                            Şəxsi kabinetinizə daxil olmaq üçün hesabınıza giriş edin.
                        </p>
                        <Link
                            to="/login"
                            onClick={() => sessionStorage.setItem('portalIntent', '/kabinet')}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: NAVY, color: WHITE, fontWeight: 700,
                                borderRadius: 12, padding: '12px 28px', fontSize: 15,
                                textDecoration: 'none',
                            }}
                        >
                            Giriş edin →
                        </Link>
                    </div>
                </main>
                <PortalFooter />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: CREAM }}>
            <PortalNavbar />
            <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 16px', width: '100%' }}>

                {/* User Avatar + Name */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    background: WHITE, borderRadius: 20, padding: '24px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 28,
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: getAvatarColor(user.name),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: WHITE, fontWeight: 800, fontSize: 22, flexShrink: 0,
                    }}>
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <h1 style={{ color: NAVY, fontWeight: 800, fontSize: 20, margin: 0 }}>{user.name}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <span style={{
                                background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}44`,
                                borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                            }}>
                                {getRoleBadge(user.role)}
                            </span>
                            <span style={{ color: MUTED, fontSize: 13 }}>{user.email}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: 4, background: WHITE,
                    borderRadius: 16, padding: 6, marginBottom: 28,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                    {([
                        { key: 'queue', label: 'Növbələrim' },
                        { key: 'favorites', label: 'Sevimlilər' },
                        { key: 'profile', label: 'Profil' },
                    ] as { key: Tab; label: string }[]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
                                cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                                background: activeTab === tab.key ? NAVY : 'transparent',
                                color: activeTab === tab.key ? WHITE : MUTED,
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB 1: Queue */}
                {activeTab === 'queue' && (
                    <QueueTab
                        userId={user.id}
                        editingEntryId={editingEntryId}
                        editPrice={editPrice}
                        setEditingEntryId={setEditingEntryId}
                        setEditPrice={setEditPrice}
                        addToast={addToast}
                        queryClient={queryClient}
                        navigate={navigate}
                    />
                )}

                {/* TAB 2: Favorites */}
                {activeTab === 'favorites' && (
                    <FavoritesTab addToast={addToast} queryClient={queryClient} />
                )}

                {/* TAB 3: Profile */}
                {activeTab === 'profile' && (
                    <ProfileTab
                        user={user}
                        profileName={profileName}
                        setProfileName={setProfileName}
                        profilePhone={profilePhone}
                        setProfilePhone={setProfilePhone}
                        profileSaving={profileSaving}
                        setProfileSaving={setProfileSaving}
                        currentPassword={currentPassword}
                        setCurrentPassword={setCurrentPassword}
                        newPassword={newPassword}
                        setNewPassword={setNewPassword}
                        confirmNewPassword={confirmNewPassword}
                        setConfirmNewPassword={setConfirmNewPassword}
                        passwordSaving={passwordSaving}
                        setPasswordSaving={setPasswordSaving}
                        addToast={addToast}
                    />
                )}
            </main>
            <PortalFooter />
        </div>
    );
}

/* ─────────────────────────── QUEUE TAB ─────────────────────────── */
function QueueTab({
    userId,
    editingEntryId,
    editPrice,
    setEditingEntryId,
    setEditPrice,
    addToast,
    queryClient,
    navigate,
}: {
    userId: string;
    editingEntryId: string | null;
    editPrice: number;
    setEditingEntryId: (id: string | null) => void;
    setEditPrice: (p: number) => void;
    addToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
    queryClient: ReturnType<typeof useQueryClient>;
    navigate: ReturnType<typeof useNavigate>;
}) {
    const { data, isLoading } = useQuery({
        queryKey: ['my-queue'],
        queryFn: async () => {
            const res = await api.get('/users/me/queue');
            return res.data;
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ entryId, priceOffer }: { entryId: string; priceOffer: number }) =>
            api.put(`/queue/${entryId}`, { priceOffer }),
        onSuccess: () => {
            addToast({ message: 'Təklifiniz yeniləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['my-queue'] });
            setEditingEntryId(null);
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    const withdrawMutation = useMutation({
        mutationFn: (entryId: string) => api.delete(`/queue/${entryId}`),
        onSuccess: () => {
            addToast({ message: 'Növbədən çıxdınız', type: 'info' });
            queryClient.invalidateQueries({ queryKey: ['my-queue'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    if (isLoading) return <LoadingSpinner />;

    const entries: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    if (entries.length === 0) {
        return (
            <EmptyState
                icon={
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5">
                        <rect x="2" y="4" width="20" height="16" rx="3" />
                        <path d="M8 12h8M8 16h5" />
                    </svg>
                }
                text="Hələ heç bir növbədə deyilsiniz"
                btnText="Elanlara bax →"
                btnHref="/elanlar"
            />
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {entries.map((entry: any) => {
                const isSelected = entry.status === 'SELECTED';
                const listing = entry.listing ?? {};
                const gradient = LISTING_TYPE_GRADIENTS[listing.type] ?? LISTING_TYPE_GRADIENTS['DEFAULT'];

                return (
                    <div
                        key={entry.id}
                        style={{
                            background: WHITE, borderRadius: 16,
                            boxShadow: isSelected
                                ? `0 0 0 2px ${GOLD}, 0 4px 16px rgba(201,168,76,0.2)`
                                : '0 1px 4px rgba(0,0,0,0.06)',
                            padding: 20, display: 'flex', gap: 16, flexWrap: 'wrap',
                        }}
                    >
                        {/* Thumbnail */}
                        <div style={{
                            width: 80, height: 80, borderRadius: 12, flexShrink: 0,
                            background: gradient,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            ...(listing.photos?.[0] ? { backgroundImage: `url(${listing.photos[0]})` } : {}),
                        }} />

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                            {isSelected && (
                                <div style={{
                                    background: `${GOLD}22`, border: `1px solid ${GOLD}55`,
                                    borderRadius: 8, padding: '6px 12px', marginBottom: 10,
                                    fontSize: 13, fontWeight: 600, color: '#92400e',
                                }}>
                                    🏆 Təbrik! Sahibi sizi seçdi!
                                </div>
                            )}
                            <div style={{ fontWeight: 700, fontSize: 16, color: NAVY, marginBottom: 4 }}>
                                {listing.title ?? 'Elan'}
                            </div>
                            <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>
                                {[listing.district, listing.address].filter(Boolean).join(' · ')}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: MUTED }}>
                                <span>Sizin yeriniz: <strong style={{ color: NAVY }}>#{entry.position}</strong></span>
                                <span>👥 <strong style={{ color: NAVY }}>{entry.totalInQueue ?? 0}</strong> nəfər</span>
                                <span>Təklifiniz: <strong style={{ color: NAVY }}>{entry.priceOffer} AZN/ay</strong></span>
                                {entry.durationMonths && (
                                    <span>Müddət: <strong style={{ color: NAVY }}>{entry.durationMonths} ay</strong></span>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, alignItems: 'center' }}>
                                <button
                                    onClick={() => navigate(`/elan/${listing.id}`)}
                                    style={{
                                        background: NAVY, color: WHITE, border: 'none',
                                        borderRadius: 8, padding: '7px 14px', fontSize: 13,
                                        fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    Ətraflı bax
                                </button>

                                {editingEntryId === entry.id ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(Number(e.target.value))}
                                            style={{
                                                width: 100, padding: '6px 10px', borderRadius: 8,
                                                border: `1px solid ${GOLD}`, fontSize: 13,
                                                outline: 'none', color: NAVY,
                                            }}
                                            placeholder="AZN"
                                        />
                                        <button
                                            onClick={() => updateMutation.mutate({ entryId: entry.id, priceOffer: editPrice })}
                                            disabled={updateMutation.isPending}
                                            style={{
                                                background: GOLD, color: '#0A0B0F', border: 'none',
                                                borderRadius: 8, padding: '7px 12px', fontSize: 13,
                                                fontWeight: 600, cursor: 'pointer',
                                            }}
                                        >
                                            Saxla
                                        </button>
                                        <button
                                            onClick={() => setEditingEntryId(null)}
                                            style={{
                                                background: 'transparent', color: MUTED, border: `1px solid #e5e7eb`,
                                                borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer',
                                            }}
                                        >
                                            Ləğv
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => { setEditingEntryId(entry.id); setEditPrice(entry.priceOffer); }}
                                        style={{
                                            background: 'transparent', color: ORANGE, border: `1px solid ${ORANGE}44`,
                                            borderRadius: 8, padding: '7px 14px', fontSize: 13,
                                            fontWeight: 600, cursor: 'pointer',
                                        }}
                                    >
                                        ✏️ Yenilə
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        if (confirm('Növbədən çıxmaq istədiyinizə əminsiniz?'))
                                            withdrawMutation.mutate(entry.id);
                                    }}
                                    style={{
                                        background: '#fee2e2', color: '#dc2626', border: 'none',
                                        borderRadius: 8, padding: '7px 14px', fontSize: 13,
                                        fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    ❌ Çıx
                                </button>
                            </div>
                        </div>

                        {/* Status badge */}
                        <div style={{ alignSelf: 'flex-start' }}>
                            <span style={{
                                ...getStatusBadgeStyle(entry.status),
                                borderRadius: 20, padding: '4px 12px', fontSize: 12,
                                fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                                {getStatusLabel(entry.status)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────── FAVORITES TAB ─────────────────────────── */
function FavoritesTab({
    addToast,
    queryClient,
}: {
    addToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
    queryClient: ReturnType<typeof useQueryClient>;
}) {
    const { data, isLoading } = useQuery({
        queryKey: ['my-favorites'],
        queryFn: async () => {
            const res = await api.get('/users/me/favorites');
            return res.data;
        },
    });

    const removeFavMutation = useMutation({
        mutationFn: (listingId: string) => api.post(`/listings/${listingId}/favorite`),
        onSuccess: () => {
            addToast({ message: 'Sevimlilər siyahısından çıxarıldı', type: 'info' });
            queryClient.invalidateQueries({ queryKey: ['my-favorites'] });
        },
        onError: () => addToast({ message: 'Xəta baş verdi', type: 'error' }),
    });

    if (isLoading) return <LoadingSpinner />;

    const favorites: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

    if (favorites.length === 0) {
        return (
            <EmptyState
                icon={<span style={{ fontSize: 48 }}>♥</span>}
                text="Hələ sevimli elan yoxdur"
                btnText="Elanlara bax →"
                btnHref="/elanlar"
            />
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
            {favorites.map((fav: any) => {
                const listing = fav.listing ?? fav;
                const gradient = LISTING_TYPE_GRADIENTS[listing.type] ?? LISTING_TYPE_GRADIENTS['DEFAULT'];

                return (
                    <div
                        key={fav.id ?? listing.id}
                        style={{
                            background: WHITE, borderRadius: 16,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{
                            height: 140, background: gradient,
                            backgroundImage: listing.photos?.[0] ? `url(${listing.photos[0]})` : undefined,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                        <div style={{ padding: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 4 }}>
                                {listing.title}
                            </div>
                            <div style={{ color: MUTED, fontSize: 13, marginBottom: 10 }}>
                                {listing.district}
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                {listing.type && (
                                    <span style={{
                                        background: `${NAVY}11`, color: NAVY,
                                        borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                                    }}>
                                        {listing.type}
                                    </span>
                                )}
                                {listing.availStatus && (
                                    <span style={{
                                        background: listing.availStatus === 'BOSHDUR' ? '#dcfce7' : '#fef9c3',
                                        color: listing.availStatus === 'BOSHDUR' ? '#16a34a' : '#b45309',
                                        borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                                    }}>
                                        {listing.availStatus === 'BOSHDUR' ? 'Boşdur' : listing.availStatus === 'BOSHALIR' ? 'Boşalır' : 'İnşaat'}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Link
                                    to={`/elan/${listing.id}`}
                                    style={{
                                        flex: 1, textAlign: 'center', background: NAVY, color: WHITE,
                                        borderRadius: 8, padding: '8px 12px', fontSize: 13,
                                        fontWeight: 600, textDecoration: 'none',
                                    }}
                                >
                                    👁 Bax
                                </Link>
                                <button
                                    onClick={() => removeFavMutation.mutate(listing.id)}
                                    disabled={removeFavMutation.isPending}
                                    style={{
                                        background: '#fee2e2', color: '#dc2626', border: 'none',
                                        borderRadius: 8, padding: '8px 12px', fontSize: 13,
                                        fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    ♥ Sil
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────── PROFILE TAB ─────────────────────────── */
function ProfileTab({
    user,
    profileName, setProfileName,
    profilePhone, setProfilePhone,
    profileSaving, setProfileSaving,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    passwordSaving, setPasswordSaving,
    addToast,
}: {
    user: { email: string; name: string; role: string };
    profileName: string; setProfileName: (v: string) => void;
    profilePhone: string; setProfilePhone: (v: string) => void;
    profileSaving: boolean; setProfileSaving: (v: boolean) => void;
    currentPassword: string; setCurrentPassword: (v: string) => void;
    newPassword: string; setNewPassword: (v: string) => void;
    confirmNewPassword: string; setConfirmNewPassword: (v: string) => void;
    passwordSaving: boolean; setPasswordSaving: (v: boolean) => void;
    addToast: (t: { message: string; type: 'success' | 'error' | 'info' }) => void;
}) {
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        try {
            await api.put('/users/profile', { name: profileName, phone: profilePhone });
            addToast({ message: 'Məlumatlar yadda saxlandı', type: 'success' });
        } catch {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmNewPassword) {
            addToast({ message: 'Yeni şifrələr uyğun gəlmir', type: 'error' });
            return;
        }
        setPasswordSaving(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            addToast({ message: 'Şifrə uğurla yeniləndi', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch {
            addToast({ message: 'Cari şifrə yanlışdır', type: 'error' });
        } finally {
            setPasswordSaving(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: 10,
        border: '1px solid #e5e7eb', fontSize: 14, outline: 'none',
        color: NAVY, background: WHITE,
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 13, fontWeight: 600, color: MUTED, marginBottom: 6, display: 'block',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Section 1: Personal info */}
            <div style={{
                background: WHITE, borderRadius: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 28,
            }}>
                <h2 style={{ color: NAVY, fontWeight: 700, fontSize: 17, marginBottom: 20 }}>
                    Şəxsi məlumatlar
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Ad Soyad</label>
                        <input
                            style={inputStyle}
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Ad Soyad"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Telefon</label>
                        <input
                            style={inputStyle}
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            placeholder="+994 XX XXX XX XX"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>E-poçt (dəyişdirilmir)</label>
                        <input
                            style={{ ...inputStyle, background: '#f9fafb', color: MUTED }}
                            value={user.email}
                            readOnly
                        />
                    </div>
                </div>
                <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    style={{
                        marginTop: 20, background: NAVY, color: WHITE, border: 'none',
                        borderRadius: 10, padding: '11px 24px', fontSize: 14,
                        fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer',
                        opacity: profileSaving ? 0.7 : 1,
                    }}
                >
                    {profileSaving ? 'Saxlanır...' : 'Yadda saxla'}
                </button>
            </div>

            {/* Section 2: Change password */}
            <div style={{
                background: WHITE, borderRadius: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 28,
            }}>
                <h2 style={{ color: NAVY, fontWeight: 700, fontSize: 17, marginBottom: 20 }}>
                    Şifrə dəyiş
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
                    <div>
                        <label style={labelStyle}>Cari şifrə</label>
                        <input
                            type="password"
                            style={inputStyle}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Yeni şifrə</label>
                        <input
                            type="password"
                            style={inputStyle}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Yeni şifrəni təsdiqlə</label>
                        <input
                            type="password"
                            style={inputStyle}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                </div>
                <button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmNewPassword}
                    style={{
                        marginTop: 20, background: ORANGE, color: WHITE, border: 'none',
                        borderRadius: 10, padding: '11px 24px', fontSize: 14,
                        fontWeight: 700, cursor: 'pointer',
                        opacity: (passwordSaving || !currentPassword || !newPassword || !confirmNewPassword) ? 0.6 : 1,
                    }}
                >
                    {passwordSaving ? 'Yenilənir...' : 'Şifrəni yenilə'}
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────── HELPERS ─────────────────────────── */
function LoadingSpinner() {
    return (
        <div style={{ textAlign: 'center', padding: 48, color: MUTED }}>
            <div style={{
                width: 36, height: 36, border: `3px solid ${GOLD}33`,
                borderTopColor: GOLD, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: 14 }}>Yüklənir...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function EmptyState({
    icon, text, btnText, btnHref,
}: {
    icon: React.ReactNode; text: string; btnText: string; btnHref: string;
}) {
    return (
        <div style={{
            textAlign: 'center', padding: 48,
            background: WHITE, borderRadius: 16,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
            <div style={{ marginBottom: 12 }}>{icon}</div>
            <p style={{ color: MUTED, fontSize: 15, marginBottom: 20 }}>{text}</p>
            <Link
                to={btnHref}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: NAVY, color: WHITE, borderRadius: 10,
                    padding: '10px 22px', fontSize: 14, fontWeight: 600,
                    textDecoration: 'none',
                }}
            >
                {btnText}
            </Link>
        </div>
    );
}
