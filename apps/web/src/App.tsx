import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageSkeleton } from './components/ui/PageSkeleton';
import { SupportChat } from './components/SupportChat';
import { PublicRoute } from './components/PublicRoute';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

const Landing = React.lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = React.lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Contracts = React.lazy(() => import('./pages/Contracts').then(m => ({ default: m.Contracts })));
const ContractDetail = React.lazy(() => import('./pages/ContractDetail').then(m => ({ default: m.ContractDetail })));
const Properties = React.lazy(() => import('./pages/Properties').then(m => ({ default: m.Properties })));
const PropertyDetail = React.lazy(() => import('./pages/PropertyDetail').then(m => ({ default: m.PropertyDetail })));
const Income = React.lazy(() => import('./pages/Income').then(m => ({ default: m.Income })));
const Expenses = React.lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const Tenants = React.lazy(() => import('./pages/Tenants').then(m => ({ default: m.Tenants })));
const TenantDetail = React.lazy(() => import('./pages/TenantDetail').then(m => ({ default: m.TenantDetail })));
const TenantForm = React.lazy(() => import('./pages/TenantForm').then(m => ({ default: m.TenantForm })));
const Documents = React.lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const SanadUstasi = React.lazy(() => import('./pages/SanadUstasi').then(m => ({ default: m.SanadUstasi })));
const Users = React.lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Suspended = React.lazy(() => import('./pages/Suspended').then(m => ({ default: m.Suspended })));

// Superadmin Pages
const AdminOrganizations = React.lazy(() => import('./pages/admin/AdminOrganizations').then(m => ({ default: m.AdminOrganizations })));
const AdminStats = React.lazy(() => import('./pages/admin/AdminStats').then(m => ({ default: m.AdminStats })));
const AdminOrganizationDetail = React.lazy(() => import('./pages/admin/AdminOrganizationDetail').then(m => ({ default: m.AdminOrganizationDetail })));

export default function App() {
    return (
        <GlobalErrorBoundary>
            <Router>
                <SupportChat />
                <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                        {/* Always-public landing page */}
                        <Route path="/" element={<Landing />} />

                        {/* Public Routes — redirect to /dashboard if already logged in */}
                        <Route element={<PublicRoute />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                        </Route>

                        {/* Always-public auth pages (password reset links, etc.) */}
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* Protected Routes directly hitting the AppLayout */}
                        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                            <Route path="/suspended" element={<Suspended />} />

                            {/* Full Screen AI Chat Interface */}
                            <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                <Route path="/sanad-ustasi" element={<SanadUstasi />} />
                            </Route>

                            <Route element={<AppLayout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/profile" element={<Profile />} />

                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                    <Route path="/contracts" element={<Contracts />} />
                                    <Route path="/contracts/:id" element={<ContractDetail />} />
                                    <Route path="/properties" element={<Properties />} />
                                    <Route path="/properties/:id" element={<PropertyDetail />} />
                                    <Route path="/tenants" element={<Tenants />} />
                                    <Route path="/tenants/new" element={<TenantForm />} />
                                    <Route path="/tenants/:id" element={<TenantDetail />} />
                                    <Route path="/tenants/:id/edit" element={<TenantForm />} />
                                    <Route path="/documents" element={<Documents />} />
                                </Route>

                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'CASHIER']} />}>
                                    <Route path="/income" element={<Income />} />
                                    <Route path="/expenses" element={<Expenses />} />
                                </Route>

                                {/* OWNER & MANAGER only routes */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER']} />}>
                                    <Route path="/users" element={<Users />} />
                                    <Route path="/settings" element={<Settings />} />
                                </Route>

                                {/* SUPERADMIN ONLY routes */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                                    <Route path="/admin/stats" element={<AdminStats />} />
                                    <Route path="/admin/users" element={<AdminOrganizations />} />
                                    <Route path="/admin/organizations/:id" element={<AdminOrganizationDetail />} />
                                </Route>
                            </Route>
                        </Route>

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </Router>
        </GlobalErrorBoundary>
    );
}
