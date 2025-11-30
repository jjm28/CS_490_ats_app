// application/server/models/productivitySession.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const ProductivitySessionSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    // When the user was doing job search work
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
    },

    // Benchmarks-related metrics you’ll probably track
    applicationsCount: {
      type: Number,
      default: 0,
    },
    interviewsCount: {
      type: Number,
      default: 0,
    },
    offersCount: {
      type: Number,
      default: 0,
    },

    // Optional notes or tag for the session
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const ProductivitySession = mongoose.model(
  "ProductivitySession",
  ProductivitySessionSchema
);

export default ProductivitySession;
