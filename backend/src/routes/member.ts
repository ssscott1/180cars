import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { supabaseAdmin } from '../services/supabase';
import { authenticate, requireRole } from '../middleware/auth';
import { format, subWeeks, addWeeks } from 'date-fns';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function requireMember() {
  return requireRole('member');
}

async function getMemberRecord(userId: string) {
  const { data } = await supabaseAdmin.from('members').select('*').eq('user_id', userId).single();
  return data;
}

// POST /members/apply — submit rental application (unauthenticated, creates auth user too)
router.post(
  '/apply',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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
    await supabaseAdmin.from('users').insert({ id: userId, email, user_type: 'member' });

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
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create member record' });
    }

    return res.status(201).json({
      message: 'Application submitted. Pending admin approval.',
      member_id: member.id,
      approval_status: 'pending_approval',
    });
  }
);

// GET /members/profile
router.get('/profile', authenticate, requireMember(), async (req: Request, res: Response) => {
  const member = await getMemberRecord(req.user!.id);
  if (!member) return res.status(404).json({ error: 'Member profile not found' });
  return res.json(member);
});

// PUT /members/profile — update own contact info only
router.put(
  '/profile',
  authenticate,
  requireMember(),
  async (req: Request, res: Response) => {
    const member = await getMemberRecord(req.user!.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    // Only allow safe fields to be updated
    const { mobile, address } = req.body;
    const updates: Record<string, string> = {};
    if (mobile !== undefined) updates.mobile = mobile;
    if (address !== undefined) updates.address = address;

    const { data, error } = await supabaseAdmin
      .from('members')
      .update(updates)
      .eq('id', member.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
);

// POST /members/upload-driver-license
router.post(
  '/upload-driver-license',
  authenticate,
  requireMember(),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_FILE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, JPG, PNG allowed' });
    }

    const member = await getMemberRecord(req.user!.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const ext = req.file.originalname.split('.').pop();
    const path = `${member.id}/license.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('driver_licenses')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (error) return res.status(500).json({ error: error.message });
    await supabaseAdmin.from('members').update({ drivers_license_file_path: path }).eq('id', member.id);
    return res.json({ path });
  }
);

// POST /members/upload-bank-statement
router.post(
  '/upload-bank-statement',
  authenticate,
  requireMember(),
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_FILE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, JPG, PNG allowed' });
    }

    const member = await getMemberRecord(req.user!.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const ext = req.file.originalname.split('.').pop();
    const path = `${member.id}/bank_statement.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('bank_statements')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (error) return res.status(500).json({ error: error.message });
    await supabaseAdmin.from('members').update({ bank_statement_file_path: path }).eq('id', member.id);
    return res.json({ path });
  }
);

// GET /members/current-vehicle
router.get('/current-vehicle', authenticate, requireMember(), async (req: Request, res: Response) => {
  const member = await getMemberRecord(req.user!.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data: agreement, error } = await supabaseAdmin
    .from('rental_agreements')
    .select('*, vehicles(*)')
    .eq('member_id', member.id)
    .eq('agreement_status', 'active')
    .single();

  if (error || !agreement) return res.status(404).json({ error: 'No active vehicle assignment' });
  return res.json(agreement.vehicles);
});

// GET /members/payments — last 8 weeks + next due
router.get('/payments', authenticate, requireMember(), async (req: Request, res: Response) => {
  const member = await getMemberRecord(req.user!.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data: agreement } = await supabaseAdmin
    .from('rental_agreements')
    .select('id')
    .eq('member_id', member.id)
    .eq('agreement_status', 'active')
    .single();

  if (!agreement) return res.status(404).json({ error: 'No active agreement' });

  const eightWeeksAgo = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
  const nextWeek = format(addWeeks(new Date(), 1), 'yyyy-MM-dd');

  const { data: history } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('*')
    .eq('agreement_id', agreement.id)
    .gte('due_date', eightWeeksAgo)
    .lte('due_date', nextWeek)
    .order('due_date');

  const { data: nextPayment } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('*')
    .eq('agreement_id', agreement.id)
    .in('payment_status', ['pending', 'overdue'])
    .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
    .order('due_date')
    .limit(1)
    .single();

  return res.json({ history: history ?? [], next_payment: nextPayment ?? null });
});

// GET /members/agreement
router.get('/agreement', authenticate, requireMember(), async (req: Request, res: Response) => {
  const member = await getMemberRecord(req.user!.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data, error } = await supabaseAdmin
    .from('rental_agreements')
    .select('*, vehicles(make, model, rego)')
    .eq('member_id', member.id)
    .eq('agreement_status', 'active')
    .single();

  if (error || !data) return res.status(404).json({ error: 'No active agreement found' });
  return res.json(data);
});

export default router;
