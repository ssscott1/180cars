import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import { supabaseAdmin, writeAuditLog } from '../services/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { generatePaymentSchedule } from '../utils/paymentSchedule';
import { format, addDays, isAfter } from 'date-fns';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ─────────────────────────────────────────────
// MEMBER MANAGEMENT
// ─────────────────────────────────────────────

// POST /admin/members — admin creates a member directly (pre-approved, no email sent)
router.post(
  '/members',
  authenticate,
  requireAdmin,
  [
    body('email').isEmail().normalizeEmail(),
    body('first_name').trim().notEmpty(),
    body('last_name').trim().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, first_name, last_name, ...rest } = req.body;

    // Generate a temporary password — admin shares this with the member manually
    const tempPassword =
      Math.random().toString(36).slice(2, 7).toUpperCase() +
      Math.random().toString(36).slice(2, 7) +
      '1!';

    // Create auth user without sending any email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message ?? 'Failed to create user' });
    }

    const userId = authData.user.id;

    await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      user_type: 'member',
      location_id: rest.location_id ?? null,
    });

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userId,
        first_name,
        last_name,
        email,
        mobile: rest.mobile ?? null,
        dob: rest.dob ?? null,
        address: rest.address ?? null,
        drivers_license_number: rest.drivers_license_number ?? null,
        medicare_number: rest.medicare_number ?? null,
        employer_name: rest.employer_name ?? null,
        employer_phone: rest.employer_phone ?? null,
        bank_account_name: rest.bank_account_name ?? null,
        bank_bsb: rest.bank_bsb ?? null,
        bank_account_number: rest.bank_account_number ?? null,
        location_id: rest.location_id ?? null,
        member_status: 'inactive',
        approval_status: 'approved',
      })
      .select()
      .single();

    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create member record' });
    }

    await writeAuditLog(req.user!.id, 'member.created_by_admin', 'member', member.id, { email });
    return res.status(201).json({
      member,
      temp_password: tempPassword,
      message: 'Member created. Share the temporary password with them.',
    });
  }
);

