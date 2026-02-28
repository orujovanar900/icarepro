import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

/**
 * Wraps public routes (/, /login, /register).
 * If the user is already authenticated, redirect them to /dashboard.
 */
export function PublicRoute() {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}
