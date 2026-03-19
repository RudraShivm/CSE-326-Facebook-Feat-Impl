import dotenv from "dotenv";
dotenv.config(); // Load .env BEFORE anything else

import app from "./app";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🚀 Facebook API Server                 ║
  ║   Running on: http://localhost:${PORT}      ║
  ║   Environment: ${process.env.NODE_ENV || "development"}            ║
  ╚═══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
