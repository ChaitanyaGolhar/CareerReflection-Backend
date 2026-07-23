import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

// ─── Validation ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const admin = await prisma.admin.findUnique({ where: { email } });

  if (!admin) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  const token = signToken({ adminId: admin.id, email: admin.email });

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({ success: true, email: admin.email });
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  return res.json({ success: true });
}

// ─── Me ──────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response) {
  return res.json({ admin: (req as any).admin });
}

// ─── List reflections (paginated, searchable) ─────────────────────────────────

export async function listReflections(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const search = (req.query.search as string) ?? "";

  const where = search
    ? {
        contributor: {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { college: { contains: search, mode: "insensitive" as const } },
            { company: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const [total, reflections] = await Promise.all([
    prisma.reflection.count({ where }),
    prisma.reflection.findMany({
      where,
      include: { contributor: true },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return res.json({
    data: reflections,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

// ─── Get single reflection (admin) ───────────────────────────────────────────

export async function getReflectionAdmin(req: Request, res: Response) {
  const { id } = req.params;

  const reflection = await prisma.reflection.findUnique({
    where: { id },
    include: {
      contributor: true,
      answers: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!reflection) {
    return res.status(404).json({ error: "Reflection not found." });
  }

  return res.json(reflection);
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

export async function exportCsv(req: Request, res: Response) {
  const reflections = await prisma.reflection.findMany({
    include: {
      contributor: true,
      answers: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const allQuestionKeys = [
    "journey_beliefs",
    "journey_surprise",
    "turning_decision",
    "turning_influence",
    "turning_opportunity",
    "lessons_underestimate",
    "lessons_advice",
    "lessons_matters",
  ];

  const csvHeader = [
    "id",
    "name",
    "email",
    "linkedin",
    "college",
    "graduationYear",
    "company",
    "role",
    "submittedAt",
    "completionTime(s)",
    "wantsResearchUpdates",
    "wantsConversation",
    "wantsMentoring",
    "anythingElse",
    ...allQuestionKeys,
  ];

  const csvRows = reflections.map((r) => {
    const answerMap = Object.fromEntries(r.answers.map((a) => [a.questionKey, a.answer]));
    return [
      r.id,
      r.contributor.name,
      r.contributor.email,
      r.contributor.linkedin ?? "",
      r.contributor.college,
      r.contributor.graduationYear,
      r.contributor.company,
      r.contributor.role,
      r.submittedAt.toISOString(),
      r.completionTime,
      r.wantsResearchUpdates,
      r.wantsConversation,
      r.wantsMentoring,
      r.anythingElse ?? "",
      ...allQuestionKeys.map((k) => (answerMap[k] ?? "").replace(/"/g, '""')),
    ]
      .map((v) => `"${v}"`)
      .join(",");
  });

  const csv = [csvHeader.join(","), ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="reflections-${Date.now()}.csv"`);
  return res.send(csv);
}
