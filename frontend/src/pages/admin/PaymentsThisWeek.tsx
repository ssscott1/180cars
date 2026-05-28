import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { paymentService } from '../../services/paymentService';
import { PaymentScheduleEntry } from '../../types';
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

export default function PaymentsThisWeek() {
  const [payments, setPayments] = useState<PaymentScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    paymentService.getPaymentsDueThisWeek().then((p) => { setPayments(p); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirm(id: string) {
    setConfirming(id);
    try {
      await paymentService.confirmPayment(id);
      toast.success('Payment confirmed');
      load();
    } catch {
      toast.error('Failed to confirm payment');
    } finally {
      setConfirming(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  const total = payments.reduce((sum, p) => sum + Number(p.amount_due), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">This Week's Payments</h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Due</p>
          <p className="text-2xl font-bold text-blue-700">${total.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/admin/payments/overdue" className="btn-secondary text-sm">View Overdue</Link>
        <Link to="/admin/payments/history" className="btn-secondary text-sm">Payment History</Link>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Member', 'Vehicle', 'Type', 'Due Date', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">No payments due this week</td></tr>
              )}
              {payments.map((p) => {
                const agreement = (p as unknown as { rental_agreements?: { members?: { first_name: string; last_name: string }; vehicles?: { make: string; model: string; rego: string } } }).rental_agreements;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {agreement?.members ? `${agreement.members.first_name} ${agreement.members.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {agreement?.vehicles ? `${agreement.vehicles.make} ${agreement.vehicles.model} (${agreement.vehicles.rego})` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{p.payment_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm">{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-sm font-medium">${Number(p.amount_due).toFixed(2)}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={p.payment_status} /></td>
                    <td className="px-4 py-3 text-sm">
                      {p.payment_status !== 'paid' && (
                        <button
                          onClick={() => confirm(p.id)}
                          disabled={confirming === p.id}
                          className="btn-primary text-xs py-1 px-3"
                        >
                          {confirming === p.id ? '…' : 'Confirm'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
