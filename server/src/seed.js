import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { Donor } from './models/Donor.js';

// Sample donors across Delhi for local testing. Coordinates ~ [lng, lat].
const SAMPLE = [
  { name: 'Aarav Sharma', bloodGroup: 'B+', phone: '9811111111', coords: [77.209, 28.6139], address: 'Connaught Place, Delhi' },
  { name: 'Priya Verma', bloodGroup: 'O-', phone: '9822222222', coords: [77.23, 28.62], address: 'Karol Bagh, Delhi' },
  { name: 'Rohan Gupta', bloodGroup: 'B+', phone: '9833333333', coords: [77.19, 28.6], address: 'RK Puram, Delhi' },
  { name: 'Neha Singh', bloodGroup: 'AB+', phone: '9844444444', coords: [77.28, 28.65], address: 'Laxmi Nagar, Delhi' },
  { name: 'Karan Mehta', bloodGroup: 'O+', phone: '9855555555', coords: [77.1, 28.55], address: 'Dwarka, Delhi' },
];

await connectDB(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/bloodconnect');
await Donor.deleteMany({});
await Donor.insertMany(
  SAMPLE.map((s) => ({
    name: s.name,
    bloodGroup: s.bloodGroup,
    phone: s.phone,
    location: { type: 'Point', coordinates: s.coords, address: s.address },
    isAvailable: true,
  }))
);
console.log(`seeded ${SAMPLE.length} donors`);
await mongoose.disconnect();
