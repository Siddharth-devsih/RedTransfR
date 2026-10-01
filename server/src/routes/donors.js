import { Router } from 'express';
import { Donor } from '../models/Donor.js';
import { BLOOD_GROUPS } from '../services/compatibility.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function validateDonor(body) {
  const errors = [];
  if (!body?.name) errors.push('name required');
  if (!BLOOD_GROUPS.includes(body?.bloodGroup)) errors.push('valid bloodGroup required');
  if (!body?.phone || String(body.phone).replace(/\D/g, '').length < 10) errors.push('valid phone required');
  const coords = body?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2 || coords.some((n) => typeof n !== 'number')) {
    errors.push('location.coordinates [lng, lat] required');
  }
  return errors;
}

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const errors = validateDonor(req.body);
    if (errors.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errors.join('; ') } });
    const donor = await Donor.create({
      userId: req.user.id,
      name: req.body.name,
      bloodGroup: req.body.bloodGroup,
      phone: req.body.phone,
      location: { type: 'Point', coordinates: req.body.location.coordinates, address: req.body.location.address },
      isAvailable: req.body.isAvailable ?? true,
      lastDonationDate: req.body.lastDonationDate,
    });
    res.status(201).json({ data: donor });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'donor profile already exists for user' } });
    }
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const donor = await Donor.findOne({ userId: req.user.id });
    res.json({ data: donor });
  } catch (e) {
    next(e);
  }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'location', 'isAvailable', 'lastDonationDate', 'bloodGroup'];
    const update = {};
    for (const k of allowed) if (req.body?.[k] !== undefined) update[k] = req.body[k];
    if (update.bloodGroup && !BLOOD_GROUPS.includes(update.bloodGroup)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'invalid bloodGroup' } });
    }
    const donor = await Donor.findOneAndUpdate({ userId: req.user.id }, update, { new: true });
    if (!donor) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'donor profile not found' } });
    res.json({ data: donor });
  } catch (e) {
    next(e);
  }
});

export default router;
