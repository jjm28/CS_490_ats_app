// src/hooks/useInterviewPredictionSync.ts
import { useCallback } from 'react';
import { recalculatePrediction } from '../api/interviewPredictions';

/**
 * Hook to trigger interview prediction recalculation
 * Use this after any action that affects prediction factors:
 * - Completing checklist items
 * - Generating company research
 * - Completing practice sessions
 * - Updating interview details
 */
export function useInterviewPredictionSync() {
  const triggerRecalculation = useCallback(async (jobId: string, interviewId: string) => {
    try {
      console.log('🔄 Triggering prediction recalculation for interview:', interviewId);
      await recalculatePrediction(interviewId, jobId);
      console.log('✅ Prediction recalculated successfully');
    } catch (error) {
      console.error('❌ Failed to recalculate prediction:', error);
      // Don't throw - this is a background operation
    }
  }, []);

  /**
   * Recalculate predictions for all interviews in a job
   */
  const triggerJobRecalculation = useCallback(async (job: any) => {
    if (!job?.interviews || job.interviews.length === 0) {
      return;
    }

    const futureInterviews = job.interviews.filter((iv: any) => {
      const ivDate = new Date(iv.date);
      return ivDate >= new Date() && iv.outcome === 'pending';
    });

    console.log(`🔄 Triggering recalculation for ${futureInterviews.length} upcoming interviews`);

    // Trigger all recalculations (don't await - let them run in background)
    futureInterviews.forEach((iv: any) => {
      triggerRecalculation(job._id, iv._id.toString());
    });
  }, [triggerRecalculation]);

  return {
    triggerRecalculation,
    triggerJobRecalculation,
  };
}

/**
 * Standalone function to trigger recalculation without using a hook
 * Useful for non-React contexts or when you can't use hooks
 */
export async function triggerPredictionRecalculation(jobId: string, interviewId: string) {
  try {
    console.log('🔄 Triggering prediction recalculation for interview:', interviewId);
    await recalculatePrediction(interviewId, jobId);
    console.log('✅ Prediction recalculated successfully');
  } catch (error) {
    console.error('❌ Failed to recalculate prediction:', error);
  }
}