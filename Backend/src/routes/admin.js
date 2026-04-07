const express = require("express");

const {
  createBroadcastRecord,
  createDispatchLocationRecord,
  createLocationQueueRequest,
  createManagedUserRecord,
  deleteDispatchLocationRecord,
  getLocationDispatchState,
  listBroadcasts,
  listDispatchLocations,
  listManagedUsers,
  updateBroadcastRecord,
  updateDispatchLocationRecord,
  updateManagedUserRecord,
} = require("../store/devData");

const router = express.Router();

function forwardError(next, error) {
  if (!error.statusCode) {
    error.statusCode = 400;
  }

  return next(error);
}

router.get("/users", (req, res) => {
  res.json({
    users: listManagedUsers(req.query.role),
  });
});

router.post("/users", (req, res, next) => {
  try {
    const user = createManagedUserRecord({
      role: req.body.role,
      fullName: req.body.name,
      phoneNumber: req.body.phone,
      vehicleInfo: req.body.vehicle,
      source: "admin",
    });

    return res.status(201).json({ user });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.put("/users/:userId", (req, res, next) => {
  try {
    const user = updateManagedUserRecord(req.params.userId, {
      fullName: req.body.name,
      phoneNumber: req.body.phone,
      vehicleInfo: req.body.vehicle,
    });

    return res.json({ user });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.get("/broadcasts", (req, res) => {
  res.json({
    broadcasts: listBroadcasts(),
  });
});

router.post("/broadcasts", (req, res, next) => {
  try {
    const broadcast = createBroadcastRecord({
      message: req.body.message,
      target: req.body.target,
      createdBy: req.body.createdBy,
    });

    return res.status(201).json({ broadcast });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.put("/broadcasts/:broadcastId", (req, res, next) => {
  try {
    const broadcast = updateBroadcastRecord(req.params.broadcastId, {
      message: req.body.message,
      target: req.body.target,
      updatedBy: req.body.updatedBy,
    });

    return res.json({ broadcast });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.get("/locations", (req, res) => {
  res.json({
    locations: listDispatchLocations(),
  });
});

router.post("/locations", (req, res, next) => {
  try {
    const location = createDispatchLocationRecord(req.body.name);
    return res.status(201).json({ location });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.put("/locations/:locationId", (req, res, next) => {
  try {
    const location = updateDispatchLocationRecord(
      req.params.locationId,
      req.body.name,
    );

    return res.json({ location });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.delete("/locations/:locationId", (req, res, next) => {
  try {
    const location = deleteDispatchLocationRecord(req.params.locationId);
    return res.json({ location });
  } catch (error) {
    return forwardError(next, error);
  }
});

router.get("/dispatch", (req, res, next) => {
  try {
    const dispatch = getLocationDispatchState(req.query.location);
    return res.json(dispatch);
  } catch (error) {
    return forwardError(next, error);
  }
});

router.post("/requests", (req, res, next) => {
  try {
    const result = createLocationQueueRequest({
      location: req.body.location,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      note: req.body.note,
      requestedBy: req.body.requestedBy,
    });

    return res.status(201).json(result);
  } catch (error) {
    return forwardError(next, error);
  }
});

module.exports = router;
