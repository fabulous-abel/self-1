const test = require("node:test");
const assert = require("node:assert/strict");

const {
  PASSENGER_STATUS,
  getPosition,
  handleMissedTurn,
  joinQueue,
  leaveQueue,
  notifyTurn,
} = require("./queueEngine");

test("joinQueue assigns FIFO positions", () => {
  const queue = { name: "Bole", entries: [] };

  joinQueue(queue, "p1");
  joinQueue(queue, "p2");
  joinQueue(queue, "p3");

  assert.equal(getPosition(queue, "p1"), 1);
  assert.equal(getPosition(queue, "p2"), 2);
  assert.equal(getPosition(queue, "p3"), 3);
});

test("leaveQueue reindexes positions after removal", () => {
  const queue = { name: "Piassa", entries: [] };

  joinQueue(queue, "p1");
  joinQueue(queue, "p2");
  joinQueue(queue, "p3");

  leaveQueue(queue, "p2");

  assert.equal(getPosition(queue, "p1"), 1);
  assert.equal(getPosition(queue, "p3"), 2);
});

test("notifyTurn marks the first passenger as notified", () => {
  const queue = { _id: "queue-1", entries: [] };

  joinQueue(queue, "p1");
  joinQueue(queue, "p2");

  const payload = notifyTurn(null, queue);

  assert.equal(payload.passengerId, "p1");
  assert.equal(queue.entries[0].status, PASSENGER_STATUS.NOTIFIED);
});

test("handleMissedTurn removes a passenger after the grace period", async () => {
  const queue = { name: "Mexico", entries: [] };

  joinQueue(queue, "p1");
  joinQueue(queue, "p2");

  await new Promise((resolve) => {
    handleMissedTurn(queue, "p1", {
      graceMs: 20,
      onExpire: () => {
        assert.equal(getPosition(queue, "p1"), null);
        assert.equal(getPosition(queue, "p2"), 1);
        resolve();
      },
    });
  });
});
