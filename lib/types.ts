import { z } from "zod";

export const briefInputSchema = z.object({
  briefId: z.string().min(1),
  topic: z.string().min(8).max(400),
  audience: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export type BriefInput = z.infer<typeof briefInputSchema>;

export const researchLaneSchema = z.object({
  title: z.string(),
  summary: z.string(),
  bullets: z.array(z.string()).min(3).max(6),
});

export type ResearchLane = z.infer<typeof researchLaneSchema>;

export const draftSchema = z.object({
  title: z.string(),
  lede: z.string(),
  findings: z.array(z.string()).min(3).max(6),
  recommendation: z.string(),
  openQuestions: z.array(z.string()).min(2).max(5),
});

export type Draft = z.infer<typeof draftSchema>;

export const evaluationSchema = z.object({
  score: z.number().min(1).max(10),
  verdict: z.enum(["revise", "pass"]),
  issues: z.array(z.string()).min(1).max(5),
  suggestions: z.array(z.string()).min(1).max(5),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

export const approvalSchema = z.object({
  approved: z.boolean(),
  comment: z.string().max(500),
  reviewer: z.string().max(80).optional(),
});

export type Approval = z.infer<typeof approvalSchema>;

export type PublishedBrief = {
  title: string;
  publishedAt: string;
  reviewer: string;
  comment: string;
};

export const PASS_SCORE = 8;
export const MAX_CRITIQUE_PASSES = 3;

export const EXAMPLES = [
  {
    label: "Replace the queue",
    topic:
      "Should we replace our job queue with Vercel Workflows for long-running AI agents?",
    audience: "Staff engineer writing an architecture brief",
    notes:
      "We already have lease/retry/DLQ. The question is durability across deploys, human approval, and observable steps — not raw throughput.",
  },
  {
    label: "Durable vs workers",
    topic:
      "One-pager: durable execution versus retries in a worker pool, for agent tool loops that pause for humans.",
    audience: "Product + infra",
    notes: "Contrast crash recovery, sleep, hooks, and replay with a classic queue.",
  },
  {
    label: "Competitive brief",
    topic:
      "Competitive brief: Temporal, Inngest, and Vercel Workflows for an AI agent platform.",
    audience: "Founding engineer choosing a runtime",
    notes:
      "Focus on TypeScript DX, local world, pause/resume, and how much infra the team has to own.",
  },
] as const;
