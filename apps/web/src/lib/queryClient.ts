/**
 * Singleton QueryClient — shared across the app so the auth store
 * can call queryClient.clear() on logout to wipe all cached data.
 *
 * Import from here instead of creating a new QueryClient per file.
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});
