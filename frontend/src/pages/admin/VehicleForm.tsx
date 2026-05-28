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
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<VehicleFormData>();
  const [loading, setLoading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceReady, setInvoiceReady] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [pricingCalculated, setPricingCalculated] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    vehicleService.getVehicleDetail(id!).then((v) => {
      Object.entries(v).forEach(([k, val]) => setValue(k as keyof VehicleFormData, val as never));
      setPricingCalculated(true);
      setInitialLoading(false);
    });
  }, [id, isEdit, setValue]);

  function calculatePricing() {
    const price = parseFloat(String(getValues('purchase_price')));
    if (!price || price <= 0) {
      toast.error('Enter a valid purchase price first');
      return;
    }
    const weekly = Math.round((price / 110) * 100) / 100;
    const deposit = Math.round(weekly * 6 * 100) / 100;
    setValue('weekly_rental_amount', weekly);
    setValue('deposit_amount', deposit);
    setPricingCalculated(true);
    toast.success(`Calculated — Weekly: $${weekly.toFixed(2)}, Deposit: $${deposit.toFixed(2)}`);
  }

  function handleInvoiceFile(file: File) {
    setInvoiceFile(file);
    setInvoiceReady(true);
  }

  async function onSubmit(data: VehicleFormData) {
    if (!pricingCalculated) {
      toast.error('Please calculate pricing before saving');
      return;
    }

    setLoading(true);
    try {
      const vehicle = isEdit
        ? await vehicleService.updateVehicle(id!, data)
        : await vehicleService.createVehicle(data);

      if (invoiceFile) {
        await vehicleService.uploadInvoice(vehicle.id, invoiceFile);
        toast.success('Invoice uploaded');
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
          <div>
            <label className="form-label">Purchase Price ($) <span className="text-red-500">*</span></label>
            <input
              {...register('purchase_price', { required: 'Purchase price is required', min: { value: 1, message: 'Must be greater than 0' } })}
              type="number"
              step="1"
              className="form-input"
              placeholder="e.g. 25000"
              onChange={() => setPricingCalculated(false)}
            />
            {errors.purchase_price && <p className="form-error">{errors.purchase_price.message}</p>}
          </div>
          <div>
            <label className="form-label">Weekly Rental</label>
            <input
              {...register('weekly_rental_amount')}
              type="number"
              step="0.01"
              className={`form-input ${pricingCalculated ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}
              readOnly
              placeholder="Click Calculate →"
            />
          </div>
          <div>
            <label className="form-label">Deposit (6 weeks)</label>
            <input
              {...register('deposit_amount')}
              type="number"
              step="0.01"
              className={`form-input ${pricingCalculated ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}
              readOnly
              placeholder="Click Calculate →"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={calculatePricing}
          className={`btn-secondary w-full sm:w-auto ${pricingCalculated ? 'border-green-400 text-green-700' : ''}`}
        >
          {pricingCalculated ? '✓ Pricing Calculated' : 'Calculate Weekly Rental & Deposit'}
        </button>

        <h2 className="text-lg font-semibold border-b pb-2">Insurance & Registration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="insurance_provider" label="Insurance Provider" />
          <Field name="insurance_policy" label="Policy Number" />
          <Field name="insurance_expiry" label="Insurance Expiry" type="date" />
          <Field name="rego_expiry" label="Rego Expiry" type="date" />
        </div>

        <h2 className="text-lg font-semibold border-b pb-2">Invoice</h2>
        {invoiceReady ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-300">
            <span className="text-green-600 text-lg">✓</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-700">{invoiceFile?.name}</p>
              <p className="text-xs text-green-600">Ready to upload — will be saved when you click Create Vehicle</p>
            </div>
            <button
              type="button"
              onClick={() => { setInvoiceFile(null); setInvoiceReady(false); }}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Remove
            </button>
          </div>
        ) : (
          <FileUpload onFile={handleInvoiceFile} label="Select invoice to upload (PDF / JPG / PNG)" />
        )}

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button
            type="submit"
            disabled={loading || !pricingCalculated}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!pricingCalculated ? 'Calculate pricing first' : ''}
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Vehicle'}
          </button>
        </div>
        {!pricingCalculated && (
          <p className="text-xs text-center text-amber-600">Calculate pricing before saving</p>
        )}
      </form>
    </div>
  );
}
