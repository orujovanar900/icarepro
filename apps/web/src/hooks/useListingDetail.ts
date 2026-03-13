import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ListingDetail {
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
    availStatus: string;
    contractStartDate?: string;
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

export interface QueueSummary {
    queueCount: number;
    highestOffer?: number;
    heatLevel: 'AZ' | 'ORTA' | 'YUKSEK';
    basePrice?: number;
}

export interface QueueEntry {
    position: number;
    priceOffer: number;
}

export interface MyQueueEntry {
    id: string;
    position: number;
    priceOffer: number;
    fullName: string;
    phone: string;
    email?: string;
    desiredMonths?: number;
}

export interface QueueFull {
    basePrice: number;
    entries: QueueEntry[];
    myEntry: MyQueueEntry;
}

export interface JoinQueuePayload {
    tenantType: 'FIZIKI' | 'KOMMERSIYA';
    fullName: string;
    phone: string;
    email?: string;
    employStatus?: string;
    companyName?: string;
    voen?: string;
    activityType?: string;
    contactPerson?: string;
    persons?: number;
    hasPets?: boolean;
    isSmoker?: boolean;
    desiredMonths?: number;
    priceOffer?: number;
}

export interface JoinQueueResult {
    position: number;
    queueCount: number;
    entryId: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useListingDetail(id: string | undefined) {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // 1. Listing detail
    const listingQuery = useQuery({
        queryKey: ['listing', id],
        queryFn: async () => {
            const res = await api.get(`/listings/${id}`);
            return res.data?.data as ListingDetail;
        },
        enabled: Boolean(id),
        staleTime: 60_000,
    });

    // 2. Queue summary (polls every 30s)
    const queueSummaryQuery = useQuery({
        queryKey: ['listing-queue-summary', id],
        queryFn: async () => {
            const res = await api.get(`/listings/${id}/queue/summary`);
            return res.data?.data as QueueSummary;
        },
        enabled: Boolean(id),
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    // 3. Queue full — only for authenticated users; 403 = not in queue → return null
    const queueFullQuery = useQuery({
        queryKey: ['listing-queue-full', id],
        queryFn: async () => {
            try {
                const res = await api.get(`/listings/${id}/queue/full`);
                return res.data?.data as QueueFull;
            } catch (e: any) {
                const status = e?.response?.status;
                if (status === 403 || status === 401) return null;
                throw e;
            }
        },
        enabled: Boolean(id) && isAuthenticated,
        staleTime: 30_000,
    });

    // 4. Favorite check
    const favoriteQuery = useQuery({
        queryKey: ['listing-favorite', id],
        queryFn: async () => {
            const res = await api.get('/users/me/favorites');
            const favorites: { id: string }[] = res.data?.data ?? [];
            return favorites.some((f) => f.id === id);
        },
        enabled: Boolean(id) && isAuthenticated,
        staleTime: 60_000,
    });

    // ─── Mutations ─────────────────────────────────────────────────────────────

    const joinQueueMutation = useMutation({
        mutationFn: async (payload: JoinQueuePayload) => {
            const res = await api.post(`/listings/${id}/queue`, payload);
            return res.data?.data as JoinQueueResult;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listing-queue-full', id] });
            queryClient.invalidateQueries({ queryKey: ['listing-queue-summary', id] });
            queryClient.invalidateQueries({ queryKey: ['listing', id] });
        },
    });

    const updateOfferMutation = useMutation({
        mutationFn: async ({ entryId, priceOffer }: { entryId: string; priceOffer: number }) => {
            const res = await api.put(`/queue/${entryId}`, { priceOffer });
            return res.data?.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listing-queue-full', id] });
            queryClient.invalidateQueries({ queryKey: ['listing-queue-summary', id] });
        },
    });

    const withdrawQueueMutation = useMutation({
        mutationFn: async (entryId: string) => {
            await api.delete(`/queue/${entryId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listing-queue-full', id] });
            queryClient.invalidateQueries({ queryKey: ['listing-queue-summary', id] });
            queryClient.invalidateQueries({ queryKey: ['listing', id] });
        },
    });

    const toggleFavoriteMutation = useMutation({
        mutationFn: async () => {
            await api.post(`/listings/${id}/favorite`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['listing-favorite', id] });
        },
    });

    // ─── Auth-gated favorite handler ───────────────────────────────────────────

    function handleFavorite() {
        if (!isAuthenticated) {
            sessionStorage.setItem('portalIntent', JSON.stringify({ action: 'favorite', listingId: id }));
            navigate('/login');
            return;
        }
        toggleFavoriteMutation.mutate();
    }

    // ─── Derived state ─────────────────────────────────────────────────────────

    const isInQueue =
        isAuthenticated &&
        queueFullQuery.data !== null &&
        queueFullQuery.data !== undefined &&
        queueFullQuery.data?.myEntry !== undefined;

    const isFavorited = favoriteQuery.data ?? false;

    return {
        listing: listingQuery.data,
        isLoading: listingQuery.isLoading,
        isError: listingQuery.isError,

        queueSummary: queueSummaryQuery.data,
        queueFull: queueFullQuery.data,
        isInQueue,

        isFavorited,

        joinQueue: joinQueueMutation,
        updateOffer: updateOfferMutation,
        withdrawQueue: withdrawQueueMutation,
        handleFavorite,
        isTogglingFavorite: toggleFavoriteMutation.isPending,
    };
}
