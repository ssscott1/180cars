import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

// Service-role client: bypasses RLS — only use server-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Verify a JWT from the frontend and return the user
export async function verifySupabaseToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function writeAuditLog(
  userId: string | undefined,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string
) {
  await supabaseAdmin.from('audit_log').insert({
    user_id: userId ?? null,
    action,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
    details: details ?? null,
    ip_address: ipAddress ?? null,
  });
}
