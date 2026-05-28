import { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { paymentService } from '../../services/paymentService';
import { PaymentScheduleEntry } from '../../types';
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format, differenceInDays } from 'date-fns';

export default function OverduePayments() {
  const [payments, setPayments] = useState<PaymentScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    paymentService.getOverduePayments().then((p) => { setPayments(p); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirm(id: string) {
    setActing(id);
    try { await paymentService.confirmPayment(id); toast.success('Payment confirmed'); load(); }
    catch { toast.error('Failed'); }
    finally { setActing(null); }
  }

  async function retry(id: string) {
    setActing(id);
    try { await paymentService.retryPayment(id); toast.info('Retry scheduled'); load(); }
    catch { toast.error('Failed'); }
    finally { setActing(null); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Overdue Payments</h1>
        <span className="badge bg-red-100 text-red-800 text-sm">{payments.length} overdue</span>
      </div>

      {payments.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-green-700 font-medium">No overdue payments — all clear!</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50">
                <tr>
                  {['Member', 'Vehicle', 'Amount', 'Due Date', 'Days Overdue', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((p) => {
                  const agreement = (p as unknown as { rental_agreements?: { members?: { first_name: string; last_name: string; mobile?: string }; vehicles?: { make: string; model: string; rego: string } } }).rental_agreements;
                  const daysOverdue = differenceInDays(new Date(), new Date(p.due_date));
                  return (
                    <tr key={p.id} className="bg-red-50 hover:bg-red-100">
                      <td className="px-4 py-3 text-sm font-medium">
                        <div>{agreement?.members ? `${agreement.members.first_name} ${agreement.members.last_name}` : '—'}</div>
                        {agreement?.members?.mobile && <div className="text-xs text-gray-500">{agreement.members.mobile}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {agreement?.vehicles ? `${agreement.vehicles.rego} ${agreement.vehicles.make} ${agreement.vehicles.model}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-red-700">${Number(p.amount_due).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-sm font-bold text-red-700">{daysOverdue}d</td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={p.payment_status} /></td>
                      <td className="px-4 py-3 text-sm flex gap-2">
                        <button onClick={() => confirm(p.id)} disabled={acting === p.id} className="btn-primary text-xs py-1 px-2">Confirm</button>
                        <button onClick={() => retry(p.id)} disabled={acting === p.id} className="btn-secondary text-xs py-1 px-2">Retry</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
