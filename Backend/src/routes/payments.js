const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { createPayment, getPayment } = require("../store/devData");

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const rideId = String(req.body.rideId || "").trim();
  const amount = Number(req.body.amount || 0);
  const method = String(req.body.method || "telebirr").trim();

  if (!rideId) {
    return res.status(400).json({
      message: "rideId is required",
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      message: "amount must be greater than 0",
    });
  }

  const payment = createPayment({
    rideId,
    amount,
    method,
  });

  return res.status(201).json({
    payment,
  });
});

router.get("/:paymentId", requireAuth, (req, res) => {
  const payment = getPayment(req.params.paymentId);

  if (!payment) {
    return res.status(404).json({
      message: "Payment not found",
    });
  }

  return res.json({
    payment,
  });
});

module.exports = router;
