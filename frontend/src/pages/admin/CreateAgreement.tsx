import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { agreementService, CreateAgreementPayload } from '../../services/agreementService';
import { Vehicle, Member } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format } from 'date-fns';

interface FormData {
  vehicle_id: string;
  member_id: string;
  weekly_rental_amount: number;
  deposit_amount: number;
  minimum_term_weeks: number;
  early_termination_fee: number;
  start_date: string;
}

export default function CreateAgreement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<{ due_date: string; amount_due: number; payment_type: string }[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      minimum_term_weeks: 12,
      start_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const selectedVehicleId = watch('vehicle_id');
  const selectedMemberId = watch('member_id');

  useEffect(() => {
    Promise.all([
      api.get('/admin/vehicles', { params: { status: 'available' } }),
      api.get('/admin/members', { params: { approval_status: 'approved' } }),
    ]).then(([vRes, mRes]) => {
      setVehicles(vRes.data);
      setMembers(mRes.data);
      setLoading(false);

      // Pre-populate from query params
      const vid = searchParams.get('vehicle_id');
      const mid = searchParams.get('member_id');
      if (vid) setValue('vehicle_id', vid);
      if (mid) setValue('member_id', mid);
    });
  }, [searchParams, setValue]);

  useEffect(() => {
    if (selectedVehicleId) {
      const v = vehicles.find((x) => x.id === selectedVehicleId);
      if (v) {
        setValue('weekly_rental_amount', Number(v.weekly_rental_amount));
        setValue('deposit_amount', Number(v.deposit_amount));
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    try {
      const payload: CreateAgreementPayload = {
        vehicle_id: data.vehicle_id,
        member_id: data.member_id,
        weekly_rental_amount: Number(data.weekly_rental_amount),
        deposit_amount: Number(data.deposit_amount),
        minimum_term_weeks: Number(data.minimum_term_weeks),
        early_termination_fee: data.early_termination_fee ? Number(data.early_termination_fee) : undefined,
        start_date: data.start_date,
      };

      const result = await agreementService.createAgreement(payload);
      setSchedulePreview(result.schedule_preview ?? []);

      toast.success('Agreement created successfully');
      setTimeout(() => navigate(`/admin/agreements/${result.agreement.id}`), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create agreement';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">Create Rental Agreement</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {[1, 2].map((s) => (
          <div key={s} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            step === s ? 'bg-blue-600 text-white' : step > s ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {s}. {s === 1 ? 'Select Vehicle & Member' : 'Review & Confirm Pricing'}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {step === 1 && (
          <>
            <div>
              <label className="form-label">Vehicle <span className="text-red-500">*</span></label>
              <select {...register('vehicle_id', { required: 'Please select a vehicle' })} className="form-input">
                <option value="">Select available vehicle…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.rego} — {v.year} {v.make} {v.model} (${Number(v.weekly_rental_amount).toFixed(2)}/week)
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="form-error">{errors.vehicle_id.message}</p>}
            </div>
            <div>
              <label className="form-label">Member <span className="text-red-500">*</span></label>
              <select {...register('member_id', { required: 'Please select a member' })} className="form-input">
                <option value="">Select approved member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name} — {m.email}</option>
                ))}
              </select>
              {errors.member_id && <p className="form-error">{errors.member_id.message}</p>}
            </div>
            {selectedVehicle && selectedMember && (
              <div className="rounded-md bg-blue-50 p-4 text-sm space-y-1">
                <p><strong>Vehicle:</strong> {selectedVehicle.rego} — {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                <p><strong>Member:</strong> {selectedMember.first_name} {selectedMember.last_name}</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => { if (!selectedVehicleId || !selectedMemberId) { toast.error('Select both a vehicle and member'); return; } setStep(2); }}
              className="btn-primary w-full"
            >
              Next: Review Pricing →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Weekly Rental ($)</label>
                <input {...register('weekly_rental_amount', { required: true, min: 0 })} type="number" step="0.01" className="form-input" />
              </div>
              <div>
                <label className="form-label">Deposit ($)</label>
                <input {...register('deposit_amount', { required: true, min: 0 })} type="number" step="0.01" className="form-input" />
              </div>
              <div>
                <label className="form-label">Start Date</label>
                <input {...register('start_date', { required: true })} type="date" className="form-input" />
              </div>
              <div>
                <label className="form-label">Minimum Term (weeks)</label>
                <input {...register('minimum_term_weeks', { required: true, min: 1 })} type="number" className="form-input" />
              </div>
              <div>
                <label className="form-label">Early Termination Fee ($)</label>
                <input {...register('early_termination_fee')} type="number" step="0.01" className="form-input" placeholder="Optional" />
              </div>
            </div>

            {schedulePreview.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Payment Schedule Preview</h3>
                <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Due Date</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedulePreview.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 capitalize">{e.payment_type.replace('_', ' ')}</td>
                        <td className="px-3 py-2">{format(new Date(e.due_date), 'dd/MM/yyyy')}</td>
                        <td className="px-3 py-2 text-right">${Number(e.amount_due).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-4">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Creating…' : 'Create Agreement'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
