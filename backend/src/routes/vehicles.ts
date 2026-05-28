import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import { supabaseAdmin, writeAuditLog } from '../services/supabase';
import { authenticate, requireAdmin } from '../middleware/auth';
import { calculatePricing } from '../utils/paymentSchedule';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /admin/vehicles
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('make').trim().notEmpty(),
    body('model').trim().notEmpty(),
    body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
    body('rego').trim().notEmpty(),
    body('vin').trim().notEmpty(),
    body('engine_number').trim().notEmpty(),
    body('purchase_price').isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { purchase_price, ...rest } = req.body;
    const pricing = calculatePricing(parseFloat(purchase_price));

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert({ ...rest, purchase_price, ...pricing, vehicle_status: 'available' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Vehicle with that rego, VIN, or engine number already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    await writeAuditLog(req.user!.id, 'vehicle.created', 'vehicle', data.id, { rego: data.rego });
    return res.status(201).json(data);
  }
);

// GET /admin/vehicles
router.get(
  '/',
  authenticate,
  requireAdmin,
  [
    query('status').optional().isIn(['available', 'assigned_to_member', 'in_service', 'retired']),
    query('location_id').optional().isUUID(),
  ],
  async (req: Request, res: Response) => {
    let q = supabaseAdmin.from('vehicles').select('*, dealership_locations(name)').order('created_at', { ascending: false });

    if (req.query.status) q = q.eq('vehicle_status', req.query.status as string);
    if (req.query.location_id) q = q.eq('location_id', req.query.location_id as string);

    // Location admins scoped to their location
    if (req.user!.user_type === 'location_admin' && req.user!.location_id) {
      q = q.eq('location_id', req.user!.location_id);
    }

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
);

// GET /admin/vehicles/:id
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('*, dealership_locations(name), rental_agreements(id, agreement_status, member_id, start_date)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Vehicle not found' });
  return res.json(data);
});

// PUT /admin/vehicles/:id
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    // Prevent modification of immutable fields
    const { rego, vin, engine_number, ...updates } = req.body;
    void rego; void vin; void engine_number;

    if (updates.purchase_price) {
      const pricing = calculatePricing(parseFloat(updates.purchase_price));
      updates.weekly_rental_amount = pricing.weekly_rental_amount;
      updates.deposit_amount = pricing.deposit_amount;
    }

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Vehicle not found' });

    await writeAuditLog(req.user!.id, 'vehicle.updated', 'vehicle', data.id);
    return res.json(data);
  }
);

// POST /admin/vehicles/:id/invoice — upload invoice
router.post(
  '/:id/invoice',
  authenticate,
  requireAdmin,
  upload.single('invoice'),
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Only PDF, JPG, PNG files are allowed' });
    }

    const ext = req.file.originalname.split('.').pop();
    const path = `${req.params.id}/invoice.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('vehicle_invoices')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    await supabaseAdmin.from('vehicles').update({ invoice_file_path: path }).eq('id', req.params.id);

    await writeAuditLog(req.user!.id, 'vehicle.invoice_uploaded', 'vehicle', req.params.id);
    return res.json({ path });
  }
);

// GET /admin/vehicles/:id/invoice — signed URL
router.get('/:id/invoice', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { data: vehicle } = await supabaseAdmin
    .from('vehicles')
    .select('invoice_file_path')
    .eq('id', req.params.id)
    .single();

  if (!vehicle?.invoice_file_path) return res.status(404).json({ error: 'No invoice on file' });

  const { data, error } = await supabaseAdmin.storage
    .from('vehicle_invoices')
    .createSignedUrl(vehicle.invoice_file_path, 86400);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ url: data.signedUrl });
});

export default router;
