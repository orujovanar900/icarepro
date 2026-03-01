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
        return Promise.reject(error);
    }
);
