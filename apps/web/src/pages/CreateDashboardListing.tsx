import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Upload, X, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

/* ──────────── Constants ──────────── */
const LISTING_TYPES = [
    { value: 'MENZIL', label: '🏠 Mənzil' },
    { value: 'OFIS', label: '🏢 Ofis' },
    { value: 'OBYEKT', label: '🏗 Obyekt' },
    { value: 'HEYET_EVI', label: '🏡 Həyət evi' },
    { value: 'GARAJ', label: '🚗 Qaraj' },
    { value: 'TORPAQ', label: '🌱 Torpaq' },
    { value: 'ANBAR', label: '📦 Anbar' },
];

const TYPES_WITH_ROOMS = ['MENZIL', 'OFIS', 'HEYET_EVI'];

const DISTRICTS = [
    'Nəsimi', 'Nərimanov', 'Səbail', 'Yasamal', 'Xətai',
    'Binəqədi', 'Nizami', 'Suraxanı', 'Abşeron', 'Qaradağ',
    'Nişanqah', 'Sabunçu', 'Pirəkəşkül', 'Digər',
];

const AVAIL_STATUS_OPTIONS = [
    { value: 'BOSHDUR', label: '🟢 Boşdur', desc: 'Hazırda boşdur' },
    { value: 'BOSHALIR', label: '🟡 Boşalır', desc: 'Müqavilə var, bitəcək' },
    { value: 'INSAAT', label: '⚫ İnşaat/Təmir', desc: 'Hələ hazır deyil' },
];

const AMENITIES = [
    { key: 'mebel', label: 'Mebel' },
    { key: 'kondisioner', label: 'Kondisioner' },
    { key: 'lift', label: 'Lift' },
    { key: 'balkon', label: 'Balkon' },
    { key: 'internet', label: 'İnternet' },
    { key: 'parklama', label: 'Parklama' },
    { key: 'isitme', label: 'İsitmə' },
    { key: 'guvenlik', label: 'Güvənlik' },
    { key: 'hovuz', label: 'Hovuz' },
];

const TYPE_LABEL_MAP: Record<string, string> = {
    MENZIL: 'Mənzil', OFIS: 'Ofis', OBYEKT: 'Obyekt', HEYET_EVI: 'Həyət evi',
    GARAJ: 'Qaraj', TORPAQ: 'Torpaq', ANBAR: 'Anbar',
};

