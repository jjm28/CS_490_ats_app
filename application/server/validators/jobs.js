// validators/jobs.js

const VALID_STATUSES = ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

function validateContact(contact, fieldName, errors) {
  if (typeof contact !== 'object' || contact === null) {
    errors[fieldName] = `${fieldName} must be an object`;
    return;
  }

  const { name, email, phone, linkedIn, notes } = contact;

  if (name && name.length > 150) {
    errors[`${fieldName}.name`] = 'Name must be 150 characters or less';
  }

  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors[`${fieldName}.email`] = 'Invalid email format';
    } else if (email.length > 150) {
      errors[`${fieldName}.email`] = 'Email must be 150 characters or less';
    }
  }

  if (phone && phone.length > 50) {
    errors[`${fieldName}.phone`] = 'Phone must be 50 characters or less';
  }

  if (linkedIn) {
    if (linkedIn.length > 500) {
      errors[`${fieldName}.linkedIn`] = 'LinkedIn URL must be 500 characters or less';
    } else if (!/^https?:\/\/|^linkedin\.com/.test(linkedIn)) {
      errors[`${fieldName}.linkedIn`] = 'Invalid LinkedIn URL format';
    }
  }

  if (notes && notes.length > 2000) {
    errors[`${fieldName}.notes`] = 'Notes must be 2000 characters or less';
  }
}

export async function validateJobCreate(input) {
  const errors = {};

  // Required fields
  if (!input.jobTitle || input.jobTitle.trim() === '') {
    errors.jobTitle = 'Job title is required';
  } else if (input.jobTitle.length > 150) {
    errors.jobTitle = 'Job title must be 150 characters or less';
  }

  if (!input.company || input.company.trim() === '') {
    errors.company = 'Company is required';
  } else if (input.company.length > 150) {
    errors.company = 'Company must be 150 characters or less';
  }

  if (!input.industry || input.industry.trim() === '') {
    errors.industry = 'Industry is required';
  }

  if (!input.type || input.type.trim() === '') {
    errors.type = 'Job type is required';
  }

  // Optional fields
  if (input.location && input.location.length > 150) {
    errors.location = 'Location must be 150 characters or less';
  }

  if (input.description && input.description.length > 2000) {
    errors.description = 'Description must be 2000 characters or less';
  }

  if (input.salaryMin !== undefined && input.salaryMin !== null) {
    if (typeof input.salaryMin !== 'number' || input.salaryMin < 0) {
      errors.salaryMin = 'Salary min must be a positive number';
    }
  }

  if (input.salaryMax !== undefined && input.salaryMax !== null) {
    if (typeof input.salaryMax !== 'number' || input.salaryMax < 0) {
      errors.salaryMax = 'Salary max must be a positive number';
    }
  }

  if (input.salaryMin && input.salaryMax && input.salaryMin > input.salaryMax) {
    errors.salaryMin = 'Salary min cannot exceed salary max';
  }

  if (input.jobPostingUrl && input.jobPostingUrl.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(input.jobPostingUrl)) {
      errors.jobPostingUrl = 'Invalid URL format';
    } // else if (input.jobPostingUrl.length > 500) {
    //   errors.jobPostingUrl = 'URL must be 500 characters or less';
    // }
  }

  if (input.applicationDeadline) {
    const date = new Date(input.applicationDeadline);
    if (isNaN(date.getTime())) {
      errors.applicationDeadline = 'Invalid date format';
    }
  }

  // Auto-archive validation
  if (input.autoArchiveDays !== undefined && input.autoArchiveDays !== null) {
    const n = Number(input.autoArchiveDays);
    if (isNaN(n) || n < 1) {
      errors.autoArchiveDays = 'Auto-archive days must be a positive number';
    }
  }


  // Status validation
  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  if (input.recruiter) validateContact(input.recruiter, 'recruiter', errors);
  if (input.hiringManager) validateContact(input.hiringManager, 'hiringManager', errors);

  // Notes
  if (input.notes && input.notes.length > 2000) {
    errors.notes = 'Notes must be 2000 characters or less';
  }
  if (input.salaryNotes && input.salaryNotes.length > 2000) {
    errors.salaryNotes = 'Salary notes must be 2000 characters or less';
  }
  if (input.interviewNotes && input.interviewNotes.length > 2000) {
    errors.interviewNotes = 'Interview notes must be 2000 characters or less';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 422, error: { code: 'VALIDATION_FAILED', fields: errors } };
  }

  // Cleaned return
  const value = {
    jobTitle: input.jobTitle.trim(),
    company: input.company.trim(),
    industry: input.industry.trim(),
    type: input.type.trim(),
    location: input.location?.trim() || '',
    description: input.description?.trim() || '',
    jobPostingUrl: input.jobPostingUrl?.trim() || '',
    salaryMin: input.salaryMin ?? null,
    salaryMax: input.salaryMax ?? null,
    applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
    status: input.status || 'interested',
    recruiter: input.recruiter || null,
    hiringManager: input.hiringManager || null,
    notes: input.notes?.trim() || '',
    salaryNotes: input.salaryNotes?.trim() || '',
    interviewNotes: input.interviewNotes?.trim() || '',
    autoArchiveDays: input.autoArchiveDays
      ? Number(input.autoArchiveDays)
      : 60,
    autoArchiveDate: input.createdAt
      ? new Date(
        new Date(input.createdAt).getTime() +
        (input.autoArchiveDays || 60) * 24 * 60 * 60 * 1000
      )
      : undefined,

  };

  return { ok: true, value };
}

