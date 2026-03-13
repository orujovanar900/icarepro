import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ListingCardData {
    id: string;
    title: string;
    description?: string;
    type: string;
    district?: string;
    address: string;
    floor?: number;
    totalFloors?: number;
    area?: number;
    rooms?: number;
    basePrice?: number;
    availStatus: string;
    contractEndDate?: string;
    expectedFreeDate?: string;
    publisherType?: string;
    publisherName?: string;
    isVip: boolean;
    isPushed: boolean;
    isPanorama: boolean;
    amenities: string[];
    photos: string[];
    lat?: number;
    lng?: number;
    createdAt: string;
    queueCount: number;
    highestOffer?: number;
    heatLevel: 'AZ' | 'ORTA' | 'YUKSEK';
}

export interface ListingFilters {
    search: string;
    type: string;
    buildingType: string;
    district: string;
    rooms: string;
    areaMin: string;
    areaMax: string;
    priceMin: string;
    priceMax: string;
    freeDate: string;
    availStatus: string;
    amenities: string[];
    sort: string;
}

const DEFAULT_FILTERS: ListingFilters = {
    search: '',
    type: '',
    buildingType: '',
    district: '',
    rooms: '',
    areaMin: '',
    areaMax: '',
    priceMin: '',
    priceMax: '',
    freeDate: '',
    availStatus: '',
    amenities: [],
    sort: 'default',
};

const LIMIT = 12;

function buildParams(filters: ListingFilters, page: number): Record<string, string> {
    const p: Record<string, string> = { page: String(page), limit: String(LIMIT) };
    if (filters.search) p['search'] = filters.search;
    if (filters.type) p['type'] = filters.type;
    if (filters.buildingType) p['buildingType'] = filters.buildingType;
    if (filters.district) p['district'] = filters.district;
    if (filters.rooms) p['rooms'] = filters.rooms;
    if (filters.areaMin) p['areaMin'] = filters.areaMin;
    if (filters.areaMax) p['areaMax'] = filters.areaMax;
    if (filters.priceMin) p['priceMin'] = filters.priceMin;
    if (filters.priceMax) p['priceMax'] = filters.priceMax;
    if (filters.freeDate) p['freeDate'] = filters.freeDate;
    if (filters.availStatus) p['availStatus'] = filters.availStatus;
    if (filters.amenities.length) p['amenities'] = filters.amenities.join(',');
    if (filters.sort && filters.sort !== 'default') p['sort'] = filters.sort;
    return p;
}

function readFromUrl(params: URLSearchParams): ListingFilters & { page: number } {
    const amenitiesStr = params.get('amenities') || '';
    return {
        search: params.get('search') || '',
        type: params.get('type') || '',
        buildingType: params.get('buildingType') || '',
        district: params.get('district') || '',
        rooms: params.get('rooms') || '',
        areaMin: params.get('areaMin') || '',
        areaMax: params.get('areaMax') || '',
        priceMin: params.get('priceMin') || '',
        priceMax: params.get('priceMax') || '',
        freeDate: params.get('freeDate') || '',
        availStatus: params.get('availStatus') || '',
        amenities: amenitiesStr ? amenitiesStr.split(',') : [],
        sort: params.get('sort') || 'default',
        page: Number(params.get('page') || 1),
    };
}

export function useListings() {
    const [searchParams, setSearchParams] = useSearchParams();
    const parsed = readFromUrl(searchParams);
    const { page: urlPage, ...urlFilters } = parsed;

    const [filters, setFilters] = useState<ListingFilters>(urlFilters);
    const [page, setPage] = useState(urlPage);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(filters.search), 350);
        return () => clearTimeout(searchTimer.current);
    }, [filters.search]);

    // Sync filters + page → URL
    useEffect(() => {
        const params = buildParams({ ...filters, search: debouncedSearch }, page);
        setSearchParams(params, { replace: true });
    }, [
        filters.type, filters.buildingType, filters.district, filters.rooms,
        filters.areaMin, filters.areaMax, filters.priceMin, filters.priceMax,
        filters.freeDate, filters.availStatus, filters.sort, debouncedSearch, page,
    ]); // eslint-disable-line

    const queryParams = buildParams({ ...filters, search: debouncedSearch }, page);
    const queryString = new URLSearchParams(queryParams).toString();

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['listings', queryString],
        queryFn: async () => {
            const res = await api.get(`/listings?${queryString}`);
            return res.data as { success: boolean; data: ListingCardData[]; meta: { total: number; page: number; limit: number; pages: number } };
        },
        staleTime: 60_000,
        placeholderData: (prev) => prev,
    });

    const updateFilter = useCallback((key: keyof ListingFilters, value: string | string[]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    }, []);

    const hasActiveFilters = filters.type || filters.buildingType || filters.district || filters.rooms ||
        filters.areaMin || filters.areaMax || filters.priceMin || filters.priceMax ||
        filters.freeDate || filters.availStatus || filters.amenities.length > 0 || filters.search;

    return {
        listings: data?.data ?? [],
        total: data?.meta?.total ?? 0,
        totalPages: data?.meta?.pages ?? 1,
        isLoading,
        isFetching,
        filters,
        page,
        setPage,
        updateFilter,
        resetFilters,
        hasActiveFilters: Boolean(hasActiveFilters),
    };
}
