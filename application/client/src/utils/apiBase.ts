const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5050';

export default API_BASE;

// Export common endpoints for convenience
export const API_ENDPOINTS = {
  // Auth
  AUTH_BASE: `${API_BASE}/api/auth`,
  AUTH_LOGIN: `${API_BASE}/api/auth/login`,
  AUTH_REGISTER: `${API_BASE}/api/auth/register`,
  AUTH_LOGOUT: `${API_BASE}/api/auth/logout`,
  AUTH_GOOGLE: `${API_BASE}/api/auth/google`,
  AUTH_MICROSOFT: `${API_BASE}/api/auth/microsoft`,
  AUTH_LINKEDIN: `${API_BASE}/api/auth/linkedin`,
  AUTH_GITHUB: `${API_BASE}/api/auth/github`,
  
  // Jobs
  JOBS_BASE: `${API_BASE}/api/jobs`,
  
  // Interviews
  INTERVIEWS_BASE: `${API_BASE}/api/interviews`,
  
  // Networking
  NETWORKING_BASE: `${API_BASE}/api/networking`,
  
  // Resume
  RESUME_BASE: `${API_BASE}/api/resume`,
  
  // Cover Letter
  COVERLETTER_BASE: `${API_BASE}/api/coverletter`,
  
  // Analytics
  ANALYTICS_BASE: `${API_BASE}/api/analytics`,
  
  // Profile
  PROFILE_BASE: `${API_BASE}/api/profile`,
  
  // Teams
  TEAMS_BASE: `${API_BASE}/api/teams`,
};

// Helper to build custom API paths
export const buildApiUrl = (path: string): string => {
  const cleanPath = path.replace(/^\//, '');
  return `${API_BASE}/${cleanPath}`;
};

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log('  Environment:', import.meta.env.MODE);
  console.log('  API Base URL:', API_BASE);
}