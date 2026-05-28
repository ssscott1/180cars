import { useEffect, useState } from 'react';
import api from '../../services/api';
import { paymentService } from '../../services/paymentService';
import { Vehicle, PaymentScheduleEntry } from '../../types';
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

export default function MemberDashboard() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [payments, setPayments] = useState<{ history: PaymentScheduleEntry[]; next_payment: PaymentScheduleEntry | null }>({ history: [], next_payment: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/members/current-vehicle').then((r) => r.data).catch(() => null),
      paymentService.getMemberPayments().catch(() => ({ history: [], next_payment: null })),
    ]).then(([v, p]) => {
      setVehicle(v);
      setPayments(p);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current vehicle */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">My Vehicle</h2>
          {vehicle ? (
            <div className="space-y-3">
              <div className="text-center py-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-700">{vehicle.rego}</p>
                <p className="text-xl text-gray-700 mt-1">{vehicle.year} {vehicle.make} {vehicle.model}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {vehicle.rego_expiry && (
                  <div>
                    <p className="text-xs text-gray-500">Rego Expiry</p>
                    <p className="font-medium">{format(new Date(vehicle.rego_expiry), 'dd/MM/yyyy')}</p>
                  </div>
                )}
                {vehicle.insurance_provider && (
                  <div>
                    <p className="text-xs text-gray-500">Insurance</p>
                    <p className="font-medium">{vehicle.insurance_provider}</p>
                  </div>
                )}
                {vehicle.insurance_expiry && (
                  <div>
                    <p className="text-xs text-gray-500">Insurance Expiry</p>
                    <p className="font-medium">{format(new Date(vehicle.insurance_expiry), 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No vehicle currently assigned to your account.</p>
          )}
        </div>

        {/* Next payment */}
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Next Payment</h2>
          {payments.next_payment ? (
            <div className="text-center py-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">${Number(payments.next_payment.amount_due).toFixed(2)}</p>
              <p className="text-gray-600 mt-1">Due {format(new Date(payments.next_payment.due_date), 'EEEE, d MMMM yyyy')}</p>
              <div className="mt-2">
                <PaymentStatusBadge status={payments.next_payment.payment_status} />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No upcoming payments.</p>
          )}
        </div>
      </div>

      {/* Payment history */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Due Date', 'Type', 'Amount', 'Paid Date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.history.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No payment history yet</td></tr>
              )}
              {payments.history.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-3 text-sm capitalize">{p.payment_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-sm font-medium">${Number(p.amount_due).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '—'}</td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={p.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
