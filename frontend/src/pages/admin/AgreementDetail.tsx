import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { agreementService } from '../../services/agreementService';
import { paymentService } from '../../services/paymentService';
import { RentalAgreement, PaymentScheduleEntry, Vehicle, Member } from '../../types';
import PaymentStatusBadge from '../../components/shared/PaymentStatusBadge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

interface AgreementWithSchedule extends RentalAgreement {
  rental_payment_schedule: PaymentScheduleEntry[];
}

export default function AgreementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<AgreementWithSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [terminateReason, setTerminateReason] = useState('');
  const [showTerminate, setShowTerminate] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(() => {
    agreementService.getAgreementDetail(id!).then((d) => {
      setData(d as AgreementWithSchedule);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function terminate() {
    if (!terminateReason.trim()) { toast.error('Reason is required'); return; }
    try {
      await agreementService.terminateAgreement(id!, terminateReason);
      setData((prev) => prev ? { ...prev, agreement_status: 'terminated', termination_reason: terminateReason } : prev);
      setShowTerminate(false);
      toast.success('Agreement terminated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to terminate';
      toast.error(msg);
    }
  }

  async function confirmPayment(paymentId: string) {
    setConfirming(paymentId);
    try {
      await paymentService.confirmPayment(paymentId);
      toast.success('Payment confirmed');
      load();
    } catch {
      toast.error('Failed to confirm payment');
    } finally {
      setConfirming(null);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!data) return <p>Agreement not found</p>;

  const schedule = [...(data.rental_payment_schedule ?? [])].sort((a, b) => a.week_number - b.week_number);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Agreement Detail</h1>
          <span className={`badge ${data.agreement_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {data.agreement_status}
          </span>
        </div>
        {data.agreement_status === 'active' && !showTerminate && (
          <button onClick={() => setShowTerminate(true)} className="btn-danger">Terminate Agreement</button>
        )}
      </div>

      {showTerminate && (
        <div className="rounded-md bg-red-50 border border-red-300 p-4 space-y-3">
          <p className="font-medium text-red-800">Terminate this agreement?</p>
          <textarea
            value={terminateReason}
            onChange={(e) => setTerminateReason(e.target.value)}
            placeholder="Reason for termination…"
            className="form-input"
            rows={2}
          />
          <div className="flex gap-3">
            <button onClick={terminate} className="btn-danger">Confirm Termination</button>
            <button onClick={() => setShowTerminate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="font-semibold">Agreement Terms</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Start Date</p><p className="font-medium">{format(new Date(data.start_date), 'dd/MM/yyyy')}</p></div>
            <div><p className="text-xs text-gray-500">Weekly Rental</p><p className="font-medium">${Number(data.weekly_rental_amount).toFixed(2)}</p></div>
            <div><p className="text-xs text-gray-500">Deposit</p><p className="font-medium">${Number(data.deposit_amount).toFixed(2)}</p></div>
            <div><p className="text-xs text-gray-500">Min Term</p><p className="font-medium">{data.minimum_term_weeks} weeks</p></div>
            {data.early_termination_fee && (
              <div><p className="text-xs text-gray-500">Early Term Fee</p><p className="font-medium">${Number(data.early_termination_fee).toFixed(2)}</p></div>
            )}
            {data.termination_date && (
              <div><p className="text-xs text-gray-500">Terminated</p><p className="font-medium">{format(new Date(data.termination_date), 'dd/MM/yyyy')}</p></div>
            )}
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Parties</h2>
          {data.vehicles && (
            <div>
              <p className="text-xs text-gray-500">Vehicle</p>
              <Link to={`/admin/vehicles/${data.vehicle_id}`} className="text-blue-600 hover:underline text-sm font-medium">
                {(data.vehicles as Vehicle).rego} — {(data.vehicles as Vehicle).year} {(data.vehicles as Vehicle).make} {(data.vehicles as Vehicle).model}
              </Link>
            </div>
          )}
          {data.members && (
            <div>
              <p className="text-xs text-gray-500">Member</p>
              <Link to={`/admin/members/${data.member_id}`} className="text-blue-600 hover:underline text-sm font-medium">
                {(data.members as Member).first_name} {(data.members as Member).last_name}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Payment Schedule ({schedule.length} entries)</h2>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Confirmed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-300 inline-block"></span> Pending
            </span>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[32rem]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['#', 'Type', 'Due Date', 'Amount', 'Status', 'Paid Date', 'Confirmed Date', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedule.map((p) => {
                const isConfirmed = p.payment_status === 'paid';
                const rowClass = isConfirmed ? 'bg-gray-50 text-gray-400' : 'hover:bg-blue-50';
                const cellClass = isConfirmed ? 'text-gray-400' : '';
                return (
                  <tr key={p.id} className={rowClass}>
                    <td className={`px-4 py-2 text-sm ${cellClass}`}>{p.week_number}</td>
                    <td className={`px-4 py-2 text-sm capitalize ${cellClass}`}>{p.payment_type.replace('_', ' ')}</td>
                    <td className={`px-4 py-2 text-sm ${cellClass}`}>{format(new Date(p.due_date), 'dd/MM/yyyy')}</td>
                    <td className={`px-4 py-2 text-sm ${cellClass}`}>${Number(p.amount_due).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      {isConfirmed
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Confirmed</span>
                        : <PaymentStatusBadge status={p.payment_status} />
                      }
                    </td>
                    <td className={`px-4 py-2 text-sm ${isConfirmed ? 'text-gray-400' : 'text-gray-500'}`}>
                      {p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td className={`px-4 py-2 text-sm ${isConfirmed ? 'text-gray-500' : 'text-gray-300'}`}>
                      {p.payment_confirmed_at
                        ? format(new Date(p.payment_confirmed_at), 'dd/MM/yyyy HH:mm')
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {!isConfirmed && p.payment_status !== 'waived' && (
                        <button
                          onClick={() => confirmPayment(p.id)}
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
