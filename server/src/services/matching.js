import { RADIUS_KM, compatibleDonorGroups, isExactMatch } from './compatibility.js';
import { haversineKm } from './geo.js';
import { enrichWithDistance } from './maps.js';

const MIN_GAP_DAYS = Number(process.env.MIN_GAP_DAYS ?? 90);
const TOP_N = 20;

function eligibleByDonation(donor, now = new Date()) {
  if (!donor.lastDonationDate) return true;
  const days = (now - new Date(donor.lastDonationDate)) / 86400000;
  return days >= MIN_GAP_DAYS;
}

/**
 * Rank donor documents (plain objects or Mongoose docs) for a request.
 * request: { bloodGroupNeeded, urgency, location: { coordinates: [lng,lat] } }
 */
export async function rankDonors(request, donors) {
  const needed = request.bloodGroupNeeded;
  const allowed = new Set(compatibleDonorGroups(needed));
  const radius = RADIUS_KM[request.urgency] ?? RADIUS_KM.normal;
  const hospital = request.location.coordinates;
  const now = new Date();

  const pool = donors.filter(
    (d) =>
      allowed.has(d.bloodGroup) &&
      d.isAvailable !== false &&
      eligibleByDonation(d, now) &&
      Array.isArray(d.location?.coordinates) &&
      haversineKm(d.location.coordinates, hospital) <= radius
  );

  pool.sort((a, b) => {
    const exactDiff =
      Number(!isExactMatch(a.bloodGroup, needed)) - Number(!isExactMatch(b.bloodGroup, needed));
    if (exactDiff !== 0) return exactDiff;
    return (
      haversineKm(a.location.coordinates, hospital) -
      haversineKm(b.location.coordinates, hospital)
    );
  });

  const shortlist = pool.slice(0, TOP_N);
  const ranked = [];
  for (const d of shortlist) {
    const e = await enrichWithDistance(d.location.coordinates, hospital);
    ranked.push({
      donorId: d._id,
      name: d.name ?? undefined,
      bloodGroup: d.bloodGroup,
      isExact: isExactMatch(d.bloodGroup, needed),
      phoneMasked: maskPhone(d.phone),
      ...e,
    });
  }

  ranked.sort((a, b) => Number(!a.isExact) - Number(!b.isExact) || a.etaMin - b.etaMin || a.distanceKm - b.distanceKm);
  return { matches: ranked, radiusKm: radius, provider: 'haversine-fallback', totalInRadius: pool.length };
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return 'XXXX';
  return `${String(phone).slice(0, 2)}XXXXXX${String(phone).slice(-2)}`;
}
