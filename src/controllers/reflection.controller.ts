import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

// ─── Validation schema ─────────────────────────────────────────────────────

export const submitReflectionSchema = z.object({
  // Chapter 1 — About You
  name: z.string().min(2, "Please enter your full name."),
  email: z.string().email("Could you double-check your email?"),
  linkedin: z.string().url("Please enter a valid LinkedIn URL.").optional().or(z.literal("")),
  college: z.string().min(2, "Please enter your college name."),
  graduationYear: z.number().int().min(1980).max(new Date().getFullYear()),
  company: z.string().min(1, "Please enter your current company."),
  role: z.string().min(1, "Please enter your current role."),

  // Answers — array of { questionKey, answer }
  answers: z.array(
    z.object({
      questionKey: z.string(),
      answer: z.string().min(1),
    })
  ),

  // Chapter 5 — Future Contribution
  wantsResearchUpdates: z.boolean().default(false),
  wantsConversation: z.boolean().default(false),
  wantsMentoring: z.boolean().default(false),
  anythingElse: z.string().optional(),

  // Analytics
  completionTime: z.number().int().min(0), // seconds
});

type SubmitReflectionInput = z.infer<typeof submitReflectionSchema>;

// ─── Submit reflection ──────────────────────────────────────────────────────

export async function submitReflection(req: Request, res: Response) {
  const data = req.body as SubmitReflectionInput;

  try {
    // Upsert contributor (same email = same person)
    const contributor = await prisma.contributor.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        linkedin: data.linkedin || null,
        college: data.college,
        graduationYear: data.graduationYear,
        company: data.company,
        role: data.role,
      },
      create: {
        name: data.name,
        email: data.email,
        linkedin: data.linkedin || null,
        college: data.college,
        graduationYear: data.graduationYear,
        company: data.company,
        role: data.role,
      },
    });

    // Create reflection + answers in one transaction
    const reflection = await prisma.reflection.create({
      data: {
        contributorId: contributor.id,
        completionTime: data.completionTime,
        wantsResearchUpdates: data.wantsResearchUpdates,
        wantsConversation: data.wantsConversation,
        wantsMentoring: data.wantsMentoring,
        anythingElse: data.anythingElse || null,
        answers: {
          create: data.answers.map((a) => ({
            questionKey: a.questionKey,
            answer: a.answer,
          })),
        },
      },
      include: { answers: true, contributor: true },
    });

    return res.status(201).json({
      success: true,
      reflectionId: reflection.id,
      message: "Your reflection has been contributed. Thank you.",
    });
  } catch (error) {
    console.error("[submitReflection]", error);
    return res.status(500).json({
      error: "Something went wrong. Your progress is still safe.",
    });
  }
}

// ─── Get single reflection ──────────────────────────────────────────────────

export async function getReflection(req: Request, res: Response) {
  const { id } = req.params;

  const reflection = await prisma.reflection.findUnique({
    where: { id },
    include: { contributor: true, answers: true },
  });

  if (!reflection) {
    return res.status(404).json({ error: "Reflection not found." });
  }

  return res.json(reflection);
}
