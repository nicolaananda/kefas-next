import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import { DashboardHome } from './components/dashboard/DashboardHome';
import DailyPage from './pages/dashboard/Daily';
import ServicesPage from './pages/dashboard/Services';
import CustomersPage from './pages/dashboard/Customers';
import TransactionsPage from './pages/dashboard/Transactions';
import ExpensesPage from './pages/dashboard/Expenses';
import PayrollPage from './pages/dashboard/Payroll';
import BookingsPage from './pages/dashboard/Bookings';
import BarbersPage from './pages/dashboard/Barbers';
import PosPage from './pages/POS';
import SchedulePage from './pages/dashboard/Schedule';
import StatusPage from './pages/Status';
import ProfitLossPage from './pages/dashboard/ProfitLoss';
import AnalyticsPage from './pages/dashboard/Analytics';
import ChangePasswordPage from './pages/dashboard/ChangePassword';
import BarberDashboard from './pages/BarberDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user is staff/barber and tries to access restricted page, redirect to barber dashboard
    if (user.role === 'staff') {
      return <Navigate to="/barber" replace />;
    }
    // Default fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // If on POS subdomain or localhost, redirect based on role
  if (window.location.hostname.startsWith('pos.') || ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    if (user?.role === 'owner') {
      return <Navigate to="/dashboard" replace />;
    } else if (user?.role === 'staff') {
      return <Navigate to="/barber" replace />;
    } else if (user) {
      return <Navigate to="/pos" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Default to status page for public domain
  return <StatusPage />;
}

export default function App() {


  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route
            path="/barber"
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <BarberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="daily" element={<DailyPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="profit-loss" element={<ProfitLossPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="barbers" element={<BarbersPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
          </Route>
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <PosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<RootRedirect />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
