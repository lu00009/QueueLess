import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRouteGuard, StaffRouteGuard } from './routes/RouteGuards';
import { LoginView } from './views/auth/LoginView';
import { RegisterView } from './views/auth/RegisterView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { StaffConsole } from './views/staff/StaffConsole';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginView />} />
          <Route path="/register" element={<RegisterView />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Admin Dashboard */}
            <Route element={<AdminRouteGuard />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Staff Console */}
            <Route element={<StaffRouteGuard />}>
              <Route path="/staff" element={<StaffConsole />} />
            </Route>
          </Route>

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
