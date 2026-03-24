const jwt = require("jsonwebtoken");

const { getJwtSecret } = require("../config/auth");

function extractToken(socket) {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;
  const headerToken = socket.handshake.headers.authorization;
  const rawToken = authToken || headerToken || "";

  if (rawToken.startsWith("Bearer ")) {
    return rawToken.slice(7);
  }

  return rawToken;
}

function getUserId(payload) {
  if (!payload) {
    return null;
  }

  return payload.id || payload.userId || payload._id || null;
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = extractToken(socket);

    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      socket.user = jwt.verify(token, getJwtSecret());
      return next();
    } catch (error) {
      return next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", (socket) => {
    const userId = getUserId(socket.user);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.emit("socket:ready", {
      connected: true,
      userId,
    });

    socket.on("queue:subscribe", (queueId) => {
      if (queueId) {
        socket.join(`queue:${queueId}`);
      }
    });

    socket.on("queue:unsubscribe", (queueId) => {
      if (queueId) {
        socket.leave(`queue:${queueId}`);
      }
    });
  });
}

module.exports = registerSocketHandlers;
