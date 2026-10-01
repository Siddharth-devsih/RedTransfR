import { Router } from 'express';
import { Campaign, Rsvp } from '../models/Campaign.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { city, from, to, q, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };
    if (city) filter.city = city;
    if (from || to) filter.startsAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
    if (q) filter.title = { $regex: String(q), $options: 'i' };
    const docs = await Campaign.find(filter)
      .sort({ startsAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Math.min(Number(limit), 50));
    const total = await Campaign.countDocuments(filter);
    res.json({ data: docs, page: Number(page), total });
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Campaign.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'campaign not found' } });
    res.json({ data: doc });
  } catch (e) {
    next(e);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || (user.role !== 'foundation' && user.role !== 'admin')) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'foundation role required' } });
    }
    if (user.role === 'foundation' && !user.isVerifiedFoundation) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'foundation not verified yet' } });
    }
    const { title, description, venue, location, startsAt, endsAt, contactPhone, city, bannerUrl, targetUnits } = req.body ?? {};
    if (!title || !description || !venue || !startsAt || !endsAt || !contactPhone) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'missing required campaign fields' } });
    }
    const doc = await Campaign.create({
      foundationId: req.user.id,
      title, description, venue, location, startsAt, endsAt, contactPhone, city, bannerUrl, targetUnits,
    });
    res.status(201).json({ data: doc });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/rsvp', requireAuth, async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'campaign not found' } });
    await Rsvp.create({ campaignId: campaign._id, userId: req.user.id });
    campaign.rsvpCount += 1;
    await campaign.save();
    res.status(201).json({ data: { rsvpCount: campaign.rsvpCount } });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'already joined' } });
    }
    next(e);
  }
});

router.delete('/:id/rsvp', requireAuth, async (req, res, next) => {
  try {
    const deleted = await Rsvp.findOneAndDelete({ campaignId: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'rsvp not found' } });
    await Campaign.findByIdAndUpdate(req.params.id, { $inc: { rsvpCount: -1 } });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
