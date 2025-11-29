// ============================================
// FILE: backend/utils/notificationHelpers.js
// ============================================
// Helper functions for notification preferences

import { getDb } from '../db/connection.js'; // Adjust path to your DB connection file

/**
 * Create default notification preferences for a new user
 * Call this in your registration route after creating a user
 */
export async function createDefaultNotificationPreferences(userId) {
  const db = getDb();
  
  const defaultPreferences = {
    userId: String(userId), // Store as String to match your app's pattern
    email: {
      enabled: true,
      types: {
        approaching: true,
        dayBefore: true,
        dayOf: true,
        overdue: true,
      },
      approachingDays: 3,
    },
    inApp: {
      enabled: true,
      types: {
        approaching: true,
        dayBefore: true,
        dayOf: true,
        overdue: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const result = await db.collection('notificationpreferences').insertOne(defaultPreferences);
    console.log(`✅ Created default notification preferences for user ${userId}`);
    return { ...defaultPreferences, _id: result.insertedId };
  } catch (error) {
    console.error('Error creating default notification preferences:', error);
    throw error;
  }
}

/**
 * Get user's notification preferences
 * Creates default if they don't exist
 */
export async function getUserNotificationPreferences(userId) {
  const db = getDb();
  
  let preferences = await db.collection('notificationpreferences').findOne({ 
    userId: String(userId)
  });

  if (!preferences) {
    preferences = await createDefaultNotificationPreferences(userId);
  }

  return preferences;
}