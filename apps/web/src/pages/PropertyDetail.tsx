import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, MapPin, Maximize, ArrowLeft, Calendar, User, FileText, Zap, Camera, Trash2, UploadCloud, Loader2, ChevronLeft, ChevronRight, X, ExternalLink, Download, FilePlus, Printer } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/store/toast';
import { usePlan, FeatureGate } from '@/utils/planGates';
import { UpgradeModal } from '@/components/UpgradeModal';

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
    const { can } = usePlan();
    const [upgradeFeature, setUpgradeFeature] = useState<FeatureGate | null>(null);

    const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'history' | 'report'>('details');
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const photosRef = useRef<any[]>([]);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isUploadingOther, setIsUploadingOther] = useState(false);

    // Keyboard nav for lightbox - must be declared before early returns (React rules)
    useEffect(() => {
        if (lightboxIndex === null) return;
        const photos = photosRef.current;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') setLightboxIndex(i => i !== null ? (i + 1) % photos.length : null);
            if (e.key === 'ArrowLeft') setLightboxIndex(i => i !== null ? (i - 1 + photos.length) % photos.length : null);
            if (e.key === 'Escape') setLightboxIndex(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxIndex]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['property', id],
        queryFn: async () => {
            const res = await api.get(`/properties/${id}`);
            return res.data.data;
        },
        enabled: !!id,
    });

    const { data: reportData, isLoading: isReportLoading } = useQuery({
        queryKey: ['property-report', id],
        queryFn: async () => {
            const res = await api.get(`/properties/${id}/report`);
            return res.data.data;
        },
        enabled: !!id && activeTab === 'report',
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
    const allPhotos: any[] = property?.photos || [];
    const realPhotos = allPhotos.filter((p: any) => !p.caption?.startsWith('DOC::'));
    const otherDocs = allPhotos.filter((p: any) => p.caption?.startsWith('DOC::'));
    photosRef.current = realPhotos;
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
            await api.post(`/properties/${id}/photos`, formData);
            addToast({ message: 'Şəkil yükləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error: any) {
            addToast({ message: error.response?.data?.error || 'Xəta baş verdi', type: 'error' });
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
            await api.post(`/properties/${id}/documents?type=${type}`, formData);
            addToast({ message: 'Sənəd yükləndi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch (error: any) {
            addToast({ message: error.response?.data?.error || 'Xəta baş verdi', type: 'error' });
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

    const handleUploadOtherDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length || !id) return;
        setIsUploadingOther(true);
        let succeeded = 0;
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                await api.post(`/properties/${id}/documents`, formData);
                succeeded++;
            } catch (error: any) {
                addToast({ message: error.response?.data?.error || `${file.name}: xəta`, type: 'error' });
            }
        }
        if (succeeded > 0) {
            addToast({ message: `${succeeded} sənəd yükləndi`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        }
        setIsUploadingOther(false);
        e.target.value = '';
    };

    const handleDeleteOtherDoc = async (docId: string) => {
        if (!confirm('Sənədi silmək istədiyinizə əminsiniz?')) return;
        try {
            await api.delete(`/properties/${id}/documents/${docId}`);
            addToast({ message: 'Sənəd silindi', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['property', id] });
        } catch {
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
            <div className="flex space-x-1 border-b border-border overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(['details', 'photos', 'history', 'report'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${activeTab === tab
                            ? 'border-gold text-gold'
                            : 'border-transparent text-muted hover:text-text hover:border-border'
                            }`}
                    >
                        {tab === 'details' && 'Təfərrüatlar'}
                        {tab === 'photos' && `Fotolar (${realPhotos.length}/5)`}
                        {tab === 'history' && 'İcarəçi Tarixçəsi'}
                        {tab === 'report' && 'Əmlak Hesabatı'}
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

                    {/* Diğər sənədlər */}
                    <Card variant="elevated">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FilePlus className="w-5 h-5 text-gold" />
                                    Diğər sənədlər
                                </CardTitle>
                                <label className={`cursor-pointer ${isUploadingOther ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold px-3 py-1.5 rounded-lg transition-colors font-medium text-sm">
                                        {isUploadingOther ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                                        Sənəd əlavə et
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        multiple
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleUploadOtherDoc}
                                    />
                                </label>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {otherDocs.length === 0 ? (
                                <div className="text-center py-8 text-muted border border-dashed border-border rounded-xl">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Hələlik sənəd yoxdur.</p>
                                    <p className="text-xs text-muted/60 mt-1">PDF, DOC, DOCX, JPG, PNG · max 4MB</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {otherDocs.map((doc: any) => {
                                        const fileName = doc.caption?.replace('DOC::', '') || 'Sənəd';
                                        const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                        const isImage = ['jpg', 'jpeg', 'png'].includes(ext);
                                        return (
                                            <div key={doc.id} className="flex items-center gap-3 py-3">
                                                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                                    {isImage ? <Camera className="w-4 h-4 text-gold" /> : <FileText className="w-4 h-4 text-gold" />}
                                                </div>
                                                <span className="flex-1 text-sm text-text truncate">{fileName}</span>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-muted hover:text-blue-400 transition-colors rounded"
                                                    title="Yüklə"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDeleteOtherDoc(doc.id)}
                                                    className="p-1.5 text-muted hover:text-red transition-colors rounded"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Fotolar Tab */}
            {activeTab === 'photos' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-text">Fotolar ({property.photos?.length || 0}/5)</h3>
                        <div className="flex flex-col items-end gap-1">
                            <label
                                className={`cursor-pointer ${((property.photos?.length >= 5 && can('photos')) || isUploadingPhoto) ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={(e) => {
                                    if (!can('photos')) {
                                        e.preventDefault();
                                        setUpgradeFeature('photos');
                                    }
                                }}
                            >
                                <div className="flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold px-4 py-2 rounded-lg transition-colors font-medium text-sm">
                                    {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    Şəkil Yüklə
                                </div>
                                <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handleUploadPhoto} />
                            </label>
                            <p className="text-[10px] text-muted">max 4MB, (jpg, png)</p>
                        </div>
                    </div>

                    {property.photos?.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {property.photos.map((photo: any, index: number) => (
                                <div
                                    key={photo.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-surface cursor-pointer"
                                    onClick={() => setLightboxIndex(index)}
                                >
                                    <img src={photo.url} alt="Property" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Maximize className="w-6 h-6 text-white" />
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}
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

                    {/* Lightbox Modal */}
                    {lightboxIndex !== null && property.photos?.length > 0 && (
                        <div
                            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
                            onClick={() => setLightboxIndex(null)}
                        >
                            {/* Close */}
                            <button
                                className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                                onClick={() => setLightboxIndex(null)}
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Open in new tab */}
                            <a
                                href={property.photos[lightboxIndex].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-4 right-16 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
                                onClick={e => e.stopPropagation()}
                            >
                                <ExternalLink className="w-6 h-6" />
                            </a>

                            {/* Counter */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                                {lightboxIndex + 1} / {property.photos.length}
                            </div>

                            {/* Prev */}
                            {property.photos.length > 1 && (
                                <button
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
                                    onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i - 1 + property.photos.length) % property.photos.length : 0); }}
                                >
                                    <ChevronLeft className="w-7 h-7" />
                                </button>
                            )}

                            {/* Image */}
                            <img
                                src={property.photos[lightboxIndex].url}
                                alt="property"
                                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            />

                            {/* Next */}
                            {property.photos.length > 1 && (
                                <button
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 transition-colors z-10"
                                    onClick={e => { e.stopPropagation(); setLightboxIndex(i => i !== null ? (i + 1) % property.photos.length : 0); }}
                                >
                                    <ChevronRight className="w-7 h-7" />
                                </button>
                            )}
                        </div>
                    )}
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

            {/* Əmlak Hesabatı Tab */}
            {activeTab === 'report' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-text">Əmlak Hesabatı</h3>
                        <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:flex">
                            <Printer className="w-4 h-4 mr-2" />
                            Çap et / PDF
                        </Button>
                    </div>

                    {isReportLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>
                    ) : reportData ? (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card variant="elevated">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-medium text-muted">Aylıq İcarə (Aktiv)</p>
                                        <p className="text-2xl font-bold text-text mt-1">{formatMoney(activeContract?.monthlyRent || 0)}</p>
                                    </CardContent>
                                </Card>
                                <Card variant="elevated">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-medium text-muted">Toplam Ödəniş</p>
                                        <p className="text-xl font-bold text-green-500 mt-1">{formatMoney(reportData.totalIncome)}</p>
                                    </CardContent>
                                </Card>
                                <Card variant="elevated">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-medium text-muted">Toplam Borc</p>
                                        <p className="text-xl font-bold text-red mt-1">{formatMoney(reportData.totalDebt)}</p>
                                    </CardContent>
                                </Card>
                                <Card variant="elevated">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-medium text-muted">Effektivlik</p>
                                        <p className="text-2xl font-bold text-gold mt-1">{reportData.efficiency}%</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Pie Chart - İcarə Effektivliyi */}
                                <Card variant="elevated" className="col-span-1">
                                    <CardHeader>
                                        <CardTitle>İcarə effektivliyi</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex justify-center items-center h-64">
                                        {(reportData.totalIncome === 0 && reportData.totalDebt === 0) ? (
                                            <p className="text-muted text-sm">Məlumat yoxdur</p>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Ödənilmiş', value: reportData.totalIncome },
                                                            { name: 'Borc', value: reportData.totalDebt }
                                                        ]}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="#22c55e" /> {/* green for income */}
                                                        <Cell fill="#ef4444" /> {/* red for debt */}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(val: any) => formatMoney(Number(val) || 0)} contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #2D3748', borderRadius: '8px', color: '#fff' }} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Bar Chart - Ay-ba-ay Gəlir */}
                                <Card variant="elevated" className="col-span-1 lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Ay-ba-ay Gəlir və Borc</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-64 mt-4 text-xs font-sans">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={reportData.monthlyStats}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                                                <XAxis dataKey="name" stroke="#A0AEC0" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#A0AEC0" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₼${val}`} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #2D3748', borderRadius: '8px', color: '#fff' }}
                                                    formatter={(val: any) => formatMoney(Number(val) || 0)}
                                                />
                                                <Legend />
                                                <Bar dataKey="gelir" name="Ödəniş" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="borc" name="Borc" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-muted">
                            <p>Tarixçə boşdur.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Upgrade Modal Gate */}
            {upgradeFeature && (
                <div className="fixed inset-0 z-[100] backdrop-blur-md bg-black/40">
                    <UpgradeModal
                        isOpen={true}
                        feature={upgradeFeature}
                        requiredPlan={upgradeFeature === 'photos' ? 'starter' : 'starter'}
                        onClose={() => setUpgradeFeature(null)}
                    />
                </div>
            )}
        </div>
    );
}
