const missedTurnTimers = new Map();

const PASSENGER_STATUS = Object.freeze({
  WAITING: "waiting",
  NOTIFIED: "notified",
  MISSED: "missed",
});

function getEntries(queue) {
  if (!queue.entries) {
    queue.entries = [];
  }

  return queue.entries;
}

function toId(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

function buildTimerKey(queue, passengerId) {
  const queueId = toId(queue._id || queue.id || queue.name || "queue");
  return `${queueId}:${toId(passengerId)}`;
}

function reindexEntries(entries) {
  entries.forEach((entry, index) => {
    entry.position = index + 1;
  });
}

function findEntryIndex(queue, passengerId) {
  const targetId = toId(passengerId);

  return getEntries(queue).findIndex(
    (entry) => toId(entry.passengerId) === targetId,
  );
}

function serializeQueue(queue) {
  const entries = getEntries(queue);

  return {
    queueId: queue._id || queue.id || null,
    type: queue.type || null,
    capacity: queue.capacity || 0,
    waitingCount: entries.length,
    entries: entries.map((entry) => ({
      passengerId: entry.passengerId,
      position: entry.position,
      status: entry.status,
      joinedAt: entry.joinedAt || null,
      graceExpiresAt: entry.graceExpiresAt || null,
    })),
  };
}

function clearMissedTurnTimer(queue, passengerId) {
  const timerKey = buildTimerKey(queue, passengerId);
  const timer = missedTurnTimers.get(timerKey);

  if (timer) {
    clearTimeout(timer);
    missedTurnTimers.delete(timerKey);
  }
}

function joinQueue(queue, passengerId) {
  const entries = getEntries(queue);
  const existingIndex = findEntryIndex(queue, passengerId);

  if (existingIndex >= 0) {
    const existingEntry = entries[existingIndex];
    return {
      queue,
      entry: existingEntry,
      position: existingEntry.position,
      alreadyQueued: true,
    };
  }

  const entry = {
    passengerId,
    position: entries.length + 1,
    status: PASSENGER_STATUS.WAITING,
    joinedAt: new Date(),
    graceExpiresAt: null,
  };

  entries.push(entry);
  reindexEntries(entries);

  return {
    queue,
    entry,
    position: entry.position,
    alreadyQueued: false,
  };
}

function leaveQueue(queue, passengerId) {
  const entries = getEntries(queue);
  const entryIndex = findEntryIndex(queue, passengerId);

  if (entryIndex === -1) {
    return null;
  }

  clearMissedTurnTimer(queue, passengerId);
  const removedEntries = entries.splice(entryIndex, 1);
  reindexEntries(entries);

  return removedEntries[0] || null;
}

function getPosition(queue, passengerId) {
  const entryIndex = findEntryIndex(queue, passengerId);

  if (entryIndex === -1) {
    return null;
  }

  return getEntries(queue)[entryIndex].position;
}

function notifyTurn(io, queue) {
  const entries = getEntries(queue);
  const nextEntry = entries[0];

  if (!nextEntry) {
    return null;
  }

  nextEntry.status = PASSENGER_STATUS.NOTIFIED;

  const payload = {
    queueId: queue._id || queue.id || null,
    passengerId: nextEntry.passengerId,
    position: nextEntry.position,
    notifiedAt: new Date().toISOString(),
  };

  if (io) {
    io.to(`user:${toId(nextEntry.passengerId)}`).emit("queue:your-turn", payload);

    if (payload.queueId) {
      io.to(`queue:${toId(payload.queueId)}`).emit(
        "queue:updated",
        serializeQueue(queue),
      );
    }
  }

  return payload;
}

function handleMissedTurn(queue, passengerId, options = {}) {
  const entryIndex = findEntryIndex(queue, passengerId);

  if (entryIndex === -1) {
    return null;
  }

  const graceMs = options.graceMs || 2 * 60 * 1000;
  const onExpire = options.onExpire;
  const entry = getEntries(queue)[entryIndex];

  entry.status = PASSENGER_STATUS.MISSED;
  entry.graceExpiresAt = new Date(Date.now() + graceMs);

  clearMissedTurnTimer(queue, passengerId);

  const timer = setTimeout(() => {
    leaveQueue(queue, passengerId);

    if (typeof onExpire === "function") {
      onExpire({
        passengerId,
        queue,
      });
    }
  }, graceMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  missedTurnTimers.set(buildTimerKey(queue, passengerId), timer);

  return entry;
}

module.exports = {
  PASSENGER_STATUS,
  getPosition,
  handleMissedTurn,
  joinQueue,
  leaveQueue,
  notifyTurn,
  serializeQueue,
};