// GET /admin/members
router.get('/members', authenticate, requireAdmin, async (req: Request, res: Response) => {
  let q = supabaseAdmin
    .from('members')
    .select('*, dealership_locations(name)')
    .order('created_at', { ascending: false });

  if (req.query.status) q = q.eq('member_status', req.query.status as string);
  if (req.query.approval_status) q = q.eq('approval_status', req.query.approval_status as string);
  if (req.query.location_id) q = q.eq('location_id', req.query.location_id as string);

  if (req.user!.user_type === 'location_admin' && req.user!.location_id) {
    q = q.eq('location_id', req.user!.location_id);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /admin/members/:id
router.get('/members/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('*, dealership_locations(name), rental_agreements(id, agreement_status, vehicle_id)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Member not found' });
  return res.json(data);
});

// POST /admin/members/approve/:id
router.post('/members/approve/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('members')
    .update({ approval_status: 'approved' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Member not found' });

  await writeAuditLog(req.user!.id, 'member.approved', 'member', data.id, { email: data.email });
  return res.json({ message: 'Member approved', member: data });
});

// POST /admin/members/reject/:id
router.post(
  '/members/reject/:id',
  authenticate,
  requireAdmin,
  [body('reason').trim().notEmpty().withMessage('Rejection reason is required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { data, error } = await supabaseAdmin
      .from('members')
      .update({ approval_status: 'rejected', rejection_reason: req.body.reason })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Member not found' });

    await writeAuditLog(req.user!.id, 'member.rejected', 'member', data.id, { reason: req.body.reason });
    return res.json({ message: 'Member rejected', member: data });
  }
);

// POST /admin/members/:id/driver-license
router.post(
  '/members/:id/driver-license',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_FILE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, JPG, PNG allowed' });
    }
    const ext = req.file.originalname.split('.').pop();
    const path = `${req.params.id}/license.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('driver_licenses')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (error) return res.status(500).json({ error: error.message });
    await supabaseAdmin.from('members').update({ drivers_license_file_path: path }).eq('id', req.params.id);
    return res.json({ path });
  }
);

// POST /admin/members/:id/bank-statement
router.post(
  '/members/:id/bank-statement',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    if (!ALLOWED_FILE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, JPG, PNG allowed' });
    }
    const ext = req.file.originalname.split('.').pop();
    const path = `${req.params.id}/bank_statement.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from('bank_statements')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (error) return res.status(500).json({ error: error.message });
    await supabaseAdmin.from('members').update({ bank_statement_file_path: path }).eq('id', req.params.id);
    return res.json({ path });
  }
);

// GET /admin/members/:id/documents
router.get('/members/:id/documents', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('drivers_license_file_path, bank_statement_file_path')
    .eq('id', req.params.id)
    .single();

  if (!member) return res.status(404).json({ error: 'Member not found' });

  const urls: Record<string, string | null> = { license_url: null, bank_statement_url: null };

  if (member.drivers_license_file_path) {
    const { data } = await supabaseAdmin.storage
      .from('driver_licenses')
      .createSignedUrl(member.drivers_license_file_path, 86400);
    urls.license_url = data?.signedUrl ?? null;
  }

  if (member.bank_statement_file_path) {
    const { data } = await supabaseAdmin.storage
      .from('bank_statements')
      .createSignedUrl(member.bank_statement_file_path, 86400);
    urls.bank_statement_url = data?.signedUrl ?? null;
  }

  return res.json(urls);
});

// ─────────────────────────────────────────────
// RENTAL AGREEMENTS
// ─────────────────────────────────────────────

// POST /admin/agreements
router.post(
  '/agreements',
  authenticate,
  requireAdmin,
  [
    body('vehicle_id').isUUID(),
    body('member_id').isUUID(),
    body('weekly_rental_amount').optional().isFloat({ min: 0 }),
    body('deposit_amount').optional().isFloat({ min: 0 }),
    body('minimum_term_weeks').optional().isInt({ min: 1 }),
    body('early_termination_fee').optional().isFloat({ min: 0 }),
    body('start_date').isISO8601().toDate(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { vehicle_id, member_id, start_date, minimum_term_weeks = 12, early_termination_fee } = req.body;

    // Fetch vehicle defaults
    const { data: vehicle, error: vErr } = await supabaseAdmin
      .from('vehicles')
      .select('weekly_rental_amount, deposit_amount, vehicle_status')
      .eq('id', vehicle_id)
      .single();

    if (vErr || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    if (vehicle.vehicle_status !== 'available') {
      return res.status(409).json({ error: 'Vehicle is not available' });
    }

    // Fetch member
    const { data: member, error: mErr } = await supabaseAdmin
      .from('members')
      .select('approval_status, member_status')
      .eq('id', member_id)
      .single();

    if (mErr || !member) return res.status(404).json({ error: 'Member not found' });
    if (member.approval_status !== 'approved') {
      return res.status(409).json({ error: 'Member is not approved' });
    }

    const weekly = parseFloat(req.body.weekly_rental_amount ?? vehicle.weekly_rental_amount);
    const deposit = parseFloat(req.body.deposit_amount ?? vehicle.deposit_amount);

    // Create agreement
    const { data: agreement, error: aErr } = await supabaseAdmin
      .from('rental_agreements')
      .insert({
        vehicle_id,
        member_id,
        weekly_rental_amount: weekly,
        deposit_amount: deposit,
        minimum_term_weeks,
        early_termination_fee: early_termination_fee ?? null,
        start_date: format(new Date(start_date), 'yyyy-MM-dd'),
        agreement_status: 'active',
        created_by_admin_id: req.user!.id,
      })
      .select()
      .single();

    if (aErr || !agreement) return res.status(500).json({ error: 'Failed to create agreement' });

    // Generate payment schedule
    const schedule = generatePaymentSchedule(agreement.id, deposit, weekly, new Date(start_date));
    const { error: sErr } = await supabaseAdmin.from('rental_payment_schedule').insert(schedule);
    if (sErr) return res.status(500).json({ error: 'Failed to generate payment schedule' });

    // Update vehicle and member status
    await supabaseAdmin.from('vehicles').update({ vehicle_status: 'assigned_to_member' }).eq('id', vehicle_id);
    await supabaseAdmin.from('members').update({ member_status: 'active' }).eq('id', member_id);

    await writeAuditLog(req.user!.id, 'agreement.created', 'agreement', agreement.id, { vehicle_id, member_id });

    // Return agreement + schedule preview (deposit + first 4 weeks)
    return res.status(201).json({ agreement, schedule_preview: schedule.slice(0, 5) });
  }
);

// GET /admin/agreements
router.get('/agreements', authenticate, requireAdmin, async (req: Request, res: Response) => {
  let q = supabaseAdmin
    .from('rental_agreements')
    .select('*, vehicles(make, model, rego, location_id), members(first_name, last_name, email)')
    .order('created_at', { ascending: false });

  if (req.query.status) q = q.eq('agreement_status', req.query.status as string);

  if (req.user!.user_type === 'location_admin' && req.user!.location_id) {
    q = q.eq('vehicles.location_id', req.user!.location_id);
  }

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /admin/agreements/:id
router.get('/agreements/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('rental_agreements')
    .select('*, vehicles(*), members(*), rental_payment_schedule(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Agreement not found' });
  return res.json(data);
});

// POST /admin/agreements/:id/terminate
router.post(
  '/agreements/:id/terminate',
  authenticate,
  requireAdmin,
  [body('reason').trim().notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { data: agreement, error: fetchErr } = await supabaseAdmin
      .from('rental_agreements')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.agreement_status !== 'active') {
      return res.status(409).json({ error: 'Agreement is not active' });
    }

    const today = new Date();
    const startDate = new Date(agreement.start_date);
    const weeksElapsed = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weeksElapsed < agreement.minimum_term_weeks) {
      return res.status(400).json({
        error: `Cannot terminate before minimum term of ${agreement.minimum_term_weeks} weeks. ${agreement.minimum_term_weeks - weeksElapsed} week(s) remaining.`,
      });
    }

    const terminationDate = format(today, 'yyyy-MM-dd');

    await supabaseAdmin
      .from('rental_agreements')
      .update({
        agreement_status: 'terminated',
        termination_date: terminationDate,
        termination_reason: req.body.reason,
      })
      .eq('id', req.params.id);

    // Free up vehicle and deactivate member
    await supabaseAdmin.from('vehicles').update({ vehicle_status: 'available' }).eq('id', agreement.vehicle_id);
    await supabaseAdmin.from('members').update({ member_status: 'inactive' }).eq('id', agreement.member_id);

    // Cancel pending payments after termination
    await supabaseAdmin
      .from('rental_payment_schedule')
      .update({ payment_status: 'waived' })
      .eq('agreement_id', req.params.id)
      .eq('payment_status', 'pending')
      .gt('due_date', terminationDate);

    await writeAuditLog(req.user!.id, 'agreement.terminated', 'agreement', req.params.id, { reason: req.body.reason });
    return res.json({ message: 'Agreement terminated' });
  }
);

// ─────────────────────────────────────────────
// PAYMENT MANAGEMENT
// ─────────────────────────────────────────────

// GET /admin/payments/due-this-week
router.get('/payments/due-this-week', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const today = new Date();
  const weekStart = format(today, 'yyyy-MM-dd');
  const weekEnd = format(addDays(today, 7), 'yyyy-MM-dd');

  const { data, error } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('*, rental_agreements(member_id, vehicle_id, members(first_name, last_name, email, mobile), vehicles(make, model, rego))')
    .gte('due_date', weekStart)
    .lte('due_date', weekEnd)
    .in('payment_status', ['pending', 'overdue'])
    .order('due_date');

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /admin/payments/overdue
router.get('/payments/overdue', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, error } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('*, rental_agreements(member_id, vehicle_id, members(first_name, last_name, email, mobile), vehicles(make, model, rego))')
    .lt('due_date', today)
    .in('payment_status', ['pending', 'overdue', 'failed'])
    .order('due_date');

  if (error) return res.status(500).json({ error: error.message });

  // Mark pending ones as overdue
  const ids = (data ?? []).filter((p) => p.payment_status === 'pending').map((p) => p.id);
  if (ids.length > 0) {
    await supabaseAdmin.from('rental_payment_schedule').update({ payment_status: 'overdue' }).in('id', ids);
  }

  return res.json(data);
});

