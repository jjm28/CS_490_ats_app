import { z } from 'zod';

const JobSchema = z.object({
  jobTitle: z.string().min(1, 'Required').max(150, 'Max 150'),
  company: z.string().min(1, 'Required').max(150, 'Max 150'),
  location: z.string().max(150, 'Max 150').default(''),
  salaryMin: z.number().nonnegative('Must be positive').optional(),
  salaryMax: z.number().nonnegative('Must be positive').optional(),
  jobPostingUrl: z.string().url('Invalid URL').max(500, 'Max 500').default(''),
  applicationDeadline: z.date().optional(),
  description: z.string().max(2000, 'Max 2000').default(''),
  industry: z.string().min(1, 'Required'),
  type: z.string().min(1, 'Required'),
}).refine(
  (data) => !data.salaryMin || !data.salaryMax || data.salaryMin <= data.salaryMax,
  { message: 'Min cannot exceed max', path: ['salaryMin'] }
);

export async function validateJobCreate(input) {
  try {
    const value = JobSchema.parse(input);
    return { ok: true, value };
  } catch (err) {
    const fields = {};
    err.errors.forEach(e => fields[e.path[0]] = e.message);
    return { ok: false, status: 422, error: { code: 'VALIDATION_FAILED', fields } };
  }
}

export async function validateJobUpdate(input) {
  try {
    const value = JobSchema.partial().parse(input);
    return { ok: true, value };
  } catch (err) {
    const fields = {};
    err.errors.forEach(e => fields[e.path[0]] = e.message);
    return { ok: false, status: 422, error: { code: 'VALIDATION_FAILED', fields } };
  }
}