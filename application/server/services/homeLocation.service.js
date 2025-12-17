// server/services/homeLocation.service.js
import Profile from "../models/profile.js";
import { geocodeLocation } from "./geocoding.service.js";
import { getTimeZoneForCoords } from "./commute.service.js";

export async function ensureHomeGeoForUser(userId) {
  const profile = await Profile.findOne({ userId });
  if (!profile || !profile.location) return null;

  if (profile.homeGeo && profile.homeGeo.lat && profile.homeGeo.lng &&  profile.homeGeo.userquery ==  `${ profile.location.city},${profile.location.state}`) {
    return profile;
  }
  const Homelocation =  `${ profile.location.city},${profile.location.state}`
  const geo = await geocodeLocation(Homelocation);
  if (!geo) return profile;

  const timeZone = getTimeZoneForCoords(geo.lat, geo.lng);

  profile.homeGeo = {
    lat: geo.lat,
    lng: geo.lng,
    geocodedAt: new Date(),
    userquery: `${ profile.location.city},${profile.location.state}`
  };
  profile.homeTimeZone = timeZone || profile.homeTimeZone;
  await profile.save();

  return profile;
}
