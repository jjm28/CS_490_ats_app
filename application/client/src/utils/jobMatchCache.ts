export type JobMatchStats = {
  skillMatchScore: number;
  educationScore: number;
  overallMatchScore: number;
};

export type JobMatchDetailCache = {
  extractedSkills: string[];
  jobEducation: {
    level: string | null;
    fields: string[];
  } | null;
};

export const jobMatchStatsCache = new Map<string, JobMatchStats>();
export const jobMatchDetailCache = new Map<string, JobMatchDetailCache>();

let jobMatchListLoaded = false;

export function isJobMatchListLoaded() {
  return jobMatchListLoaded;
}

export function setJobMatchListLoaded(value: boolean) {
  jobMatchListLoaded = value;
}

export function clearJobMatchCache() {
  jobMatchStatsCache.clear();
  jobMatchDetailCache.clear();
  jobMatchListLoaded = false;
}