// GET /admin/payments/history
router.get(
  '/payments/history',
  authenticate,
  requireAdmin,
  [query('from').optional().isISO8601(), query('to').optional().isISO8601()],
  async (req: Request, res: Response) => {
    let q = supabaseAdmin
      .from('rental_payment_schedule')
      .select('*, rental_agreements(member_id, vehicle_id, members(first_name, last_name), vehicles(make, model, rego))')
      .order('due_date', { ascending: false });

    if (req.query.from) q = q.gte('due_date', req.query.from as string);
    if (req.query.to) q = q.lte('due_date', req.query.to as string);

    const { data, error } = await q.limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
);

// POST /admin/payments/:schedule_id/confirm
router.post('/payments/:schedule_id/confirm', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('rental_payment_schedule')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      payment_confirmed_at: new Date().toISOString(),
      payment_confirmed_by_admin_id: req.user!.id,
    })
    .eq('id', req.params.schedule_id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Payment entry not found' });

  await writeAuditLog(req.user!.id, 'payment.confirmed', 'payment', data.id);
  return res.json({ message: 'Payment confirmed', payment: data });
});

// POST /admin/payments/:schedule_id/retry
router.post('/payments/:schedule_id/retry', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data: payment, error } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('*, rental_agreements(member_id, members(stripe_customer_id))')
    .eq('id', req.params.schedule_id)
    .single();

  if (error || !payment) return res.status(404).json({ error: 'Payment entry not found' });

  // Reset to pending for manual retry
  await supabaseAdmin
    .from('rental_payment_schedule')
    .update({ payment_status: 'pending', notes: 'Manual retry requested' })
    .eq('id', req.params.schedule_id);

  await writeAuditLog(req.user!.id, 'payment.retry_requested', 'payment', payment.id);
  return res.json({ message: 'Payment marked for retry' });
});

