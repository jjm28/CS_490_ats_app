// ============================================
// FILE: backend/models/NotificationLog.js
// ============================================

import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    type: {
      type: String,
      enum: ['approaching', 'dayBefore', 'dayOf', 'overdue'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'inApp'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'read'],
      default: 'pending',
    },
    sentAt: { 
      type: Date 
    },
    readAt: { 
      type: Date 
    },
    error: { 
      type: String 
    },
    metadata: {
      subject: String,
      preview: String,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
NotificationLogSchema.index({ userId: 1, createdAt: -1 });
NotificationLogSchema.index({ userId: 1, jobId: 1, type: 1 });
NotificationLogSchema.index({ status: 1, sentAt: 1 });

const NotificationLog =
  mongoose.models.NotificationLog || 
  mongoose.model('NotificationLog', NotificationLogSchema);

export default NotificationLog;