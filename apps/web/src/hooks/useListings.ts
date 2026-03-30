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
    buildingType?: string;
    renovation?: string;
    metroStation?: string;
    landmark?: string;
    createdAt: string;
    queueCount: number;
    highestOffer?: number;
    heatLevel: 'AZ' | 'ORTA' | 'YUKSEK';
    isFavorited?: boolean;
}

export interface ListingFilters {
    search: string;
    type: string;
    buildingType: string;
    renovation: string;
    district: string;
    districts: string[];       // multi-select districts
    rooms: string;
    areaMin: string;
    areaMax: string;
    priceMin: string;
    priceMax: string;
    floorMin: string;
    floorMax: string;
    notFirstFloor: boolean;
    notTopFloor: boolean;
    freeDate: string;
    availStatus: string;
    amenities: string[];
    metro: string;
    landmark: string;
    sort: string;
}

const DEFAULT_FILTERS: ListingFilters = {
    search: '',
    type: '',
    buildingType: '',
    renovation: '',
    district: '',
    districts: [],
    rooms: '',
    areaMin: '',
    areaMax: '',
    priceMin: '',
    priceMax: '',
    floorMin: '',
    floorMax: '',
    notFirstFloor: false,
    notTopFloor: false,
    freeDate: '',
    availStatus: '',
    amenities: [],
    metro: '',
    landmark: '',
    sort: 'default',
};

const LIMIT = 12;

function buildParams(filters: ListingFilters, page: number): Record<string, string> {
    const p: Record<string, string> = { page: String(page), limit: String(LIMIT) };
    if (filters.search) p['search'] = filters.search;
    if (filters.type) p['type'] = filters.type;
    if (filters.buildingType) p['buildingType'] = filters.buildingType;
    if (filters.renovation) p['renovation'] = filters.renovation;
    // districts multi-select takes priority over single district
    if (filters.districts.length > 0) {
        p['districts'] = filters.districts.join(',');
    } else if (filters.district) {
        p['district'] = filters.district;
    }
    if (filters.rooms) p['rooms'] = filters.rooms;
    if (filters.areaMin) p['areaMin'] = filters.areaMin;
    if (filters.areaMax) p['areaMax'] = filters.areaMax;
    if (filters.priceMin) p['priceMin'] = filters.priceMin;
    if (filters.priceMax) p['priceMax'] = filters.priceMax;
    if (filters.floorMin) p['floorMin'] = filters.floorMin;
    if (filters.floorMax) p['floorMax'] = filters.floorMax;
    if (filters.notFirstFloor) p['notFirstFloor'] = 'true';
    if (filters.notTopFloor) p['notTopFloor'] = 'true';
    if (filters.freeDate) p['freeDate'] = filters.freeDate;
    if (filters.availStatus) p['availStatus'] = filters.availStatus;
    if (filters.amenities.length) p['amenities'] = filters.amenities.join(',');
    if (filters.metro) p['metro'] = filters.metro;
    if (filters.landmark) p['landmark'] = filters.landmark;
    if (filters.sort && filters.sort !== 'default') p['sort'] = filters.sort;
    return p;
}

function readFromUrl(params: URLSearchParams): ListingFilters & { page: number } {
    const amenitiesStr = params.get('amenities') || '';
    const districtsStr = params.get('districts') || '';
    return {
        search: params.get('search') || '',
        type: params.get('type') || '',
        buildingType: params.get('buildingType') || '',
        renovation: params.get('renovation') || '',
        district: params.get('district') || '',
        districts: districtsStr ? districtsStr.split(',') : [],
        rooms: params.get('rooms') || '',
        areaMin: params.get('areaMin') || '',
        areaMax: params.get('areaMax') || '',
        priceMin: params.get('priceMin') || '',
        priceMax: params.get('priceMax') || '',
        floorMin: params.get('floorMin') || '',
        floorMax: params.get('floorMax') || '',
        notFirstFloor: params.get('notFirstFloor') === 'true',
        notTopFloor: params.get('notTopFloor') === 'true',
        freeDate: params.get('freeDate') || '',
        availStatus: params.get('availStatus') || '',
        amenities: amenitiesStr ? amenitiesStr.split(',') : [],
        metro: params.get('metro') || '',
        landmark: params.get('landmark') || '',
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
        filters.type, filters.buildingType, filters.renovation,
        filters.district, filters.districts.join(','),
        filters.rooms, filters.areaMin, filters.areaMax,
        filters.priceMin, filters.priceMax,
        filters.floorMin, filters.floorMax,
        filters.notFirstFloor, filters.notTopFloor,
        filters.freeDate, filters.availStatus,
        filters.amenities.join(','),
        filters.metro, filters.landmark,
        filters.sort, debouncedSearch, page,
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

    const updateFilter = useCallback((key: keyof ListingFilters, value: string | string[] | boolean) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const updateFilters = useCallback((updates: Partial<ListingFilters>) => {
        setFilters(prev => ({ ...prev, ...updates }));
        setPage(1);
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
        setPage(1);
    }, []);

    const hasActiveFilters = filters.type || filters.buildingType || filters.renovation ||
        filters.district || filters.districts.length > 0 || filters.rooms ||
        filters.areaMin || filters.areaMax || filters.priceMin || filters.priceMax ||
        filters.floorMin || filters.floorMax || filters.notFirstFloor || filters.notTopFloor ||
        filters.freeDate || filters.availStatus || filters.amenities.length > 0 ||
        filters.metro || filters.landmark || filters.search;

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
        updateFilters,
        resetFilters,
        hasActiveFilters: Boolean(hasActiveFilters),
    };
}
