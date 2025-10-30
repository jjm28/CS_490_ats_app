// Validators for employment data

import {
  EMPLOYMENT_LIMITS,
  EMPLOYMENT_FIELDS as FIELDS,
  EMPLOYMENT_DEFAULTS,
} from '../constants/employment.js';

const { JOB_TITLE_MAX, COMPANY_MAX, LOCATION_MAX, DESCRIPTION_MAX } = EMPLOYMENT_LIMITS;

// date helpers
const toYMD = (d) => d.toISOString().slice(0, 10);
const TODAY = new Date(toYMD(new Date()));
const YESTERDAY = new Date(toYMD(new Date(Date.now() - 24 * 60 * 60 * 1000)));

const trim = (v) => (typeof v === 'string' ? v.trim() : v);

function fail(fields, status = 422) {
  return { ok: false, status, error: { code: 'VALIDATION_FAILED', fields } };
}

/** Validate create payload */
export async function validateEmploymentCreate(input) {
  const e = {};

  const jobTitle = trim(input?.[FIELDS.JOB_TITLE]);
  const company = trim(input?.[FIELDS.COMPANY]);
  const location = trim(input?.[FIELDS.LOCATION] ?? EMPLOYMENT_DEFAULTS[FIELDS.LOCATION]);
  const startDate = trim(input?.[FIELDS.START_DATE]);
  const endDateRaw = input?.[FIELDS.END_DATE] ?? EMPLOYMENT_DEFAULTS[FIELDS.END_DATE];
  const endDate = typeof endDateRaw === 'string' ? trim(endDateRaw) : endDateRaw;
  const currentPosition = Boolean(input?.[FIELDS.CURRENT_POSITION] ?? EMPLOYMENT_DEFAULTS[FIELDS.CURRENT_POSITION]);
  const description = trim(input?.[FIELDS.DESCRIPTION] ?? EMPLOYMENT_DEFAULTS[FIELDS.DESCRIPTION]);

  // required
  if (!jobTitle) e[FIELDS.JOB_TITLE] = 'Required';
  if (!company) e[FIELDS.COMPANY] = 'Required';
  if (!startDate) e[FIELDS.START_DATE] = 'Required';
  if (!currentPosition && !endDate) e[FIELDS.END_DATE] = 'Required';

  // lengths
  if (jobTitle && jobTitle.length > JOB_TITLE_MAX) e[FIELDS.JOB_TITLE] = `Max ${JOB_TITLE_MAX}`;
  if (company && company.length > COMPANY_MAX) e[FIELDS.COMPANY] = `Max ${COMPANY_MAX}`;
  if (location && location.length > LOCATION_MAX) e[FIELDS.LOCATION] = `Max ${LOCATION_MAX}`;
  if (description && description.length > DESCRIPTION_MAX) e[FIELDS.DESCRIPTION] = `Max ${DESCRIPTION_MAX}`;

  // dates
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (startDate && isNaN(start?.getTime?.())) e[FIELDS.START_DATE] = 'Invalid date';
  if (endDate && isNaN(end?.getTime?.())) e[FIELDS.END_DATE] = 'Invalid date';

  // start ≤ today
  if (start && start > TODAY) e[FIELDS.START_DATE] = 'Start cannot be in the future';

  if (!currentPosition) {
    // end ≤ yesterday
    if (end && end > YESTERDAY) e[FIELDS.END_DATE] = 'End must be on/before yesterday';
    // start ≤ end
    if (start && end && start > end) {
      e[FIELDS.START_DATE] = 'Start before end';
      e[FIELDS.END_DATE] = 'End after start';
    }
  }

  if (Object.keys(e).length) return fail(e);

  const value = {
    [FIELDS.JOB_TITLE]: jobTitle,
    [FIELDS.COMPANY]: company,
    [FIELDS.LOCATION]: location,
    [FIELDS.START_DATE]: start ? start.toISOString() : null,
    [FIELDS.END_DATE]: currentPosition ? null : (end ? end.toISOString() : null),
    [FIELDS.CURRENT_POSITION]: currentPosition,
    [FIELDS.DESCRIPTION]: description,
  };

  return { ok: true, value };
}

