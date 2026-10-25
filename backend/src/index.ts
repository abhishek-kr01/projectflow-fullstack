import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/index.js";

const port = Number(process.env.PORT || 8000);

const requiredEnvironment = ["MONGO_URI", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
const missing = requiredEnvironment.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

try {
  await connectDB();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 ProjectFlow API listening on port ${port}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
} catch (error) {
  console.error("Failed to start ProjectFlow API:", error);
  process.exit(1);
}
