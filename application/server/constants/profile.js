import { getDb } from '../db/connection.js';
import express from "express";
import { ObjectId } from "mongodb";
import { verifyJWT } from "../middleware/auth.js";

// Max character limits for various profile fields
export const PROFILE_LIMITS = Object.freeze({
    NAME_MAX: 100,
    CITY_MAX: 100,
    STATE_MAX: 100,
    BIO_MAX: 500,
    HEADLINE_MAX: 150
});
// Creating user dropdown enums for profile details and preferences
export const PROFILE_ENUMS = Object.freeze({
    EXPERIENCE_LEVELS: Object.freeze(["Entry", "Mid", "Senior", "Executive"]),
    INDUSTRIES: Object.freeze([
    "Software",
    "Finance",
    "Healthcare",
    "Education",
    "Manufacturing",
    "Retail",
    "Other",
  ])
});
// Checking patterns to verifiy email and phone number formats
export const PROFILE_PATTERNS = Object.freeze({
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_E164: /^\+?[1-9]\d{7,14}$/,
});
// Keys for profile fields in the database
export const PROFILE_FIELDS = Object.freeze({
  FULL_NAME: "fullName",
  EMAIL: "email",
  PHONE: "phone",
  LOCATION: "location",
  CITY: "city",
  STATE: "state",
  HEADLINE: "headline",
  BIO: "bio",
  INDUSTRY: "industry",
  EXPERIENCE_LEVEL: "experienceLevel",
  PHOTO_URL: "photoUrl", 
});
// Default values for optional fields
export const PROFILE_DEFAULTS = Object.freeze({
  [PROFILE_FIELDS.PHONE]: "",
  [PROFILE_FIELDS.HEADLINE]: "",
  [PROFILE_FIELDS.BIO]: "",
  [PROFILE_FIELDS.INDUSTRY]: "Other",
  [PROFILE_FIELDS.EXPERIENCE_LEVEL]: "Entry",
  [PROFILE_FIELDS.LOCATION]: {
    [PROFILE_FIELDS.CITY]: "",
    [PROFILE_FIELDS.STATE]: "",
  },
});
//Used for dynamic loading of enums from data source in future
export async function loadProfileEnumsFromDataSource(/* deps */) {
  try {
    const db = getDb(); 
    const coll = db.collection('lookups'); // expected user entries collection

    const [industriesDocs, levelsDocs] = await Promise.all([
        // Fetch active industries sorted by order and name and confriming what to search
      coll.find({ type: 'industry', active: true })
          .sort({ order: 1, name: 1 })
          .project({ _id: 0, name: 1 })
          .toArray(),
      coll.find({ type: 'experienceLevel', active: true })
          .sort({ order: 1 })
          .project({ _id: 0, name: 1 })
          .toArray(),
    ]);
    const INDUSTRIES = industriesDocs.length
      ? Object.freeze(industriesDocs.map(d => d.name))
      : PROFILE_ENUMS.INDUSTRIES;
    const EXPERIENCE_LEVELS = levelsDocs.length
      ? Object.freeze(levelsDocs.map(d => d.name))
      : PROFILE_ENUMS.EXPERIENCE_LEVELS;

    return Object.freeze({ INDUSTRIES, EXPERIENCE_LEVELS });
  } catch (err) {
    // If DB not ready use static values
    return PROFILE_ENUMS;
  }
}
// Profile constants bundled together for easy import
export const PROFILE_CONSTANTS = Object.freeze({
  LIMITS: PROFILE_LIMITS,
  ENUMS: PROFILE_ENUMS,
  PATTERNS: PROFILE_PATTERNS,
  FIELDS: PROFILE_FIELDS,
  DEFAULTS: PROFILE_DEFAULTS,
});

