import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK' && !error.response) {
            useToastStore.getState().addToast({
                type: 'error',
                message: 'Bağlantı xətası. İnternet əlaqənizi yoxlayın.'
            });
        }
        if (error.response?.status === 401) {
            // Clear auth state and redirect to login
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }

        if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_SUSPENDED') {
            const currentPath = window.location.pathname;
            if (!currentPath.includes('/settings') && !currentPath.includes('/billing') && !currentPath.includes('/suspended')) {
                window.location.href = '/suspended';
            }
        }

        return Promise.reject(error);
    }
);
