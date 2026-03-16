import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToastStore } from '@/store/toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { UserPlus, X, Pencil, Trash2, ShieldCheck } from 'lucide-react'

// ─── Types ───────────────────────────────

type PlatformRole = 'MODERATOR' | 'SUPPORT' | 'FINANCE' | 'CONTENT'

interface StaffMember {
    id: string
    name: string
    email: string
    role: PlatformRole
    isActive: boolean
    createdAt: string
    phone?: string | null
}

// ─── Constants ───────────────────────────

const ROLE_OPTIONS: { value: PlatformRole; label: string }[] = [
    { value: 'MODERATOR', label: 'Moderator' },
    { value: 'SUPPORT',   label: 'Dəstək' },
    { value: 'FINANCE',   label: 'Maliyyə' },
    { value: 'CONTENT',   label: 'Kontent' },
]

const ROLE_BADGE: Record<PlatformRole, { bg: string; color: string; label: string }> = {
    MODERATOR: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Moderator' },
    SUPPORT:   { bg: '#F3F4F6', color: '#374151', label: 'Dəstək' },
    FINANCE:   { bg: '#D1FAE5', color: '#065F46', label: 'Maliyyə' },
    CONTENT:   { bg: '#FEF3C7', color: '#92400E', label: 'Kontent' },
}

function RoleBadge({ role }: { role: PlatformRole }) {
    const cfg = ROLE_BADGE[role] ?? { bg: '#F3F4F6', color: '#374151', label: role }
    return (
        <span
            style={{
                backgroundColor: cfg.bg,
                color: cfg.color,
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: 'nowrap',
            }}
        >
            {cfg.label}
        </span>
    )
}

// ─── Modal ───────────────────────────────

interface CreateStaffModalProps {
    onClose: () => void
    onCreated: () => void
}

