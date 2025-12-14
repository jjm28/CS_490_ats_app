// server/services/geocoding.service.js
import GeocodeCache from "../models/geocodeCache.js";
import fetch from "node-fetch"; // ensure this is installed
import { URLSearchParams } from "url";

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org/search";

const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL; // recommended by Nominatim
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || "OnTrack-ATS/1.0 (Nominatim usage)";

function normalizeLocation(location) {
  if (!location) return "";
  return location
    .toLowerCase()
    .replace(/[^\w\s,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function geocodeLocation(locationRaw) {
  const normalized = normalizeLocation(locationRaw);
  if (!normalized) return null;

  // 1. Check cache
  let cached = await GeocodeCache.findOne({ query: normalized }).lean();
  if (cached) {
    await GeocodeCache.updateOne(
      { _id: cached._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch(() => {});
    return {
      lat: cached.lat,
      lng: cached.lng,
      raw: cached.raw,
    };
  }

  // 2. Call Nominatim (respect usage guidelines)
  const params = new URLSearchParams({
    q: locationRaw,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
  });

  if (NOMINATIM_EMAIL) {
    params.append("email", NOMINATIM_EMAIL);
  }

  const url = `${NOMINATIM_BASE_URL}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": NOMINATIM_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    console.error("Nominatim error", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const best = data[0];
  const lat = parseFloat(best.lat);
  const lng = parseFloat(best.lon);

  const address = best.address || {};

  const geoMeta = {
    lat,
    lng,
    raw: best,
    normalizedAddress: best.display_name,
    countryCode: address.country_code,
    city: address.city || address.town || address.village || address.hamlet,
    state: address.state,
    postalCode: address.postcode,
  };

  // 3. Save to cache
  try {
    await GeocodeCache.create({
      query: normalized,
      lat,
      lng,
      raw: best,
    });
  } catch (err) {
    // ignore unique conflicts etc.
    console.warn("Geocode cache write error:", err.message);
  }

  return {
    lat,
    lng,
    ...geoMeta,
  };
}
