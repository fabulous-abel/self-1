const express = require("express");
const jwt = require("jsonwebtoken");

const { getJwtSecret } = require("../config/auth");
const { requireAuth } = require("../middleware/auth");
const {
  findOrCreateDriver,
  findOrCreatePassenger,
  normalizePhone,
} = require("../store/devData");

const router = express.Router();

router.post("/send-otp", (req, res) => {
  const phone = normalizePhone(req.body.phone || "");
  const role = String(req.body.role || "passenger").trim().toLowerCase();

  if (!phone || phone.replace(/\D/g, "").length < 12) {
    return res.status(400).json({
      message: "Enter a valid Ethiopian phone number",
    });
  }

  if (!["passenger", "driver"].includes(role)) {
    return res.status(400).json({
      message: "role must be passenger or driver",
    });
  }

  return res.json({
    message: "OTP sent successfully",
    phone,
    role,
    debugOtp: "123456",
  });
});

router.post("/verify-otp", (req, res) => {
  const phone = normalizePhone(req.body.phone || "");
  const otp = String(req.body.otp || "").trim();
  const role = String(req.body.role || "passenger").trim().toLowerCase();

  if (!phone || phone.replace(/\D/g, "").length < 12) {
    return res.status(400).json({
      message: "Enter a valid Ethiopian phone number",
    });
  }

  if (otp.length !== 6) {
    return res.status(400).json({
      message: "OTP must be 6 digits",
    });
  }

  if (!["passenger", "driver"].includes(role)) {
    return res.status(400).json({
      message: "role must be passenger or driver",
    });
  }

  const user = role === "driver"
    ? findOrCreateDriver(phone)
    : findOrCreatePassenger(phone);
  const token = jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
    },
  );

  return res.json({
    token,
    user,
  });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      phone: req.user.phone,
      role: req.user.role,
    },
  });
});

module.exports = router;
