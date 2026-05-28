import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { paymentService } from '../../services/paymentService';
import { PaymentScheduleEntry } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format, subMonths } from 'date-fns';

interface FilterForm { from: string; to: string; }

type AgreementMeta = {
  rental_agreements?: {
    members?: { first_name: string; last_name: string };
    vehicles?: { make: string; model: string; rego: string };
  };
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unconfirming, setUnconfirming] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

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

  async function unconfirm(id: string) {
    setUnconfirming(id);
    try {
      await paymentService.unconfirmPayment(id);
      toast.success('Payment unconfirmed — it will reappear as pending');
      setConfirmTarget(null);
      load({ from: getValues('from'), to: getValues('to') });
    } catch {
      toast.error('Failed to unconfirm payment');
    } finally {
      setUnconfirming(null);
    }
  }

  function exportCsv() {
    const rows = [
      ['Due Date', 'Member', 'Vehicle', 'Type', 'Amount', 'Paid Date', 'Confirmed Date'],
      ...payments.map((p) => {
        const a = (p as unknown as AgreementMeta).rental_agreements;
        return [
          p.due_date,
          a?.members ? `${a.members.first_name} ${a.members.last_name}` : '',
          a?.vehicles?.rego ?? '',
          p.payment_type,
          p.amount_due,
          p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '',
          p.payment_confirmed_at ? format(new Date(p.payment_confirmed_at), 'dd/MM/yyyy') : '',
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `confirmed-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  }

  const totalConfirmed = payments.reduce((sum, p) => sum + Number(p.amount_due), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-sm text-gray-500 mt-1">Confirmed payments only</p>
        </div>
        <div className="flex items-center gap-4">
          {payments.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Confirmed</p>
              <p className="text-xl font-bold text-green-700">${totalConfirmed.toFixed(2)}</p>
            </div>
          )}
          <button onClick={exportCsv} className="btn-secondary">Export CSV</button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFilter)} className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="form-label">From (due date)</label>
          <input {...register('from')} type="date" className="form-input" />
        </div>
        <div>
          <label className="form-label">To (due date)</label>
          <input {...register('to')} type="date" className="form-input" />
        </div>
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      {/* Unconfirm confirmation dialog */}
      {confirmTarget && (
        <div className="rounded-md bg-amber-50 border border-amber-300 p-4 flex items-center justify-between gap-4">
          <p className="text-amber-800 text-sm font-medium">
            Unconfirm this payment? It will return to pending status and must be re-confirmed.
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => unconfirm(confirmTarget)}
              disabled={unconfirming === confirmTarget}
              className="btn-danger text-xs py-1 px-3"
            >
              {unconfirming === confirmTarget ? 'Undoing…' : 'Yes, Unconfirm'}
            </button>
            <button onClick={() => setConfirmTarget(null)} className="btn-secondary text-xs py-1 px-3">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Due Date', 'Member', 'Vehicle', 'Type', 'Amount', 'Paid Date', 'Confirmed Date', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No confirmed payments in this period
                    </td>
                  </tr>
                )}
                {payments.map((p) => {
                  const agreement = (p as unknown as AgreementMeta).rental_agreements;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {agreement?.members ? `${agreement.members.first_name} ${agreement.members.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {agreement?.vehicles ? `${agreement.vehicles.rego}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{p.payment_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm font-medium">${Number(p.amount_due).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-700 font-medium">
                        {p.payment_confirmed_at ? format(new Date(p.payment_confirmed_at), 'dd/MM/yyyy HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => setConfirmTarget(p.id)}
                          disabled={!!unconfirming}
                          className="text-xs text-amber-600 hover:text-amber-800 hover:underline disabled:opacity-50"
                        >
                          Unconfirm
                        </button>
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
