const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    passengers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "arrived", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    fare: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ride", rideSchema);
