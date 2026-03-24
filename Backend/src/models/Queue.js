const mongoose = require("mongoose");

const queueEntrySchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "notified", "missed"],
      default: "waiting",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    graceExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const queueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    entries: {
      type: [queueEntrySchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Queue", queueSchema);
