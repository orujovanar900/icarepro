import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building, MapPin, Maximize, ArrowLeft, Calendar, User, FileText, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const formatMoney = (amount: number) =>
    new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN', maximumFractionDigits: 0 }).format(amount);

const statusVariant: Record<string, 'aktiv' | 'arxiv' | 'draft'> = {
    ACTIVE: 'aktiv',
    ARCHIVED: 'arxiv',
    DRAFT: 'draft',
};

const statusLabel: Record<string, string> = {
    ACTIVE: 'Aktiv',
    ARCHIVED: 'Arxiv',
    DRAFT: 'Qaralama',
};

const meterTypeLabel: Record<string, string> = {
    ELECTRICITY: '⚡ Elektrik',
    WATER_COLD: '💧 Soyuq su',
    WATER_HOT: '🔥 İsti su',
    GAS: '🔥 Qaz',
    HEAT: '🌡️ İstilik',
};

export function PropertyDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['property', id],
        queryFn: async () => {
            const res = await api.get(`/properties/${id}`);
            return res.data.data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex-1 p-6 max-w-5xl mx-auto pb-24 space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-surface rounded" />
                <div className="h-48 bg-surface rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-40 bg-surface rounded-xl" />
                    <div className="h-40 bg-surface rounded-xl" />
                </div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
                <Building className="w-16 h-16 text-muted opacity-20" />
                <p className="text-muted">Obyekt tapılmadı.</p>
                <Button variant="outline" onClick={() => navigate('/properties')}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Geri qayıt
                </Button>
            </div>
        );
    }

    const property = data;
    const activeContract = property.contracts?.find((c: any) => c.status === 'ACTIVE');

    return (
        <div className="flex-1 space-y-6 p-6 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/properties')} className="shrink-0">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                        <Building className="w-8 h-8 text-gold" />
                        {property.name}
                    </h1>
                    <p className="text-sm text-muted mt-1">Nömrə: {property.number}</p>
                </div>
                <Badge variant={property.isActive ? 'aktiv' : 'arxiv'}>
                    {property.isActive ? 'Aktiv' : 'Deaktiv'}
                </Badge>
            </div>

            {/* Info Card */}
            <Card variant="elevated">
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted font-medium uppercase tracking-wide">Ünvan</p>
                            <p className="font-medium text-text mt-1">{property.address || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Building className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted font-medium uppercase tracking-wide">Bina</p>
                            <p className="font-medium text-text mt-1">{property.building || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Maximize className="w-5 h-5 text-gold mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs text-muted font-medium uppercase tracking-wide">Sahə</p>
                            <p className="font-medium text-text mt-1">{property.area} m²</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Contract */}
            <Card variant="elevated">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gold" />
                        Aktiv Müqavilə
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {activeContract ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted">Müqavilə №</p>
                                <p className="font-semibold text-text mt-1">{activeContract.number}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted">İcarəçi</p>
                                <p className="font-semibold text-text mt-1">{activeContract.tenant?.fullName}</p>
                                {activeContract.tenant?.phone && (
                                    <p className="text-xs text-muted">{activeContract.tenant.phone}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted">Aylıq İcarə</p>
                                <p className="font-bold text-gold mt-1">{formatMoney(activeContract.monthlyRent)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted">Müddət</p>
                                <p className="font-semibold text-text mt-1 text-sm">
                                    {new Date(activeContract.startDate).toLocaleDateString('az-AZ')} —{' '}
                                    {new Date(activeContract.endDate).toLocaleDateString('az-AZ')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p>Aktiv müqavilə yoxdur.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Contract History */}
            {property.contracts?.length > 0 && (
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gold" />
                            Müqavilə Tarixi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                        {property.contracts.map((c: any) => (
                            <div
                                key={c.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-surface/50 rounded px-2 -mx-2 transition-colors"
                                onClick={() => navigate(`/contracts/${c.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <User className="w-4 h-4 text-muted shrink-0" />
                                    <div>
                                        <p className="font-medium text-text text-sm">{c.tenant?.fullName}</p>
                                        <p className="text-xs text-muted">№ {c.number}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="text-sm text-muted">
                                        {new Date(c.startDate).toLocaleDateString('az-AZ')} — {new Date(c.endDate).toLocaleDateString('az-AZ')}
                                    </p>
                                    <Badge variant={statusVariant[c.status] || 'draft'}>
                                        {statusLabel[c.status] || c.status}
                                    </Badge>
                                    <p className="font-bold text-gold text-sm">{formatMoney(c.monthlyRent)}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Meter Readings */}
            {property.meterReadings?.length > 0 && (
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-gold" />
                            Son Sayğac Oxunuşları
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                        {property.meterReadings.slice(0, 6).map((mr: any) => (
                            <div key={mr.id} className="py-3 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-text text-sm">
                                        {meterTypeLabel[mr.meterType] || mr.meterType}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {new Date(mr.readingDate).toLocaleDateString('az-AZ')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-text">{Number(mr.value).toLocaleString('az-AZ')}</p>
                                    {mr.consumption != null && (
                                        <p className="text-xs text-muted">+{Number(mr.consumption).toLocaleString('az-AZ')}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Photos */}
            {property.photos?.length > 0 && (
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle>Şəkillər</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {property.photos.map((photo: any) => (
                                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden border border-border">
                                    <img
                                        src={photo.url}
                                        alt={photo.caption || property.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
