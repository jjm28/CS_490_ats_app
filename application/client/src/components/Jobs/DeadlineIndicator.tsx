import React from 'react';
import { getDeadlineInfo, formatDeadlineDate } from '../../utils/deadlines';

interface DeadlineIndicatorProps {
  applicationDeadline: string | null | undefined;
  showFullDate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
}

/**
 * DeadlineIndicator Component
 * Displays deadline information with color-coded urgency
 */
const DeadlineIndicator: React.FC<DeadlineIndicatorProps> = ({ 
  applicationDeadline,
  showFullDate = false,
  size = 'md',
  inline = false
}) => {
  const deadlineInfo = getDeadlineInfo(applicationDeadline);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // Don't show indicator if no deadline
  if (deadlineInfo.urgency === 'none' && !showFullDate) {
    return null;
  }

  const containerClass = inline 
    ? 'inline-flex items-center gap-1.5'
    : 'flex items-center gap-1.5';

  return (
    <div className={containerClass}>
      <span 
        className={`
          ${sizeClasses[size]}
          ${deadlineInfo.color}
          ${deadlineInfo.bgColor}
          rounded-full
          font-semibold
          inline-flex
          items-center
          gap-1
          whitespace-nowrap
        `}
        title={applicationDeadline ? formatDeadlineDate(applicationDeadline) : undefined}
      >
        <span>{deadlineInfo.icon}</span>
        <span>{deadlineInfo.label}</span>
      </span>
      
      {showFullDate && applicationDeadline && (
        <span className="text-xs text-gray-500">
          ({formatDeadlineDate(applicationDeadline)})
        </span>
      )}
    </div>
  );
};

export default DeadlineIndicator;