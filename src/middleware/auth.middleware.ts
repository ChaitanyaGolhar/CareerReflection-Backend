import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token ?? req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = verifyToken(token);
    (req as any).admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}
