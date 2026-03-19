import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import userRoutes from "./routes/user.routes";
import commentRoutes from "./routes/comment.routes";
import reactionRoutes from "./routes/reaction.routes";
import feedRoutes from "./routes/feed.routes";
import storageRoutes from "./routes/storage.routes";
import searchRoutes from "./routes/search.routes";
import notificationRoutes from "./routes/notification.routes";

import { errorHandler } from "./middleware/error.middleware";

const app = express();

// ─── SECURITY ───────────────────────────────────────────────
// helmet() sets various HTTP headers to protect the app
app.use(helmet());

// ─── CORS ───────────────────────────────────────────────────
// CORS = Cross-Origin Resource Sharing
// This allows the React frontend (port 5173) to call this API (port 8080)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true, // Allow cookies/auth headers
  })
);

// ─── BODY PARSING ───────────────────────────────────────────
// This lets Express understand JSON request bodies
// Example: when frontend sends { "content": "Hello!" }
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGING ────────────────────────────────────────────────
// morgan logs every HTTP request to the console
// "dev" format: :method :url :status :response-time ms
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ─── RATE LIMITING ──────────────────────────────────────────
// Prevents abuse by limiting requests per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per windowMs per IP
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later.",
  },
});
app.use("/api/", limiter);

// ─── HEALTH CHECK ───────────────────────────────────────────
// Simple endpoint to verify the server is running
app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── ROUTES ─────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/posts/:postId/comments", commentRoutes);
app.use("/api/v1", reactionRoutes); // Registers /posts/... and /comments/...
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/feed", feedRoutes);
app.use("/api/v1/storage", storageRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// ─── ERROR HANDLING ─────────────────────────────────────────
// This MUST be the last middleware — it catches all errors
app.use(errorHandler);

export default app;
