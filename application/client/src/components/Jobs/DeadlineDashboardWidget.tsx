import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../StyledComponents/Card';
import Button from '../StyledComponents/Button';
import DeadlineIndicator from './DeadlineIndicator';
import { sortByDeadlineUrgency, getDeadlineInfo } from '../../utils/deadlines';
import type { Job } from '../../types/jobs.types';

interface DeadlinesDashboardWidgetProps {
  jobs: Job[];
  maxDisplay?: number;
}

/**
 * Dashboard widget showing upcoming job application deadlines
 */
const DeadlinesDashboardWidget: React.FC<DeadlinesDashboardWidgetProps> = ({ 
  jobs,
  maxDisplay = 5 
}) => {
  const navigate = useNavigate();

  // Filter and sort jobs with deadlines
  const upcomingDeadlines = useMemo(() => {
    const jobsWithDeadlines = jobs.filter(job => job.applicationDeadline);
    const sorted = sortByDeadlineUrgency(jobsWithDeadlines);
    return sorted.slice(0, maxDisplay);
  }, [jobs, maxDisplay]);

  // Count overdue jobs
  const overdueCount = useMemo(() => {
    return jobs.filter(job => {
      const info = getDeadlineInfo(job.applicationDeadline);
      return info.urgency === 'overdue';
    }).length;
  }, [jobs]);

  // Count urgent jobs (due in 3 days or less, not overdue)
  const urgentCount = useMemo(() => {
    return jobs.filter(job => {
      const info = getDeadlineInfo(job.applicationDeadline);
      return info.urgency === 'critical' && info.daysRemaining >= 0;
    }).length;
  }, [jobs]);

  if (upcomingDeadlines.length === 0) {
    return (
      <Card>
        <div className="text-center py-6">
          <div className="text-4xl mb-2">📅</div>
          <h3 className="font-semibold text-gray-900 mb-2">No Upcoming Deadlines</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add application deadlines to track your opportunities
          </p>
          <Button onClick={() => navigate('/Jobs')}>
            View Jobs
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          📅 Upcoming Deadlines
        </h3>
        {(overdueCount > 0 || urgentCount > 0) && (
          <div className="flex gap-2 text-xs">
            {overdueCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                {overdueCount} overdue
              </span>
            )}
            {urgentCount > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">
                {urgentCount} urgent
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {upcomingDeadlines.map((job) => {
          const deadlineInfo = getDeadlineInfo(job.applicationDeadline);
          
          return (
            <div 
              key={job._id}
              className={`
                p-3 rounded-lg border-l-4 cursor-pointer
                hover:bg-gray-50 transition-colors
                ${deadlineInfo.urgency === 'overdue' ? 'border-red-500 bg-red-50' : ''}
                ${deadlineInfo.urgency === 'critical' ? 'border-orange-500 bg-orange-50' : ''}
                ${deadlineInfo.urgency === 'warning' ? 'border-yellow-500 bg-yellow-50' : ''}
                ${deadlineInfo.urgency === 'normal' ? 'border-green-500 bg-white' : ''}
              `}
              onClick={() => navigate('/Jobs')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {job.jobTitle}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {job.company}
                  </div>
                  <div className="mt-2">
                    <DeadlineIndicator 
                      applicationDeadline={job.applicationDeadline}
                      showFullDate={true}
                      size="sm"
                    />
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {job.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Showing {upcomingDeadlines.length} of {jobs.filter(j => j.applicationDeadline).length} deadlines
        </span>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/Jobs')}
        >
          View All Jobs
        </Button>
      </div>
    </Card>
  );
};

export default DeadlinesDashboardWidget;