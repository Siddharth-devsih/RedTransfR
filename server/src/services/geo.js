// Haversine distance in km between [lng,lat] pairs.
export function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Rough ETA minutes assuming 30 km/h urban avg. Replaced by Maps later.
export function estimateEtaMin(distanceKm) {
  return Math.max(1, Math.round((distanceKm / 30) * 60));
}
