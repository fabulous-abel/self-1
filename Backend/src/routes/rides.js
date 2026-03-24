const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { createRide, getRide } = require("../store/devData");

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const queueId = String(req.body.queueId || "").trim();
  const pickupLabel = String(req.body.pickupLabel || "").trim();
  const passengers = Number(req.body.passengers || 1);

  if (!queueId) {
    return res.status(400).json({
      message: "queueId is required",
    });
  }

  if (!pickupLabel) {
    return res.status(400).json({
      message: "pickupLabel is required",
    });
  }

  const ride = createRide({
    queueId,
    passengerId: req.user.id,
    pickupLabel,
    passengers: Number.isFinite(passengers) ? passengers : 1,
  });

  return res.status(201).json({
    ride,
  });
});

router.get("/:rideId", requireAuth, (req, res) => {
  const ride = getRide(req.params.rideId);

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found",
    });
  }

  return res.json({
    ride,
  });
});

module.exports = router;
