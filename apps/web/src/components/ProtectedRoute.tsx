import * as React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

interface ProtectedRouteProps {
    allowedRoles?: ('SUPERADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' | 'ACCOUNTANT' | 'ADMINISTRATOR' | 'TENANT')[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-bg text-text">
                <h1 className="text-6xl font-bold font-heading text-red">403</h1>
                <h2 className="mt-4 text-2xl font-semibold">Access Denied</h2>
                <p className="mt-2 text-muted">You do not have permission to view this page.</p>
            </div>
        );
    }

    return <Outlet />;
}
