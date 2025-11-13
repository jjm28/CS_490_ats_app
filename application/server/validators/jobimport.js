// validators/jobimport.js

/**
 * Validate job import from URL request
 */
export async function validateJobImport(input) {
  const errors = {};

  // URL is required
  if (!input.url) {
    errors.url = 'URL is required';
  } else if (typeof input.url !== 'string') {
    errors.url = 'URL must be a string';
  } else {
    // Validate URL format
    let testUrl = input.url.trim();
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      testUrl = 'https://' + testUrl;
    }
    
    try {
      new URL(testUrl);
    } catch {
      errors.url = 'Please enter a valid URL (e.g., https://example.com/job)';
    }
  }

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
      url: input.url.trim()
    }
  };
}