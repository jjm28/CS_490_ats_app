// Validators for user profile data. applying the rules defined in constants/profile.js


// getting necessary constants and functions from profile constants
import {
  PROFILE_LIMITS,
  PROFILE_ENUMS,
  PROFILE_PATTERNS,
  PROFILE_FIELDS as FIELDS,
  PROFILE_DEFAULTS,
  loadProfileEnumsFromDataSource,
} from '../constants/profile.js';

// Creating easier access to limits and patterns
const { NAME_MAX, CITY_MAX, STATE_MAX, HEADLINE_MAX, BIO_MAX } = PROFILE_LIMITS;
const { EMAIL, PHONE_E164 } = PROFILE_PATTERNS;

// Trim helper
const trim = (v) => (typeof v === 'string' ? v.trim() : v);

// Build error result if validation of fields fails
function fail(fields, status = 422) {
  return { ok: false, status, error: { code: 'VALIDATION_FAILED', fields } };
}

// Main validator (async to allow dynamic enums)
export async function validateProfile(input, { enums } = {}) {
  const e = {}; // field errors

  // Use dynamic enums if provided/available; else static
  const loadedEnums =
    enums || (await loadProfileEnumsFromDataSource().catch(() => PROFILE_ENUMS));
  const EXP = loadedEnums.EXPERIENCE_LEVELS || PROFILE_ENUMS.EXPERIENCE_LEVELS;
  const IND = loadedEnums.INDUSTRIES || PROFILE_ENUMS.INDUSTRIES;

  // Normalizing user entries
  const fullName = trim(input?.[FIELDS.FULL_NAME]);
  const email = trim(input?.[FIELDS.EMAIL])?.toLowerCase();
  const phone = trim(input?.[FIELDS.PHONE] ?? PROFILE_DEFAULTS[FIELDS.PHONE]);
  const headline = trim(input?.[FIELDS.HEADLINE] ?? PROFILE_DEFAULTS[FIELDS.HEADLINE]);
  const bio = trim(input?.[FIELDS.BIO] ?? PROFILE_DEFAULTS[FIELDS.BIO]);
  const industry = trim(input?.[FIELDS.INDUSTRY]);
  const experienceLevel = trim(input?.[FIELDS.EXPERIENCE_LEVEL]);
  const loc = input?.[FIELDS.LOCATION] ?? PROFILE_DEFAULTS[FIELDS.LOCATION];
  const city = trim(loc?.[FIELDS.CITY]);
  const state = trim(loc?.[FIELDS.STATE]);

  // Required
  if (!fullName) e[FIELDS.FULL_NAME] = 'Required';
  if (!email) e[FIELDS.EMAIL] = 'Required';
  if (!industry) e[FIELDS.INDUSTRY] = 'Required';
  if (!experienceLevel) e[FIELDS.EXPERIENCE_LEVEL] = 'Required';
  if (!city) e[`${FIELDS.LOCATION}.${FIELDS.CITY}`] = 'Required';
  if (!state) e[`${FIELDS.LOCATION}.${FIELDS.STATE}`] = 'Required';

  // Lengths
  if (fullName && fullName.length > NAME_MAX) e[FIELDS.FULL_NAME] = `Max ${NAME_MAX}`;
  if (city && city.length > CITY_MAX) e[`${FIELDS.LOCATION}.${FIELDS.CITY}`] = `Max ${CITY_MAX}`;
  if (state && state.length > STATE_MAX) e[`${FIELDS.LOCATION}.${FIELDS.STATE}`] = `Max ${STATE_MAX}`;
  if (headline && headline.length > HEADLINE_MAX) e[FIELDS.HEADLINE] = `Max ${HEADLINE_MAX}`;
  if (bio && bio.length > BIO_MAX) e[FIELDS.BIO] = `Max ${BIO_MAX}`;

  // Formats
  if (email && !EMAIL.test(email)) e[FIELDS.EMAIL] = 'Invalid email';
  if (phone && !PHONE_E164.test(phone)) e[FIELDS.PHONE] = 'Invalid phone (+countrycode…)';

  // Enums
  if (industry && !IND.includes(industry)) e[FIELDS.INDUSTRY] = 'Invalid value';
  if (experienceLevel && !EXP.includes(experienceLevel)) e[FIELDS.EXPERIENCE_LEVEL] = 'Invalid value';

  if (Object.keys(e).length) return fail(e);

  // Clean output
  const value = {
    [FIELDS.FULL_NAME]: fullName,
    [FIELDS.EMAIL]: email,
    [FIELDS.PHONE]: phone,
    [FIELDS.HEADLINE]: headline,
    [FIELDS.BIO]: bio,
    [FIELDS.INDUSTRY]: industry,
    [FIELDS.EXPERIENCE_LEVEL]: experienceLevel,
    [FIELDS.LOCATION]: { [FIELDS.CITY]: city, [FIELDS.STATE]: state },
  };

  return { ok: true, value };
}