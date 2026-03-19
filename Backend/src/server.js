const app = require("./app");
const env = require("./config/env");
const { connectToDatabase } = require("./config/database");

async function bootstrap() {
  if (env.hasMongoUri) {
    try {
      await connectToDatabase();
      console.log("MongoDB connected");
    } catch (error) {
      console.error(`MongoDB connection failed: ${error.message}`);
    }
  }

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`Backend running on http://localhost:${env.port}`);
  });
}

bootstrap();
