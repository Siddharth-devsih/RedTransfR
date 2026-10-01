import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'donor', phone } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'name, email, password required' } });
    }
    if (!['donor', 'requester', 'foundation'].includes(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'invalid role' } });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: { code: 'CONFLICT', message: 'email already registered' } });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role, phone });
    const token = signToken(user);
    res.status(201).json({ data: { id: user._id, name, email: user.email, role }, token });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'email, password required' } });
    }
    const user = await User.findOne({ email: String(email).toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'invalid credentials' } });
    }
    res.json({ data: { id: user._id, name: user.name, role: user.role }, token: signToken(user) });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
