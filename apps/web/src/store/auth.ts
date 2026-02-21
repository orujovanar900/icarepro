import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'OWNER' | 'STAFF' | 'TENANT';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (data: { user: User; token: string }) => void;
    logout: () => void;
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
            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: 'auth-storage', // name of the item in the storage (must be unique)
        }
    )
);
