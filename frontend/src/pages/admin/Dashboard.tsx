import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { DashboardStats } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

function StatCard({ label, value, color = 'blue', href }: { label: string; value: number | string; color?: string; href?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  const card = (
    <div className={`card border ${colorMap[color]} text-center`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 font-medium">{label}</p>
    </div>
  );
  return href ? <Link to={href}>{card}</Link> : card;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => { setStats(data); setLoading(false); });
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Vehicles" value={stats.total_vehicles} href="/admin/vehicles" />
        <StatCard label="Active Agreements" value={stats.active_agreements} color="green" href="/admin/agreements" />
        <StatCard label="This Week's Revenue" value={`$${stats.weekly_revenue.toFixed(2)}`} color="green" />
        <StatCard label="Pending Approvals" value={stats.pending_approvals} color="yellow" href="/admin/members?approval_status=pending_approval" />
        <StatCard label="Overdue Payments" value={stats.overdue_payments} color="red" href="/admin/payments/overdue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/admin/vehicles/new" className="btn-primary text-center">+ New Vehicle</Link>
            <Link to="/admin/agreements/new" className="btn-primary text-center">+ New Agreement</Link>
            <Link to="/admin/payments/this-week" className="btn-secondary text-center">This Week's Payments</Link>
            <Link to="/admin/payments/overdue" className="btn-secondary text-center">Overdue Payments</Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {stats.recent_activity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent_activity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-blue-600">{entry.action}</span>
                  <span className="text-gray-400">{format(new Date(entry.created_at), 'dd/MM HH:mm')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {stats.pending_approvals > 0 && (
        <div className="rounded-md bg-yellow-50 border border-yellow-300 p-4 flex items-center justify-between">
          <p className="text-yellow-800 font-medium">
            {stats.pending_approvals} member application{stats.pending_approvals > 1 ? 's' : ''} pending approval
          </p>
          <Link to="/admin/members?approval_status=pending_approval" className="btn-secondary text-sm">
            Review Now
          </Link>
        </div>
      )}

      {stats.overdue_payments > 0 && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 flex items-center justify-between">
          <p className="text-red-800 font-medium">
            {stats.overdue_payments} payment{stats.overdue_payments > 1 ? 's' : ''} overdue
          </p>
          <Link to="/admin/payments/overdue" className="btn-danger text-sm">
            View Overdue
          </Link>
        </div>
      )}
    </div>
  );
}
