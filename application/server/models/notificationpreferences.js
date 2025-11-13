// ============================================
// FILE: backend/models/NotificationPreferences.js
// ============================================

import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationPreferencesSchema = new Schema(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    email: {
      enabled: { 
        type: Boolean, 
        default: true 
      },
      types: {
        approaching: { type: Boolean, default: true }, // X days before
        dayBefore: { type: Boolean, default: true },   // 1 day before
        dayOf: { type: Boolean, default: true },        // Morning of deadline
        overdue: { type: Boolean, default: true },      // Daily for overdue
      },
      approachingDays: { 
        type: Number, 
        default: 3,
        min: 1,
        max: 30 
      },
    },
    inApp: {
      enabled: { 
        type: Boolean, 
        default: true 
      },
      types: {
        approaching: { type: Boolean, default: true },
        dayBefore: { type: Boolean, default: true },
        dayOf: { type: Boolean, default: true },
        overdue: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

// Create default preferences when user signs up
NotificationPreferencesSchema.statics.createDefault = async function(userId) {
  return this.create({
    userId,
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
  });
};

const NotificationPreferences =
  mongoose.models.NotificationPreferences || 
  mongoose.model('NotificationPreferences', NotificationPreferencesSchema);

export default NotificationPreferences;