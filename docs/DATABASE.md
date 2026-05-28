# 180Cars Database Schema

## Overview

PostgreSQL database hosted on Supabase. Row Level Security (RLS) is enabled on all tables.

## Tables

### `dealership_locations`
Stores physical dealership/rental locations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | Required |
| address | TEXT | |
| city | VARCHAR(100) | |
| state | VARCHAR(50) | |
| postcode | VARCHAR(10) | |
| phone | VARCHAR(20) | |
| email | VARCHAR(255) | |
| is_active | BOOLEAN | Default true |

---

### `users`
Maps Supabase `auth.users` entries to application roles.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, FK → auth.users |
| email | VARCHAR(255) | |
| user_type | VARCHAR(50) | `system_admin`, `location_admin`, `member` |
| location_id | UUID | FK → dealership_locations (for location_admin) |
| is_active | BOOLEAN | |

---

### `members`
Member application and profile data.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| location_id | UUID | FK → dealership_locations |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| dob | DATE | |
| mobile | VARCHAR(20) | |
| email | VARCHAR(255) | |
| address | TEXT | |
| drivers_license_number | VARCHAR(100) | Unique |
| drivers_license_file_path | TEXT | Supabase Storage path |
| medicare_number | VARCHAR(50) | |
| employer_name | VARCHAR(255) | |
| employer_phone | VARCHAR(20) | |
| bank_account_name | VARCHAR(255) | |
| bank_bsb | VARCHAR(10) | |
| bank_account_number | VARCHAR(20) | |
| bank_statement_file_path | TEXT | Supabase Storage path |
| member_status | VARCHAR(50) | `active`, `inactive`, `suspended` |
| approval_status | VARCHAR(50) | `pending_approval`, `approved`, `rejected` |
| rejection_reason | TEXT | |
| stripe_customer_id | VARCHAR(255) | |

---

### `vehicles`
Vehicle inventory and details.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| location_id | UUID | FK → dealership_locations |
| make | VARCHAR(100) | |
| model | VARCHAR(100) | |
| year | INTEGER | |
| rego | VARCHAR(20) | Unique |
| vin | VARCHAR(50) | Unique |
| engine_number | VARCHAR(50) | Unique |
| description | TEXT | |
| purchase_price | DECIMAL(10,2) | |
| weekly_rental_amount | DECIMAL(10,2) | Auto: price ÷ 110 |
| deposit_amount | DECIMAL(10,2) | Auto: weekly × 6 |
| vehicle_status | VARCHAR(50) | `available`, `assigned_to_member`, `in_service`, `retired` |
| insurance_provider | VARCHAR(255) | |
| insurance_policy | VARCHAR(255) | |
| insurance_expiry | DATE | |
| rego_expiry | DATE | |
| supplying_dealer | VARCHAR(255) | |
| invoice_file_path | TEXT | Supabase Storage path |

---

### `rental_agreements`
Rental agreements linking a vehicle to a member with locked pricing.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| vehicle_id | UUID | FK → vehicles |
| member_id | UUID | FK → members |
| agreement_status | VARCHAR(50) | `active`, `terminated`, `completed` |
| weekly_rental_amount | DECIMAL(10,2) | Locked at agreement creation |
| deposit_amount | DECIMAL(10,2) | Locked at agreement creation |
| minimum_term_weeks | INTEGER | Default 12 |
| early_termination_fee | DECIMAL(10,2) | |
| start_date | DATE | |
| end_date | DATE | |
| termination_date | DATE | |
| termination_reason | TEXT | |
| created_by_admin_id | UUID | FK → auth.users |

---

### `rental_payment_schedule`
Full payment schedule for each agreement (deposit + weekly rentals).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| agreement_id | UUID | FK → rental_agreements |
| payment_type | VARCHAR(50) | `deposit`, `weekly_rental` |
| week_number | INTEGER | 0 = deposit, 1+ = weekly |
| due_date | DATE | |
| amount_due | DECIMAL(10,2) | |
| payment_status | VARCHAR(50) | `pending`, `paid`, `overdue`, `failed`, `waived` |
| paid_at | TIMESTAMPTZ | |
| payment_confirmed_at | TIMESTAMPTZ | |
| payment_confirmed_by_admin_id | UUID | FK → auth.users |
| stripe_payment_intent_id | VARCHAR(255) | |
| notes | TEXT | |

---

### `audit_log`
Immutable audit trail for admin actions.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| action | VARCHAR(255) | e.g. `member.approved`, `agreement.created` |
| resource_type | VARCHAR(100) | e.g. `member`, `vehicle`, `agreement` |
| resource_id | UUID | |
| details | JSONB | Additional context |
| ip_address | INET | |

## Pricing Calculations

- `weekly_rental_amount = purchase_price / 110`
- `deposit_amount = weekly_rental_amount * 6`

Both can be overridden per agreement. Values are locked at agreement creation.

## RLS Policy Summary

| Role | Access |
|------|--------|
| `system_admin` | Full access to all tables |
| `location_admin` | Access to data scoped to their `location_id` |
| `member` | Read-only access to their own profile, agreement, and payments |

## Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `vehicle_invoices` | Vehicle purchase invoices | Admin only |
| `driver_licenses` | Member driver license copies | Admin + own member |
| `bank_statements` | Member bank statement headers | Admin + own member |

All files use signed URLs with 24-hour expiry for downloads.
