import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import reflectionRoutes from "./routes/reflection.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();
app.set("trust proxy", 1);
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Rate limiting — general
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  })
);

// Stricter rate limiting on submission
app.use(
  "/reflection",
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === "production" ? 10 : 100,
    message: { error: "You have submitted too many reflections. Please try again later." },
  })
);

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/reflection", reflectionRoutes);
app.use("/admin", adminRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ─── Error handler ───────────────────────────────────────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "Something went wrong. Your progress is still safe." });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Career Reflection API running on port ${PORT}`);
});

export default app;
