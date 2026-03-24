require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/handlers");
const parseOrigins = require("./utils/parseOrigins");

const port = Number(process.env.PORT) || 5000;
const socketOrigins = parseOrigins(
  process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || "*",
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    credentials: true,
  },
});

app.set("io", io);
registerSocketHandlers(io);

async function startServer() {
  try {
    await connectDB();

    server.listen(port, () => {
      console.log(`Self(queue) backend listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
}

startServer();
