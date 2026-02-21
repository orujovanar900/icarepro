import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Contracts } from './pages/Contracts';
import { ContractDetail } from './pages/ContractDetail';
import { Properties } from './pages/Properties';
import { Income } from './pages/Income';
import { Expenses } from './pages/Expenses';
import { Tenants } from './pages/Tenants';
import { TenantDetail } from './pages/TenantDetail';
import { Documents } from './pages/Documents';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';

export default function App() {
    return (
        <Router>
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
        </Router>
    );
}
