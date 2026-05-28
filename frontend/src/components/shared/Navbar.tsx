import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { appUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = appUser?.user_type === 'system_admin' || appUser?.user_type === 'location_admin';

  return (
    <nav className="bg-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link to={isAdmin ? '/admin/dashboard' : '/member/dashboard'} className="text-xl font-bold tracking-tight">
              180Cars
            </Link>
            {isAdmin && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link to="/admin/dashboard" className="hover:text-blue-200 transition-colors">Dashboard</Link>
                <Link to="/admin/vehicles" className="hover:text-blue-200 transition-colors">Vehicles</Link>
                <Link to="/admin/members" className="hover:text-blue-200 transition-colors">Members</Link>
                <Link to="/admin/agreements" className="hover:text-blue-200 transition-colors">Agreements</Link>
                <Link to="/admin/payments/this-week" className="hover:text-blue-200 transition-colors">Payments</Link>
              </div>
            )}
            {!isAdmin && (
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link to="/member/dashboard" className="hover:text-blue-200 transition-colors">Dashboard</Link>
                <Link to="/member/agreement" className="hover:text-blue-200 transition-colors">My Agreement</Link>
                <Link to="/member/profile" className="hover:text-blue-200 transition-colors">Profile</Link>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-200">{appUser?.email}</span>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded capitalize">
              {appUser?.user_type?.replace('_', ' ')}
            </span>
            <button onClick={handleLogout} className="text-sm hover:text-blue-200 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