export async function validateJobUpdate(input) {
  const errors = {};

  // Simple field validations
  if (input.jobTitle !== undefined) {
    if (input.jobTitle.trim() === '') errors.jobTitle = 'Job title cannot be empty';
    else if (input.jobTitle.length > 150) errors.jobTitle = 'Job title must be 150 characters or less';
  }

  if (input.company !== undefined) {
    if (input.company.trim() === '') errors.company = 'Company cannot be empty';
    else if (input.company.length > 150) errors.company = 'Company must be 150 characters or less';
  }

  if (input.industry !== undefined && input.industry.trim() === '') {
    errors.industry = 'Industry cannot be empty';
  }

  if (input.type !== undefined && input.type.trim() === '') {
    errors.type = 'Job type cannot be empty';
  }

  if (input.location !== undefined && input.location.length > 150) {
    errors.location = 'Location must be 150 characters or less';
  }

  if (input.description !== undefined && input.description.length > 2000) {
    errors.description = 'Description must be 2000 characters or less';
  }

  if (input.salaryMin !== undefined && input.salaryMin < 0) {
    errors.salaryMin = 'Salary min must be positive';
  }

  if (input.salaryMax !== undefined && input.salaryMax < 0) {
    errors.salaryMax = 'Salary max must be positive';
  }

  if (input.salaryMin && input.salaryMax && input.salaryMin > input.salaryMax) {
    errors.salaryMin = 'Salary min cannot exceed salary max';
  }

  if (input.jobPostingUrl !== undefined && input.jobPostingUrl.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(input.jobPostingUrl)) {
      errors.jobPostingUrl = 'Invalid URL format';
    } // else if (input.jobPostingUrl.length > 500) {
    //   errors.jobPostingUrl = 'URL must be 500 characters or less';
    // }
  }

  if (input.applicationDeadline !== undefined) {
    const date = new Date(input.applicationDeadline);
    if (isNaN(date.getTime())) errors.applicationDeadline = 'Invalid date format';
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  if (input.recruiter) validateContact(input.recruiter, 'recruiter', errors);
  if (input.hiringManager) validateContact(input.hiringManager, 'hiringManager', errors);

  // Notes
  if (input.notes && input.notes.length > 2000) errors.notes = 'Notes must be 2000 characters or less';
  if (input.salaryNotes && input.salaryNotes.length > 2000)
    errors.salaryNotes = 'Salary notes must be 2000 characters or less';
  if (input.interviewNotes && input.interviewNotes.length > 2000)
    errors.interviewNotes = 'Interview notes must be 2000 characters or less';

  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 422, error: { code: 'VALIDATION_FAILED', fields: errors } };
  }

  const value = { ...input };
  if (input.applicationDeadline) value.applicationDeadline = new Date(input.applicationDeadline);

  return { ok: true, value };
}

/**
 * Validate status update request
 */
export async function validateStatusUpdate(input) {
  const errors = {};

  // Status is required
  if (!input.status) {
    errors.status = 'Status is required';
  } else if (!VALID_STATUSES.includes(input.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  // Note is optional but has max length
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== 'string') {
      errors.note = 'Note must be a string';
    } else if (input.note.length > 500) {
      errors.note = 'Note must be 500 characters or less';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 422,
      error: { code: 'VALIDATION_FAILED', fields: errors }
    };
  }

  const value = {
    status: input.status
  };

  if (input.note !== undefined && input.note !== null) {
    value.note = input.note.trim();
  }

  return { ok: true, value };
}

/**
 * Validate bulk status update request
 */
export async function validateBulkStatusUpdate(input) {
  const errors = {};

  // Job IDs array is required
  if (!input.jobIds) {
    errors.jobIds = 'Job IDs array is required';
  } else if (!Array.isArray(input.jobIds)) {
    errors.jobIds = 'Job IDs must be an array';
  } else if (input.jobIds.length === 0) {
    errors.jobIds = 'At least one job ID is required';
  } else if (input.jobIds.length > 50) {
    errors.jobIds = 'Cannot update more than 50 jobs at once';
  } else {
    // Validate each ID is a string
    const invalidIds = input.jobIds.filter(id => typeof id !== 'string' || id.trim() === '');
    if (invalidIds.length > 0) {
      errors.jobIds = 'All job IDs must be non-empty strings';
    }
  }

  // Status is required
  if (!input.status) {
    errors.status = 'Status is required';
  } else if (!VALID_STATUSES.includes(input.status)) {
    errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
  }

  // Note is optional but has max length
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== 'string') {
      errors.note = 'Note must be a string';
    } else if (input.note.length > 500) {
      errors.note = 'Note must be 500 characters or less';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 422,
      error: { code: 'VALIDATION_FAILED', fields: errors }
    };
  }

  const value = {
    jobIds: input.jobIds.map(id => id.trim()),
    status: input.status
  };

  if (input.note !== undefined && input.note !== null) {
    value.note = input.note.trim();
  }

  return { ok: true, value };
}