// GET /admin/dashboard — summary metrics
router.get('/dashboard', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const [
    { count: totalVehicles },
    { count: activeAgreements },
    { count: pendingApprovals },
    { count: overduePayments },
  ] = await Promise.all([
    supabaseAdmin.from('vehicles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('rental_agreements').select('id', { count: 'exact', head: true }).eq('agreement_status', 'active'),
    supabaseAdmin.from('members').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending_approval'),
    supabaseAdmin
      .from('rental_payment_schedule')
      .select('id', { count: 'exact', head: true })
      .in('payment_status', ['overdue', 'failed'])
      .lt('due_date', format(new Date(), 'yyyy-MM-dd')),
  ]);

  // This week's revenue
  const weekStart = format(new Date(), 'yyyy-MM-dd');
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: weekPayments } = await supabaseAdmin
    .from('rental_payment_schedule')
    .select('amount_due')
    .gte('due_date', weekStart)
    .lte('due_date', weekEnd)
    .eq('payment_status', 'paid');

  const weeklyRevenue = (weekPayments ?? []).reduce((sum, p) => sum + parseFloat(p.amount_due), 0);

  // Recent audit log
  const { data: recentActivity } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return res.json({
    total_vehicles: totalVehicles ?? 0,
    active_agreements: activeAgreements ?? 0,
    pending_approvals: pendingApprovals ?? 0,
    overdue_payments: overduePayments ?? 0,
    weekly_revenue: weeklyRevenue,
    recent_activity: recentActivity ?? [],
  });
});

export default router;
