import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Building, Plus, MapPin, Maximize } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import SimpleMap from '@/components/SimpleMap';

const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('az-AZ', {
        style: 'currency',
        currency: 'AZN',
        maximumFractionDigits: 0,
    }).format(amount);
};

export function Properties() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: propertiesData, isLoading: propsLoading, isError: propsError, refetch } = useQuery({
        queryKey: ['properties', debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            const res = await api.get(`/properties?${params.toString()}`);
            console.log('Properties API response:', res.data);
            return res.data.data || res.data;
        },
    });

    const { data: contractsData, isLoading: contractsLoading } = useQuery({
        queryKey: ['contracts-for-properties'],
        queryFn: async () => {
            // Fetch all active contracts to map debt and tenant names to properties
            const res = await api.get(`/contracts?status=ACTIVE&limit=100`);
            console.log('Contracts API response:', res.data);
            return res.data.data || res.data;
        },
    });

    const isLoading = propsLoading || contractsLoading;
    const isError = propsError;

    const properties = Array.isArray(propertiesData) ? propertiesData : (propertiesData?.data || []);
    const activeContracts = Array.isArray(contractsData) ? contractsData : (contractsData?.data || []);

    const canAddProperty = user?.role === 'OWNER' || user?.role === 'STAFF';

    return (
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto pb-24">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-extrabold font-heading text-text flex items-center gap-2">
                    <Building className="w-8 h-8 text-gold" />
                    Obyektlər
                </h1>
                {canAddProperty && (
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Obyekt
                    </Button>
                )}
            </div>

            {/* Modal placeholder */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Obyekt">
                <div className="p-4 text-center text-muted">Tezliklə əlavə ediləcək...</div>
            </Modal>

            {/* Map Section */}
            <div className="w-full mb-6 rounded-xl overflow-hidden border border-border shadow-sm">
                <SimpleMap
                    properties={properties.map((p: any) => {
                        const contract = activeContracts.find((c: any) => c.propertyId === p.id);
                        let status: 'active' | 'expiring' | 'expired' = 'expired';
                        if (contract) {
                            const days = Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86_400_000);
                            status = days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'active';
                        }
                        return {
                            id: p.id,
                            name: p.name,
                            address: p.address,
                            tenantName: contract?.tenant?.fullName,
                            rent: contract ? Number(contract.monthlyRent) : undefined,
                            status,
                        };
                    })}
                    onPropertyClick={(id) => navigate(`/properties/${id}`)}
                />
            </div>

            {/* Filters */}
            <Card variant="elevated">
                <CardContent className="p-4">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            placeholder="Obyekt adı, nömrəsi və ya ünvanı..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-48 rounded-xl bg-surface animate-pulse" />
                    ))}
                </div>
            ) : isError ? (
                <div className="text-center py-12 text-red">
                    <p>Məlumatları yükləmək mümkün olmadı.</p>
                    <Button variant="outline" onClick={() => refetch()} className="mt-4">Yenidən cəhd et</Button>
                </div>
            ) : properties.length === 0 ? (
                <div className="text-center py-16 text-muted">
                    <Building className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Obyekt tapılmadı.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property: any) => {
                        // Find active contract for this property
                        const contract = activeContracts.find((c: any) => c.propertyId === property.id);

                        return (
                            <Card
                                key={property.id}
                                variant="elevated"
                                className="cursor-pointer hover:border-gold/50 transition-colors flex flex-col h-full"
                                onClick={() => navigate(`/properties/${property.id}`)}
                            >
                                <CardContent className="p-5 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-text leading-tight group-hover:text-gold transition-colors">
                                                {property.name}
                                            </h3>
                                            <p className="text-sm text-muted mt-1">Nömrə: {property.number}</p>
                                        </div>
                                        {contract ? (
                                            contract.debt > 0 ? (
                                                <Badge variant="borclu">Borc: {formatMoney(contract.debt)}</Badge>
                                            ) : (
                                                <Badge variant="aktiv">Ödənilib</Badge>
                                            )
                                        ) : (
                                            <Badge variant="arxiv">Boş</Badge>
                                        )}
                                    </div>

                                    <div className="space-y-2 mt-auto">
                                        <div className="flex items-center text-sm text-text">
                                            <MapPin className="w-4 h-4 text-muted mr-2 shrink-0" />
                                            <span className="truncate">{property.address || '-'}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-text">
                                            <Maximize className="w-4 h-4 text-muted mr-2 shrink-0" />
                                            <span>{property.area} m²</span>
                                        </div>
                                        <div className="pt-4 mt-4 border-t border-border flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-muted">İcarəçi</p>
                                                <p className="font-medium text-text truncate max-w-[150px]">
                                                    {contract ? contract.tenant.fullName : '-'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted">Aylıq İcarə</p>
                                                <p className="font-bold text-gold">
                                                    {contract ? formatMoney(contract.monthlyRent) : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
