// validators/userPreferences.js

const VALID_SORT_OPTIONS = ['dateAdded', 'deadline', 'salary', 'company'];

// Validate search criteria (used for both lastSearch and savedSearches)
function validateSearchCriteria(input, errors, prefix = '') {
  if (input.searchQuery !== undefined) {
    if (typeof input.searchQuery !== 'string') {
      errors[`${prefix}searchQuery`] = 'Search query must be a string';
    } else if (input.searchQuery.length > 200) {
      errors[`${prefix}searchQuery`] = 'Search query must be 200 characters or less';
    }
  }

  if (input.statusFilter !== undefined) {
    if (typeof input.statusFilter !== 'string') {
      errors[`${prefix}statusFilter`] = 'Status filter must be a string';
    } else if (input.statusFilter.length > 50) {
      errors[`${prefix}statusFilter`] = 'Status filter must be 50 characters or less';
    }
  }

  if (input.industryFilter !== undefined) {
    if (typeof input.industryFilter !== 'string') {
      errors[`${prefix}industryFilter`] = 'Industry filter must be a string';
    } else if (input.industryFilter.length > 50) {
      errors[`${prefix}industryFilter`] = 'Industry filter must be 50 characters or less';
    }
  }

  if (input.locationFilter !== undefined) {
    if (typeof input.locationFilter !== 'string') {
      errors[`${prefix}locationFilter`] = 'Location filter must be a string';
    } else if (input.locationFilter.length > 150) {
      errors[`${prefix}locationFilter`] = 'Location filter must be 150 characters or less';
    }
  }

  if (input.salaryMinFilter !== undefined && input.salaryMinFilter !== null && input.salaryMinFilter !== '') {
    if (typeof input.salaryMinFilter !== 'string') {
      errors[`${prefix}salaryMinFilter`] = 'Salary min filter must be a string';
    }
  }

  if (input.salaryMaxFilter !== undefined && input.salaryMaxFilter !== null && input.salaryMaxFilter !== '') {
    if (typeof input.salaryMaxFilter !== 'string') {
      errors[`${prefix}salaryMaxFilter`] = 'Salary max filter must be a string';
    }
  }

  if (input.deadlineStartFilter !== undefined && input.deadlineStartFilter !== '') {
    if (typeof input.deadlineStartFilter !== 'string') {
      errors[`${prefix}deadlineStartFilter`] = 'Deadline start filter must be a string';
    } else if (isNaN(Date.parse(input.deadlineStartFilter))) {
      errors[`${prefix}deadlineStartFilter`] = 'Invalid date format';
    }
  }

  if (input.deadlineEndFilter !== undefined && input.deadlineEndFilter !== '') {
    if (typeof input.deadlineEndFilter !== 'string') {
      errors[`${prefix}deadlineEndFilter`] = 'Deadline end filter must be a string';
    } else if (isNaN(Date.parse(input.deadlineEndFilter))) {
      errors[`${prefix}deadlineEndFilter`] = 'Invalid date format';
    }
  }

  if (input.sortBy !== undefined && input.sortBy !== '') {
    if (!VALID_SORT_OPTIONS.includes(input.sortBy)) {
      errors[`${prefix}sortBy`] = `Sort option must be one of: ${VALID_SORT_OPTIONS.join(', ')}`;
    }
  }
}

// Clean search criteria
function cleanSearchCriteria(input) {
  return {
    searchQuery: input.searchQuery?.trim() || '',
    statusFilter: input.statusFilter || 'All',
    industryFilter: input.industryFilter || 'All',
    locationFilter: input.locationFilter?.trim() || '',
    salaryMinFilter: input.salaryMinFilter || '',
    salaryMaxFilter: input.salaryMaxFilter || '',
    deadlineStartFilter: input.deadlineStartFilter || '',
    deadlineEndFilter: input.deadlineEndFilter || '',
    sortBy: input.sortBy || 'dateAdded'
  };
}

// Validate last search (no name required)
export async function validateLastSearch(input) {
  const errors = {};
  validateSearchCriteria(input, errors);

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 422,
      error: { code: 'VALIDATION_FAILED', fields: errors }
    };
  }

  return { ok: true, value: cleanSearchCriteria(input) };
}

// Validate saved search creation (name required)
export async function validateSavedSearch(input) {
  const errors = {};

  // Name is required for saved searches
  if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
    errors.name = 'Search name is required';
  } else if (input.name.length > 100) {
    errors.name = 'Search name must be 100 characters or less';
  }

  validateSearchCriteria(input, errors);

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      status: 422,
      error: { code: 'VALIDATION_FAILED', fields: errors }
    };
  }

  return { 
    ok: true, 
    value: {
      name: input.name.trim(),
      ...cleanSearchCriteria(input)
    }
  };
}

// For backwards compatibility with old single preference API
export async function validatePreferences(input) {
  return validateLastSearch(input);
}