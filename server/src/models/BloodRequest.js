import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../services/compatibility.js';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bloodGroupNeeded: { type: String, enum: BLOOD_GROUPS, required: true },
    hospitalName: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    units: { type: Number, min: 1, default: 1 },
    urgency: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'normal' },
    neededBy: { type: Date },
    contactPhone: { type: String, required: true, trim: true },
    note: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'fulfilled', 'cancelled', 'expired'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.index({ location: '2dsphere' });

export const BloodRequest = mongoose.model('BloodRequest', requestSchema);