/* ──────────── Component ──────────── */
export function CreateDashboardListing() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [type, setType] = useState('');
    const [rooms, setRooms] = useState<number | null>(null);
    const [area, setArea] = useState('');
    const [floor, setFloor] = useState('');
    const [totalFloors, setTotalFloors] = useState('');
    const [district, setDistrict] = useState('');
    const [address, setAddress] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [availStatus, setAvailStatus] = useState('BOSHDUR');
    const [contractStartDate, setContractStartDate] = useState('');
    const [contractEndDate, setContractEndDate] = useState('');
    const [expectedFreeDate, setExpectedFreeDate] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [amenities, setAmenities] = useState<string[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Auto-generate title
    const autoTitle = React.useMemo(() => {
        const parts: string[] = [];
        if (rooms && TYPES_WITH_ROOMS.includes(type)) parts.push(`${rooms}-otaqlı`);
        if (type) parts.push(TYPE_LABEL_MAP[type] ?? type);
        if (district) parts.push(`— ${district}`);
        return parts.join(' ');
    }, [type, rooms, district]);

    React.useEffect(() => {
        if (!title || title === autoTitle) return;
    }, [autoTitle]);

    // When type/rooms/district changes, update title if it hasn't been manually edited
    const [titleEdited, setTitleEdited] = useState(false);
    React.useEffect(() => {
        if (!titleEdited) setTitle(autoTitle);
    }, [autoTitle, titleEdited]);

    /* Create listing — save as DRAFT */
    const draftMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const res = await api.post('/listings', payload);
            return res.data;
        },
        onSuccess: () => {
            addToast({ message: 'Elan qaralama kimi saxlandı.', type: 'success' });
            navigate('/dashboard/elanlar');
        },
        onError: () => addToast({ message: 'Xəta baş verdi. Yenidən cəhd edin.', type: 'error' }),
    });

    /* Create listing — save then immediately publish */
    const publishMutation = useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const createRes = await api.post('/listings', payload);
            const listingId: string = createRes.data?.data?.id ?? createRes.data?.id;
            if (!listingId) throw new Error('Listing ID not returned');
            await api.post(`/listings/${listingId}/publish`);
            return listingId;
        },
        onSuccess: () => {
            addToast({ message: 'Elanınız moderasiyaya göndərildi! 24 saat ərzində yoxlanılacaq.', type: 'success' });
            navigate('/dashboard/elanlar');
        },
        onError: () => addToast({ message: 'Xəta baş verdi. Yenidən cəhd edin.', type: 'error' }),
    });

    /* Photo upload handler */
    const handleFileChange = useCallback(async (files: FileList | null) => {
        if (!files) return;
        const remaining = 10 - photos.length;
        const toUpload = Array.from(files).slice(0, remaining);
        if (toUpload.length === 0) {
            addToast({ message: 'Maksimum 10 şəkil yükləyə bilərsiniz', type: 'error' });
            return;
        }
        setUploading(true);
        const uploaded: string[] = [];
        for (const file of toUpload) {
            try {
                const form = new FormData();
                form.append('photo', file);
                form.append('listingId', 'temp');
                const res = await api.post('/listings/upload-photo', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const url = res.data?.url ?? res.data?.data?.url;
                if (url) uploaded.push(url);
            } catch {
                addToast({ message: `${file.name} yüklənərkən xəta`, type: 'error' });
            }
        }
        setPhotos((prev) => [...prev, ...uploaded]);
        setUploading(false);
    }, [photos.length, addToast]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        handleFileChange(e.dataTransfer.files);
    };

    const toggleAmenity = (key: string) => {
        setAmenities((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const buildPayload = (): Record<string, unknown> | null => {
        if (!type) { addToast({ message: 'Elan növünü seçin', type: 'error' }); return null; }
        if (!district) { addToast({ message: 'Rayonu seçin', type: 'error' }); return null; }
        if (!address) { addToast({ message: 'Ünvanı daxil edin', type: 'error' }); return null; }
        if (!basePrice) { addToast({ message: 'Qiyməti daxil edin', type: 'error' }); return null; }

        const payload: Record<string, unknown> = {
            type,
            district,
            address,
            title: title || autoTitle,
            description,
            availStatus,
            basePrice: Number(basePrice),
            amenities,
            photos,
        };
        if (rooms !== null) payload['rooms'] = rooms;
        if (area) payload['area'] = Number(area);
        if (floor) payload['floor'] = Number(floor);
        if (totalFloors) payload['totalFloors'] = Number(totalFloors);
        if (availStatus === 'BOSHALIR') {
            payload['contractStartDate'] = contractStartDate;
            payload['contractEndDate'] = contractEndDate;
            payload['expectedFreeDate'] = expectedFreeDate;
        }
        if (availStatus === 'INSAAT') {
            payload['expectedFreeDate'] = expectedFreeDate;
        }
        return payload;
    };

    const handleDraft = () => {
        const payload = buildPayload();
        if (payload) draftMutation.mutate(payload);
    };

    const handlePublish = () => {
        const payload = buildPayload();
        if (payload) publishMutation.mutate(payload);
    };

    const showRooms = TYPES_WITH_ROOMS.includes(type);

    /* Input style helper */
    const inp = 'w-full';

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6 pb-28">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-9 w-9 p-0">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-text">Yeni elan yarat</h1>
                    <p className="text-sm text-muted mt-0.5">Qaralama kimi saxlaya və ya birbaşa dərc edə bilərsiniz</p>
                </div>
            </div>

            {/* SECTION 1: Type */}
            <Card>
                <CardHeader><CardTitle>1. Əsas məlumatlar</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                    <div>
                        <p className="text-sm text-muted font-medium mb-3">Elan növü *</p>
                        <div className="flex flex-wrap gap-2">
                            {LISTING_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => setType(t.value)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                                        type === t.value
                                            ? 'bg-gold text-bg border-gold'
                                            : 'border-border text-muted hover:border-gold/50'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {showRooms && (
                        <div>
                            <p className="text-sm text-muted font-medium mb-3">Otaq sayı</p>
                            <div className="flex gap-2 flex-wrap">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setRooms(n)}
                                        className={`w-12 h-12 rounded-full text-sm font-bold border transition-all ${
                                            rooms === n
                                                ? 'bg-gold text-bg border-gold'
                                                : 'border-border text-muted hover:border-gold/50'
                                        }`}
                                    >
                                        {n === 5 ? '5+' : n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-muted font-medium block mb-1">Sahə (m²)</label>
                            <Input
                                type="number"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                placeholder="85"
                                className={inp}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted font-medium block mb-1">Mərtəbə</label>
                            <Input
                                type="number"
                                value={floor}
                                onChange={(e) => setFloor(e.target.value)}
                                placeholder="3"
                                className={inp}
                            />
                        </div>
                        <div>
                            <label className="text-sm text-muted font-medium block mb-1">Ümumi mərtəbə</label>
                            <Input
                                type="number"
                                value={totalFloors}
                                onChange={(e) => setTotalFloors(e.target.value)}
                                placeholder="9"
                                className={inp}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-muted font-medium block mb-1">Başlıq *</label>
                        <Input
                            value={title}
                            onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
                            placeholder="Məs: 3-otaqlı Mənzil — Nəsimi"
                            className={inp}
                        />
                        <p className="text-xs text-muted mt-1">Avtomatik yaradılır, dəyişdirə bilərsiniz</p>
                    </div>

                    <div>
                        <label className="text-sm text-muted font-medium block mb-1">Açıqlama</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Elan haqqında ətraflı məlumat..."
                            rows={4}
                            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-gold resize-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 2: Location */}
            <Card>
                <CardHeader><CardTitle>2. Yer məlumatları</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-muted font-medium block mb-1">Rayon *</label>
                        <Select
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            options={[
                                { label: 'Rayon seçin...', value: '' },
                                ...DISTRICTS.map((d) => ({ label: d, value: d })),
                            ]}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-muted font-medium block mb-1">Ünvan *</label>
                        <Input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Küçə, bina nömrəsi..."
                            className={inp}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 3: Availability */}
            <Card>
                <CardHeader><CardTitle>3. Mövcudluq statusu</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {AVAIL_STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setAvailStatus(opt.value)}
                            className={`w-full text-left rounded-xl border-2 px-5 py-4 transition-all ${
                                availStatus === opt.value
                                    ? 'border-gold bg-gold/5'
                                    : 'border-border hover:border-gold/40'
                            }`}
                        >
                            <div className="font-semibold text-text">{opt.label}</div>
                            <div className="text-sm text-muted mt-0.5">{opt.desc}</div>
                        </button>
                    ))}

                    {availStatus === 'BOSHALIR' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                            <div>
                                <label className="text-sm text-muted font-medium block mb-1">Müqavilə başlanğıcı</label>
                                <Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm text-muted font-medium block mb-1">Müqavilə sonu</label>
                                <Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm text-muted font-medium block mb-1">Gözlənilən boşalma</label>
                                <Input type="date" value={expectedFreeDate} onChange={(e) => setExpectedFreeDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {availStatus === 'INSAAT' && (
                        <div className="mt-2">
                            <label className="text-sm text-muted font-medium block mb-1">Gözlənilən hazır olma tarixi</label>
                            <Input type="date" value={expectedFreeDate} onChange={(e) => setExpectedFreeDate(e.target.value)} className="max-w-xs" />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 4: Price */}
            <Card>
                <CardHeader><CardTitle>4. Qiymət</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-muted font-medium block mb-1">Minimum qiymət (AZN/ay) *</label>
                        <div className="relative max-w-xs">
                            <Input
                                type="number"
                                value={basePrice}
                                onChange={(e) => setBasePrice(e.target.value)}
                                placeholder="800"
                                className="text-2xl font-bold pr-20"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">AZN/ay</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 text-sm text-text">
                        <span className="text-gold mt-0.5 shrink-0">ℹ️</span>
                        <span>Bu qiymət icarəçilərə görünməyəcək. Növbəyə girmək üçün minimum məbləğ kimi istifadə ediləcək.</span>
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 5: Amenities */}
            <Card>
                <CardHeader><CardTitle>5. Xüsusiyyətlər</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {AMENITIES.map((a) => (
                            <button
                                key={a.key}
                                onClick={() => toggleAmenity(a.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                    amenities.includes(a.key)
                                        ? 'border-gold bg-gold/10 text-gold'
                                        : 'border-border text-muted hover:border-gold/40'
                                }`}
                            >
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    amenities.includes(a.key) ? 'border-gold bg-gold' : 'border-muted'
                                }`}>
                                    {amenities.includes(a.key) && (
                                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-bg"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                                    )}
                                </span>
                                {a.label}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* SECTION 6: Photos */}
            <Card>
                <CardHeader><CardTitle>6. Şəkillər</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-gold/60 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                        <p className="text-sm text-muted">
                            Şəkilləri buraya sürükləyin və ya <span className="text-gold font-medium">seçin</span>
                        </p>
                        <p className="text-xs text-muted mt-1">JPG, PNG, WEBP — maks. 10 şəkil</p>
                        {uploading && <p className="text-xs text-gold mt-2 animate-pulse">Yüklənir...</p>}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                    />

                    {photos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {photos.map((url, i) => (
                                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-surface">
                                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {photos.length < 10 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-gold/60 transition-colors"
                                >
                                    <ImageIcon className="w-5 h-5 text-muted" />
                                    <span className="text-xs text-muted">Əlavə et</span>
                                </button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECTION 7: Publisher */}
            <Card>
                <CardHeader><CardTitle>7. Elan verən</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-sm text-muted">
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                            {user?.name?.slice(0, 2).toUpperCase() ?? '??'}
                        </div>
                        <div>
                            <div className="font-medium text-text">{user?.name ?? '—'}</div>
                            <div className="text-xs">{user?.role ?? '—'}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Footer actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-bg border-t border-border p-4 flex items-center justify-between gap-4 z-20">
                <Button variant="ghost" onClick={() => navigate(-1)}>
                    ← Geri
                </Button>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleDraft}
                        isLoading={draftMutation.isPending}
                        disabled={draftMutation.isPending || publishMutation.isPending}
                        className="px-5"
                    >
                        Qaralama saxla
                    </Button>
                    <Button
                        onClick={handlePublish}
                        isLoading={publishMutation.isPending}
                        disabled={draftMutation.isPending || publishMutation.isPending}
                        className="px-6"
                    >
                        Dərc et
                    </Button>
                </div>
            </div>
        </div>
    );
}
