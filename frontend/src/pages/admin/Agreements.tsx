import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { agreementService } from '../../services/agreementService';
import { RentalAgreement, AgreementStatus } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

const statusColors: Record<AgreementStatus, string> = {
  active:     'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-800',
  completed:  'bg-gray-100 text-gray-700',
};

export default function Agreements() {
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    agreementService.getAgreements(filters).then((a) => { setAgreements(a); setLoading(false); });
  }, [status]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rental Agreements</h1>
        <Link to="/admin/agreements/new" className="btn-primary">+ New Agreement</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['', 'active', 'terminated', 'completed'] as const).map((s) => (
          <button key={s} onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {s ? s.replace(/^\w/, (c) => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Vehicle', 'Member', 'Start Date', 'Status', 'Weekly Amount', 'Min Term', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agreements.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No agreements found</td></tr>
              )}
              {agreements.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {a.vehicles ? `${a.vehicles.make} ${a.vehicles.model} (${a.vehicles.rego})` : a.vehicle_id}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {a.members ? `${a.members.first_name} ${a.members.last_name}` : a.member_id}
                  </td>
                  <td className="px-4 py-3 text-sm">{format(new Date(a.start_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[a.agreement_status]}`}>{a.agreement_status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">${Number(a.weekly_rental_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{a.minimum_term_weeks} weeks</td>
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/admin/agreements/${a.id}`} className="text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
