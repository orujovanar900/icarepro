import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'ADMINISTRATOR' | 'TENANT';

interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    organizationId: string;
    telegramChatId?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (data: { user: User; token: string }) => void;
    logout: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (data) =>
                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                }),
            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
                sessionStorage.removeItem('auth-session-only');
            },
            setUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => ({
                getItem: (name) => {
                    return localStorage.getItem(name) || sessionStorage.getItem(name);
                },
                setItem: (name, value) => {
                    if (sessionStorage.getItem('auth-session-only') === 'true') {
                        sessionStorage.setItem(name, value);
                        localStorage.removeItem(name);
                    } else {
                        localStorage.setItem(name, value);
                        sessionStorage.removeItem(name);
                    }
                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                    sessionStorage.removeItem(name);
                },
            }))
        }
    )
);
