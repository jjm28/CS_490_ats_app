// validators/jobs.js

const VALID_STATUSES = ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected'];

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

  // Optional fields with validation
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

  // Salary range validation
  if (input.salaryMin && input.salaryMax && input.salaryMin > input.salaryMax) {
    errors.salaryMin = 'Salary min cannot exceed salary max';
  }

  if (input.jobPostingUrl && input.jobPostingUrl.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(input.jobPostingUrl)) {
      errors.jobPostingUrl = 'Invalid URL format';
    } else if (input.jobPostingUrl.length > 500) {
      errors.jobPostingUrl = 'URL must be 500 characters or less';
    }
  }

  if (input.applicationDeadline) {
    const date = new Date(input.applicationDeadline);
    if (isNaN(date.getTime())) {
      errors.applicationDeadline = 'Invalid date format';
    }
  }

  // NEW: Status validation (optional on create, defaults to 'interested')
  if (input.status !== undefined && input.status !== null) {
    if (!VALID_STATUSES.includes(input.status)) {
      errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
    }
  }

  // Return result
  if (Object.keys(errors).length > 0) {
    return { 
      ok: false, 
      status: 422, 
      error: { code: 'VALIDATION_FAILED', fields: errors } 
    };
  }

  // Clean and return validated data
  const value = {
    jobTitle: input.jobTitle.trim(),
    company: input.company.trim(),
    industry: input.industry.trim(),
    type: input.type.trim(),
    location: input.location?.trim() || '',
    description: input.description?.trim() || '',
    jobPostingUrl: input.jobPostingUrl?.trim() || '',
  };

  if (input.salaryMin !== undefined && input.salaryMin !== null) {
    value.salaryMin = input.salaryMin;
  }
  if (input.salaryMax !== undefined && input.salaryMax !== null) {
    value.salaryMax = input.salaryMax;
  }
  if (input.applicationDeadline) {
    value.applicationDeadline = new Date(input.applicationDeadline);
  }

  // NEW: Include status if provided (otherwise defaults to 'interested' in schema)
  if (input.status) {
    value.status = input.status;
  }

  return { ok: true, value };
}

export async function validateJobUpdate(input) {
  const errors = {};

  // All fields are optional for updates, but validate if provided
  if (input.jobTitle !== undefined) {
    if (input.jobTitle.trim() === '') {
      errors.jobTitle = 'Job title cannot be empty';
    } else if (input.jobTitle.length > 150) {
      errors.jobTitle = 'Job title must be 150 characters or less';
    }
  }

  if (input.company !== undefined) {
    if (input.company.trim() === '') {
      errors.company = 'Company cannot be empty';
    } else if (input.company.length > 150) {
      errors.company = 'Company must be 150 characters or less';
    }
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

  if (input.jobPostingUrl !== undefined && input.jobPostingUrl.trim() !== '') {
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(input.jobPostingUrl)) {
      errors.jobPostingUrl = 'Invalid URL format';
    } else if (input.jobPostingUrl.length > 500) {
      errors.jobPostingUrl = 'URL must be 500 characters or less';
    }
  }

  if (input.applicationDeadline !== undefined) {
    const date = new Date(input.applicationDeadline);
    if (isNaN(date.getTime())) {
      errors.applicationDeadline = 'Invalid date format';
    }
  }

  // NEW: Status validation for updates
  if (input.status !== undefined && input.status !== null) {
    if (!VALID_STATUSES.includes(input.status)) {
      errors.status = `Status must be one of: ${VALID_STATUSES.join(', ')}`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { 
      ok: false, 
      status: 422, 
      error: { code: 'VALIDATION_FAILED', fields: errors } 
    };
  }

  // Clean the input
  const value = {};
  
  if (input.jobTitle !== undefined) value.jobTitle = input.jobTitle.trim();
  if (input.company !== undefined) value.company = input.company.trim();
  if (input.industry !== undefined) value.industry = input.industry.trim();
  if (input.type !== undefined) value.type = input.type.trim();
  if (input.location !== undefined) value.location = input.location.trim();
  if (input.description !== undefined) value.description = input.description.trim();
  if (input.jobPostingUrl !== undefined) value.jobPostingUrl = input.jobPostingUrl.trim();
  if (input.salaryMin !== undefined) value.salaryMin = input.salaryMin;
  if (input.salaryMax !== undefined) value.salaryMax = input.salaryMax;
  if (input.applicationDeadline !== undefined) {
    value.applicationDeadline = new Date(input.applicationDeadline);
  }

  // NEW: Include status if provided
  if (input.status !== undefined) {
    value.status = input.status;
  }

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