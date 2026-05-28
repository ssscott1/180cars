export type UserType = 'system_admin' | 'location_admin' | 'member';
export type VehicleStatus = 'available' | 'assigned_to_member' | 'in_service' | 'retired';
export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';
export type AgreementStatus = 'active' | 'terminated' | 'completed';
export type PaymentType = 'deposit' | 'weekly_rental';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed' | 'waived';

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  location_id?: string;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  location_id?: string;
  make: string;
  model: string;
  year: number;
  rego: string;
  vin: string;
  engine_number: string;
  description?: string;
  purchase_price: number;
  weekly_rental_amount: number;
  deposit_amount: number;
  vehicle_status: VehicleStatus;
  insurance_provider?: string;
  insurance_policy?: string;
  insurance_expiry?: string;
  rego_expiry?: string;
  supplying_dealer?: string;
  invoice_file_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  user_id?: string;
  location_id?: string;
  first_name: string;
  last_name: string;
  dob?: string;
  mobile?: string;
  email: string;
  address?: string;
  drivers_license_number?: string;
  drivers_license_file_path?: string;
  medicare_number?: string;
  employer_name?: string;
  employer_phone?: string;
  bank_account_name?: string;
  bank_bsb?: string;
  bank_account_number?: string;
  bank_statement_file_path?: string;
  member_status: MemberStatus;
  approval_status: ApprovalStatus;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalAgreement {
  id: string;
  vehicle_id: string;
  member_id: string;
  agreement_status: AgreementStatus;
  weekly_rental_amount: number;
  deposit_amount: number;
  minimum_term_weeks: number;
  early_termination_fee?: number;
  start_date: string;
  end_date?: string;
  termination_date?: string;
  termination_reason?: string;
  created_at: string;
  updated_at: string;
  vehicles?: Vehicle;
  members?: Member;
}

export interface PaymentScheduleEntry {
  id: string;
  agreement_id: string;
  payment_type: PaymentType;
  week_number: number;
  due_date: string;
  amount_due: number;
  payment_status: PaymentStatus;
  paid_at?: string;
  payment_confirmed_at?: string;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_vehicles: number;
  active_agreements: number;
  pending_approvals: number;
  overdue_payments: number;
  weekly_revenue: number;
  recent_activity: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}
