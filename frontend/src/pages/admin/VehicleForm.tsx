import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { vehicleService } from '../../services/vehicleService';
import { Vehicle } from '../../types';
import FileUpload from '../../components/shared/FileUpload';
import LoadingSpinner from '../../components/shared/LoadingSpinner';

type VehicleFormData = Omit<Vehicle, 'id' | 'created_at' | 'updated_at' | 'vehicle_status'>;

export default function VehicleForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VehicleFormData>();
  const [loading, setLoading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const purchasePrice = watch('purchase_price');

  useEffect(() => {
    if (purchasePrice && purchasePrice > 0) {
      const weekly = Math.round((Number(purchasePrice) / 110) * 100) / 100;
      setValue('weekly_rental_amount', weekly);
      setValue('deposit_amount', Math.round(weekly * 6 * 100) / 100);
    }
  }, [purchasePrice, setValue]);

  useEffect(() => {
    if (!isEdit) return;
    vehicleService.getVehicleDetail(id!).then((v) => {
      Object.entries(v).forEach(([k, val]) => setValue(k as keyof VehicleFormData, val as never));
      setInitialLoading(false);
    });
  }, [id, isEdit, setValue]);

  async function onSubmit(data: VehicleFormData) {
    setLoading(true);
    try {
      const vehicle = isEdit
        ? await vehicleService.updateVehicle(id!, data)
        : await vehicleService.createVehicle(data);

      if (invoiceFile) {
        await vehicleService.uploadInvoice(vehicle.id, invoiceFile);
      }

      toast.success(`Vehicle ${isEdit ? 'updated' : 'created'} successfully`);
      navigate(`/admin/vehicles/${vehicle.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save vehicle';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) return <LoadingSpinner />;

  const Field = ({ name, label, type = 'text', required = false, readOnly = false, placeholder = '' }: {
    name: keyof VehicleFormData; label: string; type?: string; required?: boolean; readOnly?: boolean; placeholder?: string;
  }) => (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input
        {...register(name, required ? { required: `${label} is required` } : {})}
        type={type}
        readOnly={readOnly && isEdit}
        className={`form-input ${readOnly && isEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        step={type === 'number' ? '0.01' : undefined}
      />
      {errors[name] && <p className="form-error">{String(errors[name]?.message)}</p>}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        <h2 className="text-lg font-semibold border-b pb-2">Identification</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field name="rego" label="Registration (Rego)" required readOnly />
          <Field name="vin" label="VIN" required readOnly />
          <Field name="engine_number" label="Engine Number" required readOnly />
        </div>
        {isEdit && (
          <p className="text-xs text-gray-500">Rego, VIN and engine number cannot be changed after creation.</p>
        )}

        <h2 className="text-lg font-semibold border-b pb-2">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field name="make" label="Make" required />
          <Field name="model" label="Model" required />
          <Field name="year" label="Year" type="number" required />
        </div>
        <div>
          <label className="form-label">Description</label>
          <textarea {...register('description')} className="form-input" rows={3} />
        </div>
        <Field name="supplying_dealer" label="Supplying Dealer" />

        <h2 className="text-lg font-semibold border-b pb-2">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field name="purchase_price" label="Purchase Price ($)" type="number" required />
          <div>
            <label className="form-label">Weekly Rental (auto-calc)</label>
            <input {...register('weekly_rental_amount')} type="number" step="0.01" className="form-input bg-gray-50" readOnly />
          </div>
          <div>
            <label className="form-label">Deposit (auto-calc)</label>
            <input {...register('deposit_amount')} type="number" step="0.01" className="form-input bg-gray-50" readOnly />
          </div>
        </div>

        <h2 className="text-lg font-semibold border-b pb-2">Insurance & Registration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="insurance_provider" label="Insurance Provider" />
          <Field name="insurance_policy" label="Policy Number" />
          <Field name="insurance_expiry" label="Insurance Expiry" type="date" />
          <Field name="rego_expiry" label="Rego Expiry" type="date" />
        </div>

        <h2 className="text-lg font-semibold border-b pb-2">Invoice</h2>
        <FileUpload onFile={setInvoiceFile} label="Upload invoice (PDF / JPG / PNG)" />

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
}
