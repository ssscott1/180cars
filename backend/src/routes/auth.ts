import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /auth/register — member self-registration
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, ...rest } = req.body;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message ?? 'Registration failed' });
    }

    const userId = authData.user.id;

    // Create user record
    await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      user_type: 'member',
    });

    // Create member record
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        mobile: rest.mobile,
        dob: rest.dob,
        address: rest.address,
        drivers_license_number: rest.drivers_license_number,
        medicare_number: rest.medicare_number,
        employer_name: rest.employer_name,
        employer_phone: rest.employer_phone,
        bank_account_name: rest.bank_account_name,
        bank_bsb: rest.bank_bsb,
        bank_account_number: rest.bank_account_number,
        member_status: 'inactive',
        approval_status: 'pending_approval',
      })
      .select()
      .single();

    if (memberError) {
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create member record' });
    }

    return res.status(201).json({
      message: 'Registration successful. Your application is pending approval.',
      member_id: member.id,
      approval_status: 'pending_approval',
    });
  }
);

// POST /auth/login — wrapper around Supabase auth
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user,
    });
  }
);

// GET /auth/profile — current user profile
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.user_type === 'member') {
    const { data: member } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return res.json({ user, member });
  }

  return res.json({ user });
});

export default router;
