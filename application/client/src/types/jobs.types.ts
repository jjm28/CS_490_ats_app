// ============================================
// JOB TYPES - Consolidated type definitions
// ============================================

// Contact interface for structured contact information
export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  notes?: string;
}

// Main Job interface with updated contact fields
export interface Job {
  _id: string;
  userId?: string;
  
  // Basic job info
  jobTitle: string;
  company: string;
  location?: string;
  salaryMin?: number | { $numberDecimal?: string };
  salaryMax?: number | { $numberDecimal?: string };
  jobPostingUrl?: string;
  applicationDeadline?: string;
  description?: string;
  industry: string;
  type: string;
  
  // Status tracking
  status: JobStatus;
  statusHistory?: StatusHistoryEntry[];
  
  // UPDATED: Structured contact information
  recruiter?: Contact;
  hiringManager?: Contact;
  additionalContacts?: Contact[];
  
  // Notes fields
  notes?: string;
  salaryNotes?: string;
  interviewNotes?: string;
  
  // Application history
  applicationHistory?: ApplicationHistoryEntry[];
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Job status enum
export type JobStatus =
  | "interested"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected";

// Status history entry
export interface StatusHistoryEntry {
  status: JobStatus;
  timestamp: string;
  note?: string;
}

// Application history entry
export interface ApplicationHistoryEntry {
  action: string;
  timestamp: string;
}

// Status display mapping - for showing human-readable status
export const STATUS_DISPLAY: Record<JobStatus, string> = {
  interested: "Interested",
  applied: "Applied",
  phone_screen: "Phone Screen",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

// Reverse mapping - for converting display text to status value
export const STATUS_VALUE: Record<string, JobStatus> = {
  "Interested": "interested",
  "Applied": "applied",
  "Phone Screen": "phone_screen",
  "Interview": "interview",
  "Offer": "offer",
  "Rejected": "rejected",
};

// Status order for pipeline view
export const STATUS_ORDER: readonly JobStatus[] = [
  "interested",
  "applied",
  "phone_screen",
  "interview",
  "offer",
  "rejected",
] as const;

// Status colors for pipeline view
export const STATUS_COLORS: Record<JobStatus, string> = {
  interested: "bg-gray-100 text-gray-800",
  applied: "bg-blue-100 text-blue-800",
  phone_screen: "bg-purple-100 text-purple-800",
  interview: "bg-yellow-100 text-yellow-800",
  offer: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

// ============================================
// VALIDATION & FORM TYPES
// ============================================

export interface ValidationErrors {
  [key: string]: string;
}

// Form data for creating/editing jobs
export interface JobFormData {
  jobTitle: string;
  company: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  jobPostingUrl: string;
  applicationDeadline: string;
  description: string;
  industry: string;
  type: string;
}

// ============================================
// COMPONENT PROP TYPES
// ============================================

export interface JobDetailProps {
  jobId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export interface PipelineColumnProps {
  status: JobStatus;
  title: string;
  colorClass: string;
  jobs: Job[];
}

export interface JobCardProps {
  job: Job;
}

export interface JobStatusNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  existingNote?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format salary range for display
 */
export const formatSalary = (
  min?: number | { $numberDecimal?: string },
  max?: number | { $numberDecimal?: string }
): string => {
  if (!min && !max) return "Not specified";

  // Handle MongoDB Decimal128 type - convert to number
  const minNum = min && typeof min === "object" && "$numberDecimal" in min
    ? parseFloat(min.$numberDecimal!)
    : min
    ? Number(min)
    : null;
  const maxNum = max && typeof max === "object" && "$numberDecimal" in max
    ? parseFloat(max.$numberDecimal!)
    : max
    ? Number(max)
    : null;

  if (minNum && maxNum)
    return `$${minNum.toLocaleString()} - $${maxNum.toLocaleString()}`;
  if (minNum) return `$${minNum.toLocaleString()}+`;
  if (maxNum) return `Up to $${maxNum.toLocaleString()}`;
  return "Not specified";
};

/**
 * Format date for display
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return "No deadline";
  return new Date(dateString).toLocaleDateString();
};

/**
 * Extract decimal value from MongoDB Decimal128 format
 */
export const extractDecimal = (value: any): string => {
  if (!value) return "";
  if (typeof value === "object" && "$numberDecimal" in value) {
    return value.$numberDecimal;
  }
  return value.toString();
};

// DeadlineInfo interface for deadline utilities
export interface DeadlineInfo {
  daysRemaining: number;
  urgency: 'overdue' | 'critical' | 'warning' | 'normal' | 'none' | 'plenty';
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}