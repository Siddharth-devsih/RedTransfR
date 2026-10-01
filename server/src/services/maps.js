import { estimateEtaMin, haversineKm } from './geo.js';

// Stub Maps service. Interface matches the future Google implementation so
// we can swap it later without touching the matching service.
//
// Real implementation (later): Distance Matrix / Routes API + 24h cache.
export async function enrichWithDistance(donorCoords, hospitalCoords) {
  const distanceKm = haversineKm(donorCoords, hospitalCoords);
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    etaMin: estimateEtaMin(distanceKm),
    provider: 'haversine-fallback',
  };
}
