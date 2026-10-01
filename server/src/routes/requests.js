import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { BloodRequest } from '../models/BloodRequest.js';
import { Donor } from '../models/Donor.js';
import { BLOOD_GROUPS, RADIUS_KM } from '../services/compatibility.js';
import { rankDonors } from '../services/matching.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const matchLimiter = rateLimit({ windowMs: 60_000, max: 60 });

function validateRequest(body) {
  const errors = [];
  if (!BLOOD_GROUPS.includes(body?.bloodGroupNeeded)) errors.push('valid bloodGroupNeeded required');
  if (!body?.hospitalName) errors.push('hospitalName required');
  const coords = body?.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2 || coords.some((n) => typeof n !== 'number')) {
    errors.push('location.coordinates [lng, lat] required');
  }
  if (body?.urgency && !Object.keys(RADIUS_KM).includes(body.urgency)) errors.push('invalid urgency');
  if (body?.units !== undefined && (typeof body.units !== 'number' || body.units < 1)) errors.push('units must be >= 1');
  if (!body?.contactPhone) errors.push('contactPhone required');
  return errors;
}

router.post('/', async (req, res, next) => {
  try {
    const errors = validateRequest(req.body);
    if (errors.length) return res.status(400).json({ error: { code: 'VALIDATION', message: errors.join('; ') } });
    const doc = await BloodRequest.create({
      requesterId: req.body.requesterId,
      bloodGroupNeeded: req.body.bloodGroupNeeded,
      hospitalName: req.body.hospitalName,
      location: { type: 'Point', coordinates: req.body.location.coordinates, address: req.body.location.address },
      units: req.body.units ?? 1,
      urgency: req.body.urgency ?? 'normal',
      neededBy: req.body.neededBy,
      contactPhone: req.body.contactPhone,
      note: req.body.note,
    });
    res.status(201).json({ data: doc });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await BloodRequest.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'request not found' } });
    res.json({ data: doc });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/matches', matchLimiter, async (req, res, next) => {
  try {
    const doc = await BloodRequest.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'request not found' } });
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    // Geo pre-filter in Mongo would use $near here; in-memory for v1 simplicity.
    const donors = await Donor.find({ isAvailable: true }).lean();
    const result = await rankDonors(doc, donors);
    result.matches = result.matches.slice(0, limit);
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (!['contacted', 'fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'invalid status' } });
    }
    const doc = await BloodRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'request not found' } });
    res.json({ data: doc });
  } catch (e) {
    next(e);
  }
});

export default router;
