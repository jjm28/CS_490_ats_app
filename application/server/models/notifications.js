import mongoose from 'mongoose';
const { Schema } = mongoose;

const NotificationPreferencesSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  email: {
    enabled: { type: Boolean, default: true },
    types: {
      approaching: { type: Boolean, default: true }, // 3 days before
      dayBefore: { type: Boolean, default: true },
      dayOf: { type: Boolean, default: true },
      overdue: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: false },
    },
    approachingDays: { type: Number, default: 3, min: 1, max: 30 },
    digestDay: { 
      type: String, 
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: 'monday'
    },
    digestTime: { type: String, default: '09:00' }, // HH:mm format
  },
  push: {
    enabled: { type: Boolean, default: false },
    subscription: { type: Object }, // Web Push subscription object
    types: {
      approaching: { type: Boolean, default: true },
      dayBefore: { type: Boolean, default: true },
      dayOf: { type: Boolean, default: true },
      overdue: { type: Boolean, default: false },
    },
  },
  inApp: {
    enabled: { type: Boolean, default: true },
    types: {
      approaching: { type: Boolean, default: true },
      dayBefore: { type: Boolean, default: true },
      dayOf: { type: Boolean, default: true },
      overdue: { type: Boolean, default: true },
    },
  },
  timezone: { type: String, default: 'America/New_York' },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '08:00' },
  },
});

const NotificationLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  type: {
    type: String,
    enum: ['approaching', 'dayBefore', 'dayOf', 'overdue', 'weeklyDigest'],
    required: true,
  },
  channel: {
    type: String,
    enum: ['email', 'push', 'inApp'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending',
  },
  sentAt: { type: Date },
  readAt: { type: Date },
  error: { type: String },
  metadata: {
    subject: String,
    preview: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
NotificationLogSchema.index({ userId: 1, createdAt: -1 });
NotificationLogSchema.index({ userId: 1, jobId: 1, type: 1 });
NotificationLogSchema.index({ status: 1, sentAt: 1 });

const NotificationPreferences = 
    mongoose.models.NotificationPreferences || 
    mongoose.model('NotificationPreferences', NotificationPreferencesSchema);

const NotificationLog = 
    mongoose.models.NotificationLog || 
    mongoose.model('NotificationLog', NotificationLogSchema);

export { NotificationPreferences, NotificationLog };