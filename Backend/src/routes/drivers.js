const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  acceptNextPassenger,
  getDriverDashboard,
  getDriverEarnings,
  getDriverProfile,
  setDriverQueue,
  setDriverAvailability,
  updateDriverRideStatus,
  updateDriverVehicle,
  uploadDriverDocument,
} = require("../store/devData");

const router = express.Router();

function requireDriver(req, res, next) {
  if (!req.user || req.user.role !== "driver") {
    return res.status(403).json({
      message: "Driver access required",
    });
  }

  return next();
}

router.use(requireAuth, requireDriver);

router.get("/me", (req, res) => {
  const driver = getDriverProfile(req.user.id);

  if (!driver) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  return res.json({
    driver,
  });
});

router.get("/me/dashboard", (req, res) => {
  const dashboard = getDriverDashboard(req.user.id);

  if (!dashboard) {
    return res.status(404).json({
      message: "Driver dashboard not found",
    });
  }

  return res.json(dashboard);
});

router.patch("/me/status", (req, res) => {
  const online = req.body.online;

  if (typeof online !== "boolean") {
    return res.status(400).json({
      message: "online must be true or false",
    });
  }

  const dashboard = setDriverAvailability({
    userId: req.user.id,
    online,
    io: req.app.get("io"),
  });

  if (!dashboard) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  return res.json(dashboard);
});

router.patch("/me/queue", (req, res) => {
  const queueId = String(req.body.queueId || "").trim();

  if (!queueId) {
    return res.status(400).json({
      message: "queueId is required",
    });
  }

  const result = setDriverQueue({
    userId: req.user.id,
    queueId,
    io: req.app.get("io"),
  });

  if (!result) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  if (result.error) {
    return res.status(409).json({
      message: result.error,
      dashboard: result.dashboard,
    });
  }

  return res.json(result);
});

router.post("/me/queue/accept-next", (req, res) => {
  const result = acceptNextPassenger({
    userId: req.user.id,
    io: req.app.get("io"),
  });

  if (!result) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  if (result.error) {
    return res.status(409).json({
      message: result.error,
      dashboard: result.dashboard,
    });
  }

  return res.json(result);
});

router.patch("/me/rides/:rideId/status", (req, res) => {
  const status = String(req.body.status || "").trim().toLowerCase();

  if (!["arrived", "completed"].includes(status)) {
    return res.status(400).json({
      message: "status must be arrived or completed",
    });
  }

  const result = updateDriverRideStatus({
    userId: req.user.id,
    rideId: req.params.rideId,
    status,
    io: req.app.get("io"),
  });

  if (!result) {
    return res.status(404).json({
      message: "Ride not found",
    });
  }

  if (result.error) {
    return res.status(409).json({
      message: result.error,
      dashboard: result.dashboard,
    });
  }

  return res.json(result);
});

router.patch("/me/vehicle", (req, res) => {
  const brand = String(req.body.brand || "").trim();
  const model = String(req.body.model || "").trim();
  const licensePlate = String(req.body.licensePlate || "").trim();
  const color = String(req.body.color || "").trim();

  if (!brand || !model || !licensePlate || !color) {
    return res.status(400).json({
      message: "brand, model, licensePlate, and color are required",
    });
  }

  const vehicle = updateDriverVehicle({
    userId: req.user.id,
    brand,
    model,
    licensePlate,
    color,
    io: req.app.get("io"),
  });

  if (!vehicle) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  return res.json({
    vehicle,
  });
});

router.post("/me/documents", (req, res) => {
  const documentType = String(req.body.documentType || "").trim().toLowerCase();

  if (!documentType) {
    return res.status(400).json({
      message: "documentType is required",
    });
  }

  const document = uploadDriverDocument({
    userId: req.user.id,
    documentType,
    io: req.app.get("io"),
  });

  if (!document) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  return res.json({
    document,
  });
});

router.get("/me/earnings", (req, res) => {
  const earnings = getDriverEarnings(req.user.id);

  if (!earnings) {
    return res.status(404).json({
      message: "Driver profile not found",
    });
  }

  return res.json({
    earnings,
  });
});

module.exports = router;
