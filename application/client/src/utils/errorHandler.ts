// src/utils/errorHandler.ts
import * as Sentry from '@sentry/react';

export const handleError = (error: unknown, context?: string) => {
  console.error(context ? `${context}:` : 'Error:', error);
  
  // Only send to Sentry in production
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { context: context || 'unknown' }
    });
  }
};