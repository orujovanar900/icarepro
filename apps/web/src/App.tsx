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

const TermsPage = React.lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const AdminStats = React.lazy(() => import('./pages/admin/AdminStats').then(m => ({ default: m.AdminStats })));

const Landing = React.lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Portal = React.lazy(() => import('./pages/Portal').then(m => ({ default: m.Portal })));
const ListingDetail = React.lazy(() => import('./pages/ListingDetail').then(m => ({ default: m.ListingDetail })));
const OwnerProfile = React.lazy(() => import('./pages/OwnerProfile').then(m => ({ default: m.OwnerProfile })));
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
const ContractForm = React.lazy(() => import('./pages/ContractForm').then(m => ({ default: m.ContractForm })));
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
const Promotions = React.lazy(() => import('./pages/Promotions').then(m => ({ default: m.Promotions })));

// Superadmin Pages
const AdminOrganizations = React.lazy(() => import('./pages/admin/AdminOrganizations').then(m => ({ default: m.AdminOrganizations })));
const SuperAdminDashboard = React.lazy(() => import('./pages/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const AdminOrganizationDetail = React.lazy(() => import('./pages/admin/AdminOrganizationDetail').then(m => ({ default: m.AdminOrganizationDetail })));
const AdminListings = React.lazy(() => import('./pages/admin/AdminListings').then(m => ({ default: m.AdminListings })));
const AdminStaff = React.lazy(() => import('./pages/admin/AdminStaff').then(m => ({ default: m.AdminStaff })));
const AdminTicker = React.lazy(() => import('./pages/admin/AdminTicker').then(m => ({ default: m.AdminTicker })));
const AuditLogPage = React.lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })));

const PLATFORM_STAFF = ['SUPERADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT'];

/**
 * Guards ERP routes (contracts, properties, tenants, income, expenses, users, settings).
 * Platform staff have no organization — redirect them to /admin immediately.
 * Non-subscribers are redirected to /dashboard/elanlar with a toast message.
 */
function SubscriptionRoute() {
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);

    if (user && PLATFORM_STAFF.includes(user.role)) {
        return <Navigate to="/admin" replace />;
    }

    const hasSubscription = user?.organization?.subscriptionStatus === 'ACTIVE';
    // ref prevents double-fire in React StrictMode
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

/**
 * Guards the AppLayout (all ERP pages).
 * Platform staff hitting any ERP route are redirected to /admin.
 */
function ErpRoute() {
    const { user } = useAuthStore();
    if (user && PLATFORM_STAFF.includes(user.role)) {
        return <Navigate to="/admin" replace />;
    }
    return <Outlet />;
}

/**
 * /kabinet is accessible to unauthenticated users and ICARECI.
 * Platform staff → /admin; any other authenticated role → /dashboard.
 */
function KabinetRoute() {
    const { isAuthenticated, user } = useAuthStore();
    // Platform staff (SUPERADMIN etc.) redirect away; all other roles + guests can access Kabinet
    if (isAuthenticated && user) {
        const PLATFORM_STAFF = ['SUPERADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT'];
        if (PLATFORM_STAFF.includes(user.role)) {
            return <Navigate to="/admin" replace />;
        }
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
                        <Route path="/owner/:ownerId" element={<OwnerProfile />} />
                        <Route path="/xerite" element={<MapPage />} />
                        <Route element={<KabinetRoute />}>
                            <Route path="/kabinet" element={<Kabinet />} />
                        </Route>
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
                        <Route path="/terms" element={<TermsPage />} />

                        {/* Protected Routes directly hitting the AppLayout */}
                        <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'AGENT', 'AGENTLIK', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                            <Route path="/suspended" element={<Suspended />} />

                            {/* Full Screen AI Chat Interface */}
                            <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                <Route path="/sanad-ustasi" element={<SanadUstasi />} />
                            </Route>

                            <Route element={<ErpRoute />}>
                            <Route element={<AppLayout />}>
                                <Route path="/profile" element={<Profile />} />

                                {/* Subscription-gated ERP routes */}
                                <Route element={<SubscriptionRoute />}>
                                    <Route path="/dashboard" element={<Dashboard />} />

                                    <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'ADMINISTRATOR']} />}>
                                        <Route path="/contracts" element={<Contracts />} />
                                        {/* /contracts/yeni MUST be before /contracts/:id to avoid route conflict */}
                                        <Route path="/contracts/yeni" element={<ContractForm />} />
                                        <Route path="/contracts/:id/edit" element={<ContractForm />} />
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

                                    {/* OWNER, MANAGER, AGENTLIK routes */}
                                    <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'MANAGER', 'AGENTLIK']} />}>
                                        <Route path="/users" element={<Users />} />
                                        <Route path="/settings" element={<Settings />} />
                                        <Route path="/settings/billing" element={<Billing />} />
                                    </Route>
                                </Route>

                                {/* Listing management — accessible without subscription */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'OWNER', 'AGENT', 'AGENTLIK', 'MANAGER']} />}>
                                    <Route path="/dashboard/elanlar" element={<DashboardElanlar />} />
                                    <Route path="/dashboard/elanlar/yeni" element={<CreateDashboardListing />} />
                                    <Route path="/promotions" element={<Promotions />} />
                                </Route>

                            </Route>
                            </Route>{/* ErpRoute */}
                        </Route>

                        {/* Admin Layout — all platform staff roles */}
                        <Route element={<AdminLayout />}>
                            <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE', 'CONTENT']} />}>
                                {/* SUPERADMIN only */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                                    <Route path="/admin" element={<SuperAdminDashboard />} />
                                    <Route path="/admin/staff" element={<AdminStaff />} />
                                </Route>
                                {/* SUPERADMIN + SUPPORT — read-only org browser */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'SUPPORT']} />}>
                                    <Route path="/admin/users" element={<AdminOrganizations />} />
                                    <Route path="/admin/organizations/:id" element={<AdminOrganizationDetail />} />
                                </Route>
                                {/* SUPERADMIN + FINANCE — financial stats */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'FINANCE']} />}>
                                    <Route path="/admin/stats" element={<AdminStats />} />
                                </Route>
                                {/* SUPERADMIN + MODERATOR */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'MODERATOR']} />}>
                                    <Route path="/admin/elanlar" element={<AdminListings />} />
                                </Route>
                                {/* SUPERADMIN + CONTENT */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'CONTENT']} />}>
                                    <Route path="/admin/ticker" element={<AdminTicker />} />
                                </Route>
                                {/* SUPERADMIN only — audit log */}
                                <Route element={<ProtectedRoute allowedRoles={['SUPERADMIN']} />}>
                                    <Route path="/admin/audit-log" element={<AuditLogPage />} />
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
