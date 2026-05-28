import { useEffect, useState } from 'react';
import api from '../../services/api';
import { RentalAgreement, Vehicle } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { format, addWeeks } from 'date-fns';

export default function MemberAgreement() {
  const [agreement, setAgreement] = useState<(RentalAgreement & { vehicles?: Vehicle }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/members/agreement').then(({ data }) => { setAgreement(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!agreement) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Agreement</h1>
        <div className="card text-center py-12">
          <p className="text-gray-500">No active rental agreement found.</p>
        </div>
      </div>
    );
  }

  const Detail = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
    </div>
  );

  const minEndDate = addWeeks(new Date(agreement.start_date), agreement.minimum_term_weeks);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Rental Agreement</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Assigned Vehicle</h2>
        {agreement.vehicles && (
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{agreement.vehicles.rego}</p>
            <p className="text-xl text-gray-700 mt-1">{agreement.vehicles.year} {agreement.vehicles.make} {agreement.vehicles.model}</p>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-900">Agreement Terms</h2>
        <div className="grid grid-cols-2 gap-4">
          <Detail label="Start Date" value={format(new Date(agreement.start_date), 'dd MMMM yyyy')} />
          <Detail label="Status" value={agreement.agreement_status.replace(/^\w/, (c) => c.toUpperCase())} />
          <Detail label="Weekly Rental" value={`$${Number(agreement.weekly_rental_amount).toFixed(2)}`} />
          <Detail label="Deposit" value={`$${Number(agreement.deposit_amount).toFixed(2)}`} />
          <Detail label="Minimum Term" value={`${agreement.minimum_term_weeks} weeks`} />
          <Detail
            label="Earliest Exit Date"
            value={format(minEndDate, 'dd MMMM yyyy')}
          />
          {agreement.early_termination_fee && (
            <Detail label="Early Termination Fee" value={`$${Number(agreement.early_termination_fee).toFixed(2)}`} />
          )}
        </div>
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">Important information</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Payments are charged weekly to your nominated bank account.</li>
          <li>You can exit the agreement after your {agreement.minimum_term_weeks}-week minimum term.</li>
          {agreement.early_termination_fee ? <li>An early termination fee of ${Number(agreement.early_termination_fee).toFixed(2)} applies if you exit before the minimum term.</li> : null}
          <li>Contact us if you have questions about your agreement.</li>
        </ul>
      </div>
    </div>
  );
}
