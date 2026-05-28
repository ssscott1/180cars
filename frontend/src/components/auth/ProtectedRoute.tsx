import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserType } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserType[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { appUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullScreen />;

  if (!appUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(appUser.user_type)) {
    const redirect = appUser.user_type === 'member' ? '/member/dashboard' : '/admin/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}