function CreateStaffModal({ onClose, onCreated }: CreateStaffModalProps) {
    const { addToast } = useToastStore()
    const [name, setName] = React.useState('')
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [role, setRole] = React.useState<PlatformRole>('MODERATOR')
    const [errors, setErrors] = React.useState<Record<string, string>>({})

    const mutation = useMutation({
        mutationFn: () => api.post('/admin/staff', { name, email, password, role }),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Staff üzvü yaradıldı.' })
            onCreated()
            onClose()
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || 'Xəta baş verdi.'
            addToast({ type: 'error', message: msg })
        },
    })

    function validate() {
        const e: Record<string, string> = {}
        if (name.trim().length < 2) e['name'] = 'Ad ən azı 2 simvol olmalıdır.'
        if (!email.includes('@')) e['email'] = 'Düzgün e-poçt daxil edin.'
        if (password.length < 8) e['password'] = 'Şifrə ən azı 8 simvol olmalıdır.'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    function handleSubmit(ev: React.FormEvent) {
        ev.preventDefault()
        if (validate()) mutation.mutate()
    }

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div
                style={{
                    background: '#FFF', borderRadius: 16, padding: 28,
                    width: '100%', maxWidth: 480,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>
                        Yeni Staff Əlavə Et
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Input
                        label="Ad Soyad"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        error={errors['name']}
                        placeholder="Əli Əliyev"
                    />
                    <Input
                        label="E-poçt"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        error={errors['email']}
                        placeholder="staff@icarepro.az"
                    />
                    <Input
                        label="Şifrə"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        error={errors['password']}
                        placeholder="Minimum 8 simvol"
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Rol</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {ROLE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRole(opt.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: `2px solid ${role === opt.value ? '#1A1A2E' : '#E5E7EB'}`,
                                        background: role === opt.value ? '#1A1A2E' : '#FFF',
                                        color: role === opt.value ? '#C9A84C' : '#374151',
                                        fontWeight: 600,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <Button type="button" variant="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
                            Ləğv et
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={mutation.isPending}
                            style={{ flex: 1, backgroundColor: '#1A1A2E', color: '#C9A84C' }}
                        >
                            Yarat
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Edit Role Modal ──────────────────────

interface EditRoleModalProps {
    staff: StaffMember
    onClose: () => void
    onUpdated: () => void
}

function EditRoleModal({ staff, onClose, onUpdated }: EditRoleModalProps) {
    const { addToast } = useToastStore()
    const [role, setRole] = React.useState<PlatformRole>(staff.role)

    const mutation = useMutation({
        mutationFn: () => api.patch(`/admin/staff/${staff.id}`, { role }),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Rol yeniləndi.' })
            onUpdated()
            onClose()
        },
        onError: (err: any) => {
            addToast({ type: 'error', message: err?.response?.data?.error || 'Xəta baş verdi.' })
        },
    })

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ background: '#FFF', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>Rolu Dəyiş</h2>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                        <X size={20} />
                    </button>
                </div>
                <p style={{ margin: '0 0 16px', color: '#6B7280', fontSize: 14 }}>{staff.name} — {staff.email}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                    {ROLE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            style={{
                                padding: '8px 12px', borderRadius: 8,
                                border: `2px solid ${role === opt.value ? '#1A1A2E' : '#E5E7EB'}`,
                                background: role === opt.value ? '#1A1A2E' : '#FFF',
                                color: role === opt.value ? '#C9A84C' : '#374151',
                                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button type="button" variant="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>Ləğv et</Button>
                    <Button
                        type="button"
                        variant="primary"
                        size="md"
                        isLoading={mutation.isPending}
                        onClick={() => mutation.mutate()}
                        style={{ flex: 1, backgroundColor: '#1A1A2E', color: '#C9A84C' }}
                    >
                        Yadda saxla
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────

export function AdminStaff() {
    const queryClient = useQueryClient()
    const { addToast } = useToastStore()
    const [showCreate, setShowCreate] = React.useState(false)
    const [editTarget, setEditTarget] = React.useState<StaffMember | null>(null)
    const [deleteConfirm, setDeleteConfirm] = React.useState<StaffMember | null>(null)

    const { data, isLoading } = useQuery<StaffMember[]>({
        queryKey: ['admin-staff'],
        queryFn: async () => {
            const res = await api.get('/admin/staff')
            return res.data.data
        },
    })

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            api.patch(`/admin/staff/${id}`, { isActive }),
        onSuccess: (_data, vars) => {
            addToast({ type: 'success', message: vars.isActive ? 'Aktivləşdirildi.' : 'Deaktivləşdirildi.' })
            queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
        },
        onError: (err: any) => {
            addToast({ type: 'error', message: err?.response?.data?.error || 'Xəta baş verdi.' })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/admin/staff/${id}`),
        onSuccess: () => {
            addToast({ type: 'success', message: 'Staff üzvü silindi.' })
            queryClient.invalidateQueries({ queryKey: ['admin-staff'] })
            setDeleteConfirm(null)
        },
        onError: (err: any) => {
            addToast({ type: 'error', message: err?.response?.data?.error || 'Xəta baş verdi.' })
        },
    })

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-staff'] })

    return (
        <div style={{ padding: '24px 28px', maxWidth: 1000 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={24} color="#C9A84C" />
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1A1A2E' }}>
                            Platform Staff
                        </h1>
                        <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                            Moderator, Dəstək, Maliyyə və Kontent əməkdaşları
                        </p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowCreate(true)}
                    style={{ backgroundColor: '#1A1A2E', color: '#C9A84C', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <UserPlus size={16} />
                    Yeni Staff
                </Button>
            </div>

            {/* Table */}
            <div style={{ background: '#FFF', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                {/* Table Head */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr 1fr auto',
                    padding: '12px 20px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6B7280',
                    gap: 12,
                }}>
                    <span>Ad Soyad</span>
                    <span>E-poçt</span>
                    <span>Rol</span>
                    <span>Status</span>
                    <span>Əməliyyatlar</span>
                </div>

                {isLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                        Yüklənir...
                    </div>
                ) : !data || data.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center' }}>
                        <ShieldCheck size={40} color="#E5E7EB" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>
                            Hələ heç bir platform staff əlavə edilməyib.
                        </p>
                    </div>
                ) : (
                    data.map((member, idx) => (
                        <div
                            key={member.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 2fr 1fr 1fr auto',
                                padding: '14px 20px',
                                borderBottom: idx < data.length - 1 ? '1px solid #F3F4F6' : 'none',
                                alignItems: 'center',
                                gap: 12,
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div>
                                <p style={{ margin: 0, fontWeight: 600, color: '#1A1A2E', fontSize: 14 }}>{member.name}</p>
                                <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
                                    {new Date(member.createdAt).toLocaleDateString('az-AZ')}
                                </p>
                            </div>
                            <span style={{ color: '#374151', fontSize: 14 }}>{member.email}</span>
                            <RoleBadge role={member.role} />
                            <div>
                                {member.isActive ? (
                                    <span style={{ color: '#059669', fontSize: 13, fontWeight: 500 }}>● Aktiv</span>
                                ) : (
                                    <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 500 }}>● Deaktiv</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {/* Edit role */}
                                <button
                                    type="button"
                                    title="Rolu dəyiş"
                                    onClick={() => setEditTarget(member)}
                                    style={{
                                        background: '#F0F9FF', border: '1px solid #BAE6FD',
                                        borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                                        color: '#0369A1', display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    <Pencil size={14} />
                                </button>
                                {/* Toggle active */}
                                <button
                                    type="button"
                                    title={member.isActive ? 'Deaktiv et' : 'Aktiv et'}
                                    onClick={() => toggleActiveMutation.mutate({ id: member.id, isActive: !member.isActive })}
                                    style={{
                                        background: member.isActive ? '#FEF3C7' : '#D1FAE5',
                                        border: `1px solid ${member.isActive ? '#FCD34D' : '#6EE7B7'}`,
                                        borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                                        color: member.isActive ? '#92400E' : '#065F46',
                                        fontSize: 12, fontWeight: 600,
                                    }}
                                >
                                    {member.isActive ? 'Deaktiv' : 'Aktiv'}
                                </button>
                                {/* Delete */}
                                <button
                                    type="button"
                                    title="Sil"
                                    onClick={() => setDeleteConfirm(member)}
                                    style={{
                                        background: '#FEF2F2', border: '1px solid #FECACA',
                                        borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
                                        color: '#DC2626', display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Delete confirmation inline overlay */}
            {deleteConfirm && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                    }}
                >
                    <div style={{ background: '#FFF', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%' }}>
                        <h3 style={{ margin: '0 0 12px', color: '#1A1A2E', fontSize: 18, fontWeight: 700 }}>
                            Staff üzvünü sil
                        </h3>
                        <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>
                            <b>{deleteConfirm.name}</b> ({deleteConfirm.email}) silinəcək. Bu əməliyyat geri qaytarıla bilməz.
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1 }}
                            >
                                Ləğv et
                            </Button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                                disabled={deleteMutation.isPending}
                                style={{
                                    flex: 1, padding: '10px 16px', borderRadius: 8,
                                    background: '#DC2626', color: '#FFF',
                                    border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                    opacity: deleteMutation.isPending ? 0.7 : 1,
                                }}
                            >
                                {deleteMutation.isPending ? 'Silinir...' : 'Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showCreate && (
                <CreateStaffModal onClose={() => setShowCreate(false)} onCreated={refresh} />
            )}
            {editTarget && (
                <EditRoleModal staff={editTarget} onClose={() => setEditTarget(null)} onUpdated={refresh} />
            )}
        </div>
    )
}
