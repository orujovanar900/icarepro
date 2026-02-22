import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageSkeleton } from './components/ui/PageSkeleton';

// Pages
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Contracts = React.lazy(() => import('./pages/Contracts').then(m => ({ default: m.Contracts })));
const ContractDetail = React.lazy(() => import('./pages/ContractDetail').then(m => ({ default: m.ContractDetail })));
const Properties = React.lazy(() => import('./pages/Properties').then(m => ({ default: m.Properties })));
const Income = React.lazy(() => import('./pages/Income').then(m => ({ default: m.Income })));
const Expenses = React.lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Tenants = React.lazy(() => import('./pages/Tenants').then(m => ({ default: m.Tenants })));
const TenantDetail = React.lazy(() => import('./pages/TenantDetail').then(m => ({ default: m.TenantDetail })));
const Documents = React.lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Users = React.lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

export default function App() {
    return (
        <Router>
            <Suspense fallback={<PageSkeleton />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes directly hitting the AppLayout */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/contracts" element={<Contracts />} />
                            <Route path="/contracts/:id" element={<ContractDetail />} />
                            <Route path="/properties" element={<Properties />} />
                            <Route path="/income" element={<Income />} />
                            <Route path="/tenants" element={<Tenants />} />
                            <Route path="/tenants/:id" element={<TenantDetail />} />
                            <Route path="/documents" element={<Documents />} />

                            {/* OWNER only routes */}
                            <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
                                <Route path="/expenses" element={<Expenses />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/settings" element={<Settings />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </Router>
    );
}
