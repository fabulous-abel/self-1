const mongoose = require("mongoose");
const express = require("express");

const authRouter = require("./auth");
const driverRouter = require("./drivers");
const paymentRouter = require("./payments");
const queueRouter = require("./queues");
const rideRouter = require("./rides");

const router = express.Router();

function getDatabaseState() {
  switch (mongoose.connection.readyState) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "uninitialized";
  }
}

router.get("/health", (req, res) => {
  const isVercel = req.app.get("runtime") === "vercel";

  res.json({
    status: "ok",
    service: "selfqueue-backend",
    runtime: req.app.get("runtime"),
    database: {
      configured: Boolean(process.env.MONGO_URI || process.env.DATABASE_URL),
      state: getDatabaseState(),
    },
    realtime: {
      websocketServerSupported: !isVercel,
    },
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRouter);
router.use("/drivers", driverRouter);
router.use("/queues", queueRouter);
router.use("/rides", rideRouter);
router.use("/payments", paymentRouter);

module.exports = router;
