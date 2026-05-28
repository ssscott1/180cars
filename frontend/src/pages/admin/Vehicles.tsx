import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle, VehicleStatus } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

const statusColors: Record<VehicleStatus, string> = {
  available:          'bg-green-100 text-green-800',
  assigned_to_member: 'bg-blue-100 text-blue-800',
  in_service:         'bg-yellow-100 text-yellow-800',
  retired:            'bg-gray-100 text-gray-600',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? '';

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (status) filters.status = status;
    vehicleService.getVehicles(filters).then((v) => { setVehicles(v); setLoading(false); });
  }, [status]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <Link to="/admin/vehicles/new" className="btn-primary">+ Add Vehicle</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'available', 'assigned_to_member', 'in_service', 'retired'].map((s) => (
          <button
            key={s}
            onClick={() => setSearchParams(s ? { status: s } : {})}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s ? s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Rego', 'Make / Model', 'Year', 'Status', 'Weekly Rent', 'Rego Expiry', 'Insurance Expiry', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vehicles.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-500">No vehicles found</td></tr>
              )}
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-sm">{v.rego}</td>
                  <td className="px-4 py-3 text-sm">{v.make} {v.model}</td>
                  <td className="px-4 py-3 text-sm">{v.year}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[v.vehicle_status]}`}>
                      {v.vehicle_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">${Number(v.weekly_rental_amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">{v.rego_expiry ? format(new Date(v.rego_expiry), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-sm">{v.insurance_expiry ? format(new Date(v.insurance_expiry), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <Link to={`/admin/vehicles/${v.id}`} className="text-blue-600 hover:underline">View</Link>
                    <Link to={`/admin/vehicles/${v.id}/edit`} className="text-gray-600 hover:underline">Edit</Link>
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
