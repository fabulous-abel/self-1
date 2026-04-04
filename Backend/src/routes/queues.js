const express = require("express");

const { requireAuth } = require("../middleware/auth");
const {
  addPassengerToQueue,
  getPassengerQueuePosition,
  getQueueDetails,
  listQueues,
  removePassengerFromQueue,
} = require("../store/devData");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    queues: listQueues(),
  });
});

router.get("/:queueId", (req, res) => {
  const queue = getQueueDetails(req.params.queueId);

  if (!queue) {
    return res.status(404).json({
      message: "Queue not found",
    });
  }

  return res.json({
    queue,
  });
});

router.post("/:queueId/join", requireAuth, (req, res) => {
  const payload = addPassengerToQueue({
    queueId: req.params.queueId,
    passengerId: req.user.id,
    io: req.app.get("io"),
  });

  if (!payload) {
    return res.status(404).json({
      message: "Queue not found",
    });
  }

  return res.json(payload);
});

router.post("/:queueId/leave", requireAuth, (req, res) => {
  // Admins may pass an explicit passengerId in the body to force-remove
  // any passenger. Regular passengers omit it and their own ID is used.
  const passengerId = req.body.passengerId || req.user.id;

  const removed = removePassengerFromQueue({
    queueId: req.params.queueId,
    passengerId,
    io: req.app.get("io"),
  });

  if (!removed) {
    return res.status(404).json({
      message: "Queue entry not found",
    });
  }

  return res.json({
    message: "Left queue successfully",
  });
});

router.get("/:queueId/position", requireAuth, (req, res) => {
  const payload = getPassengerQueuePosition(req.params.queueId, req.user.id);

  if (!payload) {
    return res.status(404).json({
      message: "Queue position not found",
    });
  }

  return res.json(payload);
});

module.exports = router;
