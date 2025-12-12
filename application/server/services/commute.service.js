// server/services/commute.service.js
import tzLookup from "tz-lookup";

const EARTH_RADIUS_KM = 6371;

// Configurable avg commute speed (km/h)
const AVG_COMMUTE_SPEED_KMH = parseFloat(
  process.env.AVG_COMMUTE_SPEED_KMH || "40"
);

export function distanceKmBetween(a, b) {
  if (!a || !b) return null;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const aa =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return EARTH_RADIUS_KM * c;
}

export function estimateDurationMinutes(distanceKm) {
  if (distanceKm == null) return null;
  const hours = distanceKm / AVG_COMMUTE_SPEED_KMH;
  return Math.round(hours * 60);
}

export function getTimeZoneForCoords(lat, lng) {
  try {
    return tzLookup(lat, lng);
  } catch {
    return null;
  }
}

export function computeCommute(homeGeo, jobGeo, homeLocationSnapshot) {
  const distanceKm = distanceKmBetween(homeGeo, jobGeo);
  const durationMinutes = estimateDurationMinutes(distanceKm);

  return {
    distanceKm,
    durationMinutes,
    calculatedAt: new Date(),
    homeLocationSnapshot,
  };
}