/** Validate update payload (partial) */
export async function validateEmploymentUpdate(input) {
  const e = {};

  const jobTitle = input?.[FIELDS.JOB_TITLE] !== undefined ? trim(input?.[FIELDS.JOB_TITLE]) : undefined;
  const company = input?.[FIELDS.COMPANY] !== undefined ? trim(input?.[FIELDS.COMPANY]) : undefined;
  const location = input?.[FIELDS.LOCATION] !== undefined ? trim(input?.[FIELDS.LOCATION]) : undefined;
  const startDate = input?.[FIELDS.START_DATE] !== undefined ? trim(input?.[FIELDS.START_DATE]) : undefined;
  const endDateRaw = input?.[FIELDS.END_DATE];
  const endDate = endDateRaw === undefined ? undefined : (typeof endDateRaw === 'string' ? trim(endDateRaw) : endDateRaw);
  const currentPosition = input?.[FIELDS.CURRENT_POSITION];
  const description = input?.[FIELDS.DESCRIPTION] !== undefined ? trim(input?.[FIELDS.DESCRIPTION]) : undefined;

  // lengths
  if (jobTitle !== undefined) {
    if (!jobTitle) e[FIELDS.JOB_TITLE] = 'Required';
    if (jobTitle && jobTitle.length > JOB_TITLE_MAX) e[FIELDS.JOB_TITLE] = `Max ${JOB_TITLE_MAX}`;
  }
  if (company !== undefined) {
    if (!company) e[FIELDS.COMPANY] = 'Required';
    if (company && company.length > COMPANY_MAX) e[FIELDS.COMPANY] = `Max ${COMPANY_MAX}`;
  }
  if (location !== undefined && location.length > LOCATION_MAX) e[FIELDS.LOCATION] = `Max ${LOCATION_MAX}`;
  if (description !== undefined && description.length > DESCRIPTION_MAX) e[FIELDS.DESCRIPTION] = `Max ${DESCRIPTION_MAX}`;

  // date parsing
  let start = undefined;
  let end = undefined;

  if (startDate !== undefined) {
    start = new Date(startDate);
    if (!startDate || isNaN(start.getTime())) e[FIELDS.START_DATE] = 'Invalid date';
    // start ≤ today
    if (!isNaN(start.getTime()) && start > TODAY) e[FIELDS.START_DATE] = 'Start cannot be in the future';
  }
  if (endDate !== undefined && endDate !== null) {
    end = new Date(endDate);
    if (isNaN(end.getTime())) e[FIELDS.END_DATE] = 'Invalid date';
    // end ≤ yesterday when not current
    const cp = input?.[FIELDS.CURRENT_POSITION];
    const cpBool = cp === undefined ? undefined : Boolean(cp);
    if ((cpBool === false || cpBool === undefined) && !isNaN(end.getTime()) && end > YESTERDAY) {
      e[FIELDS.END_DATE] = 'End must be on/before yesterday';
    }
  }

  // require end when not current
  const currentPosBool = currentPosition === undefined ? undefined : Boolean(currentPosition);
  if (currentPosBool === false) {
    if (startDate !== undefined && (endDate === undefined || endDate === null)) {
      e[FIELDS.END_DATE] = 'Required when not a current position';
    }
  }

  // ordering if both present
  const hasBoth =
    startDate !== undefined &&
    endDate !== undefined &&
    endDate !== null &&
    start instanceof Date &&
    end instanceof Date &&
    !isNaN(start.getTime()) &&
    !isNaN(end.getTime());

  if ((currentPosBool === false || currentPosBool === undefined) && hasBoth && start > end) {
    e[FIELDS.START_DATE] = 'Start before end';
    e[FIELDS.END_DATE] = 'End after start';
  }

  if (Object.keys(e).length) return fail(e);

  const value = {
    [FIELDS.JOB_TITLE]: jobTitle,
    [FIELDS.COMPANY]: company,
    [FIELDS.LOCATION]: location,
    [FIELDS.START_DATE]: startDate ? new Date(startDate).toISOString() : undefined,
    [FIELDS.END_DATE]:
      currentPosBool === true
        ? null
        : endDate === undefined
        ? undefined
        : endDate === null
        ? null
        : new Date(endDate).toISOString(),
    [FIELDS.CURRENT_POSITION]: currentPosition === undefined ? undefined : Boolean(currentPosition),
    [FIELDS.DESCRIPTION]: description,
  };

  return { ok: true, value };
}
