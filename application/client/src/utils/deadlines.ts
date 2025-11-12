// Deadline tracking utilities

import type { DeadlineInfo } from "../types/jobs.types";

/**
 * Calculate deadline urgency and return formatted information
 */
export function getDeadlineInfo(applicationDeadline: string | null | undefined): DeadlineInfo {
  if (!applicationDeadline) {
    return {
      daysRemaining: Infinity,
      urgency: 'none',
      label: 'No deadline',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      icon: '📅'
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day calculation
  
  const deadline = new Date(applicationDeadline);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine urgency level
  let urgency: DeadlineInfo['urgency'];
  let label: string;
  let color: string;
  let bgColor: string;
  let icon: string;

  if (daysRemaining < 0) {
    // Overdue
    urgency = 'overdue';
    label = `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`;
    color = 'text-red-700';
    bgColor = 'bg-red-100';
    icon = '🚨';
  } else if (daysRemaining === 0) {
    // Due today
    urgency = 'critical';
    label = 'Due today!';
    color = 'text-red-600';
    bgColor = 'bg-red-100';
    icon = '⚠️';
  } else if (daysRemaining <= 3) {
    // Critical (1-3 days)
    urgency = 'critical';
    label = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;
    color = 'text-orange-700';
    bgColor = 'bg-orange-100';
    icon = '⏰';
  } else if (daysRemaining <= 7) {
    // Warning (4-7 days)
    urgency = 'warning';
    label = `${daysRemaining} days left`;
    color = 'text-yellow-700';
    bgColor = 'bg-yellow-100';
    icon = '📆';
  } else if (daysRemaining <= 14) {
    // Normal (8-14 days)
    urgency = 'normal';
    label = `${daysRemaining} days left`;
    color = 'text-green-700';
    bgColor = 'bg-green-100';
    icon = '✅';
  } else {
    // More than 14 days
    urgency = 'normal';
    label = `${daysRemaining} days left`;
    color = 'text-blue-700';
    bgColor = 'bg-blue-100';
    icon = '📅';
  }

  return {
    daysRemaining,
    urgency,
    label,
    color,
    bgColor,
    icon
  };
}

/**
 * Format date for deadline display
 */
export function formatDeadlineDate(date: string | null | undefined): string {
  if (!date) return 'No deadline set';
  
  const deadline = new Date(date);
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  
  return deadline.toLocaleDateString('en-US', options);
}

/**
 * Sort jobs by deadline urgency
 */
export function sortByDeadlineUrgency<T extends { applicationDeadline?: string | null }>(
  jobs: T[]
): T[] {
  return [...jobs].sort((a, b) => {
    const aInfo = getDeadlineInfo(a.applicationDeadline);
    const bInfo = getDeadlineInfo(b.applicationDeadline);
    
    // Overdue first
    if (aInfo.urgency === 'overdue' && bInfo.urgency !== 'overdue') return -1;
    if (bInfo.urgency === 'overdue' && aInfo.urgency !== 'overdue') return 1;
    
    // Then by days remaining (ascending)
    return aInfo.daysRemaining - bInfo.daysRemaining;
  });
}

/**
 * Get jobs grouped by deadline urgency
 */
export function groupJobsByUrgency<T extends { applicationDeadline?: string | null }>(
  jobs: T[]
): {
  overdue: T[];
  critical: T[];
  warning: T[];
  normal: T[];
  none: T[];
} {
  const groups = {
    overdue: [] as T[],
    critical: [] as T[],
    warning: [] as T[],
    normal: [] as T[],
    none: [] as T[],
    plenty: [] as T[]
  };

  jobs.forEach(job => {
    const info = getDeadlineInfo(job.applicationDeadline);
    groups[info.urgency].push(job);
  });

  return groups;
}