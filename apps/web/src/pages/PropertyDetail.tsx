import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, MapPin, Maximize, ArrowLeft, Calendar, User, FileText, Zap, Camera, Trash2, UploadCloud, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/store/toast';

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

const propertyStatusVariant: Record<string, 'aktiv' | 'arxiv' | 'draft'> = {
    VACANT: 'aktiv', // Yaşıl
    OCCUPIED: 'draft', // Sarı
    UNDER_REPAIR: 'arxiv', // Qırmızı/Boz
};

const propertyStatusLabel: Record<string, string> = {
    VACANT: 'Boş',
    OCCUPIED: 'Tutulub',
    UNDER_REPAIR: 'Təmirdə',
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
    const queryClient = useQueryClient();
    const addToast = useToastStore((state) => state.addToast);

    const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'documents' | 'history'>('details');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

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

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        if (property.photos?.length >= 5) {
            addToast({ message: 'Maksimum 5 şəkil yükləyə bilərsiniz', type: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setIsUploadingPhoto(true);

        try {
            await api.post(`/properties/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            addToast({ message: 'Şəkil yükləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error) {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm('Şəkli silmək istədiyinizə əminsiniz?')) return;
        try {
            await api.delete(`/properties/${id}/photos/${photoId}`);
            addToast({ message: 'Şəkil silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error) {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        }
    };

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OWNERSHIP_CERT' | 'TEX_PASSPORT') => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const formData = new FormData();
        formData.append('file', file);
        setIsUploadingDoc(true);

        try {
            await api.post(`/properties/${id}/documents?type=${type}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            addToast({ message: 'Sənəd yükləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error) {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Sənədi silmək istədiyinizə əminsiniz?')) return;
        try {
            await api.delete(`/properties/${id}/documents/${docId}`);
            addToast({ message: 'Sənəd silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error) {
            addToast({ message: 'Xəta baş verdi', type: 'error' });
        }
    };

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
                <Badge variant={propertyStatusVariant[property.status] || 'aktiv'}>
                    {propertyStatusLabel[property.status] || property.status}
                </Badge>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 border-b border-border">
                {(['details', 'photos', 'documents', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                            ? 'border-gold text-gold'
                            : 'border-transparent text-muted hover:text-text hover:border-border'
                            }`}
                    >
                        {tab === 'details' && 'Təfərrüatlar'}
                        {tab === 'photos' && `Fotolar (${property.photos?.length || 0}/5)`}
                        {tab === 'documents' && 'Sənədlər'}
                        {tab === 'history' && 'İcarəçi Tarixçəsi'}
                    </button>
                ))}
            </div>

            {/* Təfərrüatlar Tab */}
            {activeTab === 'details' && (
                <div className="space-y-6">
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
                </div>
            )}

            {/* Fotolar Tab */}
            {activeTab === 'photos' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-text">Fotolar ({property.photos?.length || 0}/5)</h3>
                        <label className={`cursor-pointer ${(property.photos?.length >= 5 || isUploadingPhoto) ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold px-4 py-2 rounded-lg transition-colors font-medium text-sm">
                                {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                Şəkil Yüklə
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                        </label>
                    </div>

                    {property.photos?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {property.photos.map((photo: any) => (
                                <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-surface">
                                    <img src={photo.url} alt="Property" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <button
                                        onClick={() => handleDeletePhoto(photo.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red/80 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
                            <Camera className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Obyektə aid şəkil yoxdur.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Sənədlər Tab */}
            {activeTab === 'documents' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Çıxarış */}
                        <Card variant="elevated">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Mülkiyyət Çıxarışı (Kupça)</CardTitle>
                                <label className="cursor-pointer">
                                    <div className="p-2 text-gold bg-gold/10 hover:bg-gold/20 rounded-md transition-colors">
                                        {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUploadDocument(e, 'OWNERSHIP_CERT')} />
                                </label>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {property.documents?.filter((d: any) => d.type === 'OWNERSHIP_CERT').map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gold" />
                                            <div>
                                                <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text hover:underline">{doc.name}</a>
                                                <p className="text-xs text-muted">{new Date(doc.uploadedAt).toLocaleDateString('az-AZ')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-muted hover:text-red transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {property.documents?.filter((d: any) => d.type === 'OWNERSHIP_CERT').length === 0 && (
                                    <p className="text-sm text-muted text-center py-4 border border-dashed border-border rounded-lg">Sənəd yüklənməyib</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tex-Pasport */}
                        <Card variant="elevated">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base">Tex-Pasport</CardTitle>
                                <label className="cursor-pointer">
                                    <div className="p-2 text-gold bg-gold/10 hover:bg-gold/20 rounded-md transition-colors">
                                        {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleUploadDocument(e, 'TEX_PASSPORT')} />
                                </label>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {property.documents?.filter((d: any) => d.type === 'TEX_PASSPORT').map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gold" />
                                            <div>
                                                <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-text hover:underline">{doc.name}</a>
                                                <p className="text-xs text-muted">{new Date(doc.uploadedAt).toLocaleDateString('az-AZ')}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-muted hover:text-red transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {property.documents?.filter((d: any) => d.type === 'TEX_PASSPORT').length === 0 && (
                                    <p className="text-sm text-muted text-center py-4 border border-dashed border-border rounded-lg">Sənəd yüklənməyib</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* İcarəçi Tarixçəsi Tab */}
            {activeTab === 'history' && (
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-gold" />
                            İcarəçi Tarixçəsi
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                        {property.contracts?.length > 0 ? property.contracts.map((c: any) => (
                            <div
                                key={c.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-surface-hover rounded px-3 -mx-3 transition-colors"
                                onClick={() => navigate(`/contracts/${c.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-text">{c.tenant?.fullName}</p>
                                        <p className="text-xs text-muted">Müqavilə № {c.number}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 sm:flex-row-reverse sm:justify-end">
                                    <p className="font-bold text-text text-sm min-w-[80px] text-right">{formatMoney(c.monthlyRent)}</p>
                                    <Badge variant={statusVariant[c.status] || 'draft'}>
                                        {statusLabel[c.status] || c.status}
                                    </Badge>
                                    <p className="text-sm text-muted hidden md:block">
                                        {new Date(c.startDate).toLocaleDateString('az-AZ')} — {new Date(c.endDate).toLocaleDateString('az-AZ')}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-muted">
                                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Tarixçə boşdur.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
