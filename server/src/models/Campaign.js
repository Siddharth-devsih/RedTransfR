import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: { type: String, trim: true },
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    foundationId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    bannerUrl: { type: String, trim: true },
    venue: { type: String, required: true, trim: true },
    location: { type: pointSchema, required: true },
    city: { type: String, trim: true, index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    targetUnits: { type: Number, min: 1 },
    contactPhone: { type: String, required: true, trim: true },
    isPublished: { type: Boolean, default: true },
    rsvpCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

campaignSchema.index({ city: 1, startsAt: 1 });
campaignSchema.index({ location: '2dsphere' });

export const Campaign = mongoose.model('Campaign', campaignSchema);

const rsvpSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

rsvpSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

export const Rsvp = mongoose.model('Rsvp', rsvpSchema);
