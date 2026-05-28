import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/shared/Navbar';
import { useAuth } from './contexts/AuthContext';

// Auth pages
import Login from './pages/Login';
import MemberSignup from './pages/MemberSignup';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Vehicles from './pages/admin/Vehicles';
import VehicleForm from './pages/admin/VehicleForm';
import VehicleDetail from './pages/admin/VehicleDetail';
import Members from './pages/admin/Members';
import MemberDetail from './pages/admin/MemberDetail';
import CreateAgreement from './pages/admin/CreateAgreement';
import Agreements from './pages/admin/Agreements';
import AgreementDetail from './pages/admin/AgreementDetail';
import PaymentsThisWeek from './pages/admin/PaymentsThisWeek';
import OverduePayments from './pages/admin/OverduePayments';
import PaymentHistory from './pages/admin/PaymentHistory';

// Member pages
import MemberDashboard from './pages/member/Dashboard';
import MemberProfile from './pages/member/Profile';
import MemberAgreement from './pages/member/Agreement';

function AppRoutes() {
  const { appUser } = useAuth();
  const isAdmin = appUser?.user_type === 'system_admin' || appUser?.user_type === 'location_admin';

  return (
    <>
      {appUser && <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<MemberSignup />} />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <Vehicles />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles/new" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <VehicleForm />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles/:id/edit" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <VehicleForm />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles/:id" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <VehicleDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/members" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <Members />
            </ProtectedRoute>
          } />
          <Route path="/admin/members/:id" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <MemberDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/agreements/new" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <CreateAgreement />
            </ProtectedRoute>
          } />
          <Route path="/admin/agreements" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <Agreements />
            </ProtectedRoute>
          } />
          <Route path="/admin/agreements/:id" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <AgreementDetail />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments/this-week" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <PaymentsThisWeek />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments/overdue" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <OverduePayments />
            </ProtectedRoute>
          } />
          <Route path="/admin/payments/history" element={
            <ProtectedRoute allowedRoles={['system_admin', 'location_admin']}>
              <PaymentHistory />
            </ProtectedRoute>
          } />

          {/* Member routes */}
          <Route path="/member/dashboard" element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberDashboard />
            </ProtectedRoute>
          } />
          <Route path="/member/profile" element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberProfile />
            </ProtectedRoute>
          } />
          <Route path="/member/agreement" element={
            <ProtectedRoute allowedRoles={['member']}>
              <MemberAgreement />
            </ProtectedRoute>
          } />

          {/* Root redirect */}
          <Route path="/" element={
            appUser
              ? <Navigate to={isAdmin ? '/admin/dashboard' : '/member/dashboard'} replace />
              : <Navigate to="/login" replace />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
