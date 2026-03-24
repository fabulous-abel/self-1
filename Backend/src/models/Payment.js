const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    telebirrRef: {
      type: String,
      trim: true,
      default: "",
    },
    method: {
      type: String,
      enum: ["telebirr", "cash", "card"],
      default: "telebirr",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
