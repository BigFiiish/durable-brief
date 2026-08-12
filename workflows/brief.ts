import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHook } from "workflow";
import { getWritable } from "workflow";
import {
  demoComparables,
  demoConstraints,
  demoDelay,
  demoDraft,
  demoEvaluation,
  demoLandscape,
} from "@/lib/demo";
import type { BriefEvent } from "@/lib/events";
import { isDemoMode, getModelId } from "@/lib/model";
import {
  MAX_CRITIQUE_PASSES,
  PASS_SCORE,
  type Approval,
  type BriefInput,
  type Draft,
  type Evaluation,
  type PublishedBrief,
  type ResearchLane,
  draftSchema,
  evaluationSchema,
  researchLaneSchema,
} from "@/lib/types";

export async function briefWorkflow(input: BriefInput) {
  "use workflow";

  await emit({ type: "phase", phase: "research" });

  const [landscape, constraints, comparables] = await Promise.all([
    researchLandscape(input),
    researchConstraints(input),
    researchComparables(input),
  ]);

  await emit({ type: "phase", phase: "draft" });
  let draft = await writeDraft(input, { landscape, constraints, comparables }, 0);
  await emit({ type: "draft", draft, iteration: 0 });

  let passed = false;

  for (let i = 0; i < MAX_CRITIQUE_PASSES; i++) {
    await emit({ type: "phase", phase: "critique" });
    const evaluation = await critiqueDraft(input, draft, i);
    await emit({ type: "evaluation", evaluation, iteration: i });

    if (evaluation.score >= PASS_SCORE) {
      passed = true;
      break;
    }

    if (i === MAX_CRITIQUE_PASSES - 1) {
      break;
    }

    await emit({ type: "phase", phase: "draft" });
    draft = await reviseDraft(input, draft, evaluation, i + 1);
    await emit({ type: "draft", draft, iteration: i + 1 });
  }

  using hook = createHook<Approval>({
    token: `brief-approval:${input.briefId}`,
  });

  await emit({
    type: "awaiting_approval",
    token: hook.token,
    passed,
  });

  const decision = await hook;
  const reviewer = decision.reviewer?.trim() || "reviewer";

  if (!decision.approved) {
    await emit({
      type: "rejected",
      comment: decision.comment,
      reviewer,
    });
    return { status: "rejected" as const, draft, decision };
  }

  const published = await publishBrief(draft, {
    ...decision,
    reviewer,
  });
  await emit({ type: "published", published });
  return { status: "published" as const, draft, published };
}

async function emit(event: BriefEvent) {
  "use step";
  await writeEvent(event);
}

async function writeEvent(event: BriefEvent) {
  const writable = getWritable<string>();
  const writer = writable.getWriter();
  try {
    await writer.write(`${JSON.stringify(event)}\n`);
  } finally {
    writer.releaseLock();
  }
}

async function researchLandscape(input: BriefInput): Promise<ResearchLane> {
  "use step";
  const lane = isDemoMode()
    ? (await demoDelay(), demoLandscape(input))
    : await completeResearch(
        input,
        "landscape",
        "Map the market and the job-to-be-done. Be concrete. No vendor poetry.",
      );
  await writeEvent({ type: "lane", id: "landscape", lane });
  return lane;
}

async function researchConstraints(input: BriefInput): Promise<ResearchLane> {
  "use step";
  const lane = isDemoMode()
    ? (await demoDelay(820), demoConstraints(input))
    : await completeResearch(
        input,
        "constraints",
        "Name operational constraints: crashes, deploys, timeouts, human latency, irreversible side effects.",
      );
  await writeEvent({ type: "lane", id: "constraints", lane });
  return lane;
}

async function researchComparables(input: BriefInput): Promise<ResearchLane> {
  "use step";
  const lane = isDemoMode()
    ? (await demoDelay(640), demoComparables())
    : await completeResearch(
        input,
        "comparables",
        "Compare relevant systems (queues, Temporal, Inngest, Vercel Workflows, or whatever fits the topic). Honest tradeoffs.",
      );
  await writeEvent({ type: "lane", id: "comparables", lane });
  return lane;
}

async function writeDraft(
  input: BriefInput,
  research: {
    landscape: ResearchLane;
    constraints: ResearchLane;
    comparables: ResearchLane;
  },
  iteration: number,
): Promise<Draft> {
  "use step";
  if (isDemoMode()) {
    await demoDelay(900);
    return demoDraft(input, iteration);
  }

  const { object } = await generateObject({
    model: model(),
    schema: draftSchema,
    prompt: [
      "Write a staff-level one-page brief. Tight prose. No hype.",
      `Topic: ${input.topic}`,
      input.audience ? `Audience: ${input.audience}` : "",
      input.notes ? `Notes: ${input.notes}` : "",
      "Research — landscape:",
      JSON.stringify(research.landscape),
      "Research — constraints:",
      JSON.stringify(research.constraints),
      "Research — comparables:",
      JSON.stringify(research.comparables),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}

async function critiqueDraft(
  input: BriefInput,
  draft: Draft,
  iteration: number,
): Promise<Evaluation> {
  "use step";
  if (isDemoMode()) {
    await demoDelay(700);
    return demoEvaluation(iteration);
  }

  const { object } = await generateObject({
    model: model(),
    schema: evaluationSchema,
    prompt: [
      `You are a harsh staff-engineer editor. Score 1-10. Pass only at ${PASS_SCORE}+.`,
      "Reject slogans, missing rollout plans, and unmeasured recommendations.",
      `Topic: ${input.topic}`,
      `Draft: ${JSON.stringify(draft)}`,
    ].join("\n"),
  });

  return object;
}

async function reviseDraft(
  input: BriefInput,
  draft: Draft,
  evaluation: Evaluation,
  iteration: number,
): Promise<Draft> {
  "use step";
  if (isDemoMode()) {
    await demoDelay(900);
    return demoDraft(input, iteration);
  }

  const { object } = await generateObject({
    model: model(),
    schema: draftSchema,
    prompt: [
      "Revise the brief to address every issue. Keep it one page.",
      `Topic: ${input.topic}`,
      `Current draft: ${JSON.stringify(draft)}`,
      `Critique: ${JSON.stringify(evaluation)}`,
    ].join("\n"),
  });

  return object;
}

async function publishBrief(
  draft: Draft,
  decision: Approval,
): Promise<PublishedBrief> {
  "use step";
  if (isDemoMode()) {
    await demoDelay(400);
  }

  return {
    title: draft.title,
    publishedAt: new Date().toISOString(),
    reviewer: decision.reviewer?.trim() || "reviewer",
    comment: decision.comment,
  };
}

async function completeResearch(
  input: BriefInput,
  id: string,
  instruction: string,
): Promise<ResearchLane> {
  const { object } = await generateObject({
    model: model(),
    schema: researchLaneSchema,
    prompt: [
      `Research lane: ${id}. ${instruction}`,
      `Topic: ${input.topic}`,
      input.audience ? `Audience: ${input.audience}` : "",
      input.notes ? `Notes: ${input.notes}` : "",
      "Return a title, a 1-2 sentence summary, and 3-6 sharp bullets.",
    ]
      .filter(Boolean)
      .join("\n"),
  });
  return object;
}

function model() {
  if (process.env.OPENAI_API_KEY) {
    return openai(getModelId());
  }
  return `openai/${getModelId()}`;
}
