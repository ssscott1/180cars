import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken, supabaseAdmin } from '../services/supabase';
import { User, UserType } from '../types';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  const authUser = await verifySupabaseToken(token);
  if (!authUser) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user as User;
  req.supabaseUserId = authUser.id;
  return next();
}

export function requireRole(...roles: UserType[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

export const requireAdmin = requireRole('system_admin', 'location_admin');
export const requireSystemAdmin = requireRole('system_admin');
