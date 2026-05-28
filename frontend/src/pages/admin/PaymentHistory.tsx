import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { paymentService } from '../../services/paymentService';
import { PaymentScheduleEntry } from '../../types';
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format, subMonths } from 'date-fns';

interface FilterForm { from: string; to: string; }

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit, getValues } = useForm<FilterForm>({
    defaultValues: {
      from: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const load = useCallback((filters?: { from?: string; to?: string }) => {
    setLoading(true);
    paymentService.getPaymentHistory(filters).then((p) => { setPayments(p); setLoading(false); });
  }, []);

  useEffect(() => { load({ from: getValues('from'), to: getValues('to') }); }, [load, getValues]);

  function onFilter(data: FilterForm) { load(data); }

  function exportCsv() {
    const rows = [
      ['Date', 'Member', 'Vehicle', 'Type', 'Amount', 'Status', 'Paid At'],
      ...payments.map((p) => {
        const a = (p as unknown as { rental_agreements?: { members?: { first_name: string; last_name: string }; vehicles?: { rego: string } } }).rental_agreements;
        return [
          p.due_date,
          a?.members ? `${a.members.first_name} ${a.members.last_name}` : '',
          a?.vehicles?.rego ?? '',
          p.payment_type,
          p.amount_due,
          p.payment_status,
          p.paid_at ?? '',
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
      </div>

      <form onSubmit={handleSubmit(onFilter)} className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="form-label">From</label>
          <input {...register('from')} type="date" className="form-input" />
        </div>
        <div>
          <label className="form-label">To</label>
          <input {...register('to')} type="date" className="form-input" />
        </div>
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Due Date', 'Member', 'Vehicle', 'Type', 'Amount', 'Status', 'Paid Date', 'Confirmed By'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-500">No payments in this period</td></tr>
                )}
                {payments.map((p) => {
                  const agreement = (p as unknown as { rental_agreements?: { members?: { first_name: string; last_name: string }; vehicles?: { make: string; model: string; rego: string } } }).rental_agreements;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-sm">{agreement?.members ? `${agreement.members.first_name} ${agreement.members.last_name}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">{agreement?.vehicles ? `${agreement.vehicles.rego}` : '—'}</td>
                      <td className="px-4 py-3 text-sm capitalize">{p.payment_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm font-medium">${Number(p.amount_due).toFixed(2)}</td>
                      <td className="px-4 py-3"><PaymentStatusBadge status={p.payment_status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{p.payment_confirmed_at ? '✓' : '—'}</td>
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
