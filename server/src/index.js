import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import requestRoutes from './routes/requests.js';
import campaignRoutes from './routes/campaigns.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'bloodconnect-server' }));
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 5000);

if (process.env.MONGODB_URI) {
  await connectDB(process.env.MONGODB_URI);
} else {
  console.warn('MONGODB_URI not set — running without DB (health check only)');
}

app.listen(PORT, () => console.log(`bloodconnect-server on :${PORT}`));
