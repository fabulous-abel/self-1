const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["passenger", "driver", "admin"],
      default: "passenger",
    },
    otp: {
      type: otpSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
