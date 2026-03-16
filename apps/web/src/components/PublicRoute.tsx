import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

/**
 * Wraps public routes (/, /login, /register).
 * If the user is already authenticated, redirect them based on role + subscription.
 */
export function PublicRoute() {
    const { isAuthenticated, user } = useAuthStore();

    if (isAuthenticated && user) {
        if (user.role === 'SUPERADMIN') {
            return <Navigate to="/admin" replace />;
        }
        // ICARECI (tenant) always goes to /kabinet — no subscription check needed,
        // as the tenant cabinet is free and entirely separate from the ERP.
        if (user.role === 'ICARECI') {
            return <Navigate to="/kabinet" replace />;
        }
        if (user.organization?.subscriptionStatus === 'ACTIVE') {
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/dashboard/elanlar" replace />;
    }

    return <Outlet />;
}
