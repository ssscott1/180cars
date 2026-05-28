import { PaymentStatus } from '../../types';

const config: Record<PaymentStatus, { label: string; classes: string }> = {
  pending:  { label: 'Pending',  classes: 'bg-yellow-100 text-yellow-800' },
  paid:     { label: 'Paid',     classes: 'bg-green-100 text-green-800' },
  overdue:  { label: 'Overdue',  classes: 'bg-red-100 text-red-800' },
  failed:   { label: 'Failed',   classes: 'bg-red-100 text-red-800' },
  waived:   { label: 'Waived',   classes: 'bg-gray-100 text-gray-600' },
};

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, classes } = config[status] ?? config.pending;
  return <span className={`badge ${classes}`}>{label}</span>;
}
