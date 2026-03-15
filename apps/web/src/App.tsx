import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageSkeleton } from './components/ui/PageSkeleton';
import { SupportChat } from './components/SupportChat';
import { PublicRoute } from './components/PublicRoute';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { useAuthStore } from './store/auth';
import { useToastStore } from './store/toast';

const Landing = React.lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Portal = React.lazy(() => import('./pages/Portal').then(m => ({ default: m.Portal })));
const ListingDetail = React.lazy(() => import('./pages/ListingDetail').then(m => ({ default: m.ListingDetail })));
const MapPage = React.lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const Kabinet = React.lazy(() => import('./pages/Kabinet').then(m => ({ default: m.Kabinet })));
const CreateListing = React.lazy(() => import('./pages/CreateListing').then(m => ({ default: m.CreateListing })));
const SearchResults = React.lazy(() => import('./pages/SearchResults').then(m => ({ default: m.SearchResults })));
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
const SanadUstasi = React.lazy(() => import('./pages/SanadUstasi').then(m => ({ default: m.SanadUstasi })));
const Users = React.lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Billing = React.lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const NotFound = React.lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Suspended = React.lazy(() => import('./pages/Suspended').then(m => ({ default: m.Suspended })));
const DashboardElanlar = React.lazy(() => import('./pages/DashboardElanlar').then(m => ({ default: m.DashboardElanlar })));
const CreateDashboardListing = React.lazy(() => import('./pages/CreateDashboardListing').then(m => ({ default: m.CreateDashboardListing })));

// Superadmin Pages
const AdminOrganizations = React.lazy(() => import('./pages/admin/AdminOrganizations').then(m => ({ default: m.AdminOrganizations })));
const SuperAdminDashboard = React.lazy(() => import('./pages/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const AdminOrganizationDetail = React.lazy(() => import('./pages/admin/AdminOrganizationDetail').then(m => ({ default: m.AdminOrganizationDetail })));
const AdminListings = React.lazy(() => import('./pages/admin/AdminListings').then(m => ({ default: m.AdminListings })));

/**
 * Guards ERP routes (contracts, properties, tenants, income, expenses, users, settings).
 * Non-subscribers are redirected to /dashboard/elanlar with a toast message.
 */
function SubscriptionRoute() {
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const hasSubscription = user?.organization?.subscriptionStatus === 'ACTIVE';
    // FIX 4: ref prevents double-fire in React StrictMode
    const toastFiredRef = React.useRef(false);

    React.useEffect(() => {
        if (!hasSubscription && !toastFiredRef.current) {
            toastFiredRef.current = true;
            addToast({ type: 'error', message: 'Bu bölmə abunəlik tələb edir.' });
        }
    }, [hasSubscription, addToast]);

    if (!hasSubscription) {
        return <Navigate to="/dashboard/elanlar" replace />;
    }

    return <Outlet />;
}

export default function App() {
    return (
        <GlobalErrorBoundary>
            <Router>
                <SupportChat />
                <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                        {/* Portal — main marketplace page */}
                        <Route path="/" element={<Portal />} />
                        {/* Landing / About page */}
                        <Route path="/haqqinda" element={<Landing />} />
                        {/* Public portal routes */}
                        <Route path="/elan/:id" element={<ListingDetail />} />
                        <Route path="/xerite" element={<MapPage />} />
                        <Route path="/kabinet" element={<Kabinet />} />
                        <Route path="/elan-elave-et" element={<CreateListing />} />
                        <Route path="/elanlar" element={<SearchResults />} />

                        {/* Public Routes — redirect to /dashboard if already logged in */}
                        <Route element={<PublicRoute />}>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                        </Route>

                        {/* Always-public auth pages (password reset links, etc.) */}
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        {/* Protected Routes directly hitting the AppLayout */}
                        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'AGENT', 'AGENTLIK', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                            <Route path="/suspended" element={<Suspended />} />

                            {/* Full Screen AI Chat Interface */}
                            <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                <Route path="/sanad-ustasi" element={<SanadUstasi />} />
                            </Route>

                            <Route element={<AppLayout />}>
                                <Route path="/profile" element={<Profile />} />

                                {/* Subscription-gated ERP routes */}
                                <Route element={<SubscriptionRoute />}>
                                    <Route path="/dashboard" element={<Dashboard />} />

                                    <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                        <Route path="/contracts" element={<Contracts />} />
                                        <Route path="/contracts/:id" element={<ContractDetail />} />
                                        <Route path="/properties" element={<Properties />} />
                                        <Route path="/properties/:id" element={<PropertyDetail />} />
                                        <Route path="/tenants" element={<Tenants />} />
                                        <Route path="/tenants/new" element={<TenantForm />} />
                                        <Route path="/tenants/:id" element={<TenantDetail />} />
                                        <Route path="/tenants/:id/edit" element={<TenantForm />} />
                                    </Route>

                                    <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'CASHIER']} />}>
                                        <Route path="/income" element={<Income />} />
                                        <Route path="/expenses" element={<Expenses />} />
                                    </Route>

                                    {/* OWNER & MANAGER only routes */}
                                    <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER']} />}>
                                        <Route path="/users" element={<Users />} />
                                        <Route path="/settings" element={<Settings />} />
                                        <Route path="/settings/billing" element={<Billing />} />
                                    </Route>
                                </Route>

                                {/* Listing management — accessible without subscription */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'AGENT', 'AGENTLIK', 'MANAGER']} />}>
                                    <Route path="/dashboard/elanlar" element={<DashboardElanlar />} />
                                    <Route path="/dashboard/elanlar/yeni" element={<CreateDashboardListing />} />
                                </Route>

                            </Route>
                        </Route>

                        {/* SUPERADMIN Admin Layout */}
                        <Route element={<AdminLayout />}>
                            <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                                <Route path="/admin" element={<SuperAdminDashboard />} />
                                <Route path="/admin/users" element={<AdminOrganizations />} />
                                <Route path="/admin/organizations/:id" element={<AdminOrganizationDetail />} />
                                <Route path="/admin/elanlar" element={<AdminListings />} />
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
