import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
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

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vehicleService.getVehicleDetail(id!).then((v) => { setVehicle(v); setLoading(false); });
  }, [id]);

  async function downloadInvoice() {
    try {
      const url = await vehicleService.getInvoiceUrl(id!);
      window.open(url, '_blank');
    } catch {
      toast.error('No invoice available');
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!vehicle) return <p>Vehicle not found</p>;

  const Detail = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
          <span className={`badge ${statusColors[vehicle.vehicle_status]}`}>
            {vehicle.vehicle_status.replace(/_/g, ' ')}
          </span>
        </div>
        <Link to={`/admin/vehicles/${id}/edit`} className="btn-secondary">Edit Vehicle</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Identification</h2>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Rego" value={vehicle.rego} />
            <Detail label="VIN" value={vehicle.vin} />
            <Detail label="Engine Number" value={vehicle.engine_number} />
            <Detail label="Supplying Dealer" value={vehicle.supplying_dealer} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Purchase Price" value={`$${Number(vehicle.purchase_price).toFixed(2)}`} />
            <Detail label="Weekly Rental" value={`$${Number(vehicle.weekly_rental_amount).toFixed(2)}`} />
            <Detail label="Deposit (6 weeks)" value={`$${Number(vehicle.deposit_amount).toFixed(2)}`} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Insurance & Registration</h2>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Insurance Provider" value={vehicle.insurance_provider} />
            <Detail label="Policy Number" value={vehicle.insurance_policy} />
            <Detail label="Insurance Expiry" value={vehicle.insurance_expiry ? format(new Date(vehicle.insurance_expiry), 'dd/MM/yyyy') : undefined} />
            <Detail label="Rego Expiry" value={vehicle.rego_expiry ? format(new Date(vehicle.rego_expiry), 'dd/MM/yyyy') : undefined} />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Documents & Actions</h2>
          <div className="flex flex-col gap-3">
            {vehicle.invoice_file_path && (
              <button onClick={downloadInvoice} className="btn-secondary">Download Invoice</button>
            )}
            <Link to={`/admin/agreements/new?vehicle_id=${id}`} className="btn-primary text-center">
              Create Agreement
            </Link>
          </div>
        </div>
      </div>

      {vehicle.description && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
          <p className="text-sm text-gray-600">{vehicle.description}</p>
        </div>
      )}
    </div>
  );
}
