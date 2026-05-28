export type UserType = 'system_admin' | 'location_admin' | 'member';
export type VehicleStatus = 'available' | 'assigned_to_member' | 'in_service' | 'retired';
export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected';
export type AgreementStatus = 'active' | 'terminated' | 'completed';
export type PaymentType = 'deposit' | 'weekly_rental';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed' | 'waived';

export interface DealershipLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  location_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  stripe_customer_id?: string;
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
  created_by_admin_id?: string;
  created_at: string;
  updated_at: string;
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
  payment_confirmed_by_admin_id?: string;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// Request augmentation
declare global {
  namespace Express {
    interface Request {
      user?: User;
      supabaseUserId?: string;
    }
  }
}
