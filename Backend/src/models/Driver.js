const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    vehicle: {
      plateNumber: {
        type: String,
        trim: true,
        default: "",
      },
      type: {
        type: String,
        trim: true,
        default: "",
      },
      color: {
        type: String,
        trim: true,
        default: "",
      },
    },
    documents: {
      licenseUrl: {
        type: String,
        default: "",
      },
      insuranceUrl: {
        type: String,
        default: "",
      },
      registrationUrl: {
        type: String,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended", "offline", "online"],
      default: "pending",
    },
    earnings: {
      total: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "ETB",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Driver", driverSchema);
