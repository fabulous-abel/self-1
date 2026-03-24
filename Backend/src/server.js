const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/handlers");
const parseOrigins = require("./utils/parseOrigins");

const port = Number(process.env.PORT) || 5000;
const isVercel =
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true" ||
  process.env.VERCEL_ENV !== undefined;
const socketOrigins = parseOrigins(
  process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || "*",
);

async function startServer() {
  try {
    await connectDB();

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: socketOrigins,
        credentials: true,
      },
    });

    app.set("io", io);
    registerSocketHandlers(io);

    server.listen(port, () => {
      console.log(`Self(queue) backend listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
}

if (!isVercel) {
  startServer();
}

module.exports = app;
