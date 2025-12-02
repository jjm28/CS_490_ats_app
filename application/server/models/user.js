import mongoose from 'mongoose';

const { Schema } = mongoose;



const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, unique: true, index: true },
    firstName: String,

    lastName: String,
    isDeleted:  { type: Boolean, default: false },
    createdAt: {  type: Date,
        default: Date.now},
    updatedAt: {type: Date, default: Date.now},
    role: {
    type: String,
    enum: ["super_admin", "org_admin", "advisor", "job_seeker"],
    default: "job_seeker",
    index: true,
    },
    organizationId: {
    type: String, // references Organization._id as string
    default: null,
    index: true,
    },

  },
  { timestamps: true }
);

const User =
  mongoose.models.User ||
  mongoose.model('User', UserSchema, 'users');

export default User;



