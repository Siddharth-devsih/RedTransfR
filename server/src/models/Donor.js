import mongoose from 'mongoose';
import { BLOOD_GROUPS } from '../services/compatibility.js';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    address: { type: String, trim: true },
  },
  { _id: false }
);

const donorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    phone: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    isAvailable: { type: Boolean, default: true },
    lastDonationDate: { type: Date },
  },
  { timestamps: true }
);

donorSchema.index({ location: '2dsphere' });
donorSchema.index({ bloodGroup: 1, isAvailable: 1 });

export const Donor = mongoose.model('Donor', donorSchema);
