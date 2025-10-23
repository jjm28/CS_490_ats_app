// Shared constants/types for the Profile form (UC-021)

// Limits
export const LIMITS = {
  NAME_MAX: 100,
  CITY_MAX: 100,
  STATE_MAX: 100,
  HEADLINE_MAX: 120,
  BIO_MAX: 500,
};

// Dropdown values 
export type ExperienceLevel = 'Entry' | 'Mid' | 'Senior' | 'Executive';
export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Entry',
  'Mid',
  'Senior',
  'Executive',
];

export const INDUSTRIES = [
  'Software',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

// format handling
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_E164: /^\+?[1-9]\d{7,14}$/,
};

// Field keys 
export const FIELD_KEYS = {
  FULL_NAME: 'fullName',
  EMAIL: 'email',
  PHONE: 'phone',
  LOCATION: 'location',
  CITY: 'city',
  STATE: 'state',
  HEADLINE: 'headline',
  BIO: 'bio',
  INDUSTRY: 'industry',
  EXPERIENCE_LEVEL: 'experienceLevel',
  PHOTO_URL: 'photoUrl',
} as const;

// Types for the form model 
export type Location = { city: string; state: string };

export type Profile = {
  fullName: string;
  email: string;
  phone: string; 
  headline: string;
  bio: string;
  industry: Industry;
  experienceLevel: ExperienceLevel;
  location: Location;
  photoUrl?: string; // This will be added in UC-022
};

// Default field values
export const DEFAULT_PROFILE: Profile = {
  fullName: '',
  email: '',
  phone: '',
  headline: '',
  bio: '',
  industry: 'Other',
  experienceLevel: 'Entry',
  location: { city: '', state: '' },
};
