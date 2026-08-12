import type { BriefInput, Draft, Evaluation, ResearchLane } from "./types";

export async function demoDelay(ms = 750) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function demoLandscape(input: BriefInput): ResearchLane {
  return {
    title: "Landscape",
    summary: `The ask — “${truncate(input.topic, 72)}” — sits in a market that already solved queues, and is now colliding with agents that need to pause.`,
    bullets: [
      "Classic workers are great at throughput. They are poor at waiting days for a human without burning a process.",
      "Agent loops add LLM calls, tools, and approval gates on top of the same crash/retry problem.",
      "Durable execution treats await as a checkpoint: sleep, hooks, and steps survive deploys.",
      "The differentiator is not 'can it retry' — it is 'can it resume exactly here, with the same state'.",
    ],
  };
}

export function demoConstraints(input: BriefInput): ResearchLane {
  return {
    title: "Constraints",
    summary:
      "Any recommendation has to survive function timeouts, rolling deploys, and a reviewer who will not be at the keyboard.",
    bullets: [
      "In-memory agent loops lose tool progress on crash. That is unacceptable once a tool has side effects.",
      "Human approval cannot be a 30-second modal. It has to suspend the run and resume hours later.",
      "Observability has to be the event log, not a pile of ad-hoc logs around a worker.",
      input.notes
        ? `Requester note in play: ${truncate(input.notes, 140)}`
        : "No extra notes were provided; default to operational honesty over vendor poetry.",
    ],
  };
}

export function demoComparables(): ResearchLane {
  return {
    title: "Comparables",
    summary:
      "Temporal, Inngest, and Vercel Workflows all offer durable steps. The bet is on language-level await versus a separate orchestration API.",
    bullets: [
      "Temporal: proven, polyglot, operationally heavy. Excellent if you already run it.",
      "Inngest: event-first functions, strong DX, less of a 'write async TypeScript' story.",
      "Vercel Workflows / WDK: `'use workflow'` + `'use step'`, local world, AI SDK alignment.",
      "If the team already ships Next.js on Vercel, the infra tax of a second orchestrator is the real cost.",
    ],
  };
}

export function demoDraft(input: BriefInput, iteration: number): Draft {
  if (iteration === 0) {
    return {
      title: "Adopt durable workflows for agent runs — with a human gate",
      lede: `We should stop treating long-running agents as jobs in a pool. For “${truncate(input.topic, 80)}”, the failure mode is not a missed retry. It is lost state between a tool call and a person saying yes.`,
      findings: [
        "Lease/retry/DLQ already cover at-least-once work. They do not cover 'wait three hours, then continue this function'.",
        "Parallel research and sequential drafting are ordinary async. The runtime should persist them, not the app.",
        "An evaluator-optimizer loop is a while-loop with a score. It only becomes production-grade if each pass is a step.",
        "A publish action that cannot pause for approval will eventually ship the wrong brief.",
      ],
      recommendation:
        "Pilot Vercel Workflows on one agent path: research → draft → critique → human approve → publish. Keep the existing queue for high-throughput, short jobs.",
      openQuestions: [
        "What is the SLO for a paused run — hours, or weeks?",
        "Who is the reviewer of record, and how do we route the hook token?",
        "Do we need a fallback if the model cannot reach the pass score?",
      ],
    };
  }

  return {
    title: "Pilot WDK on the agent path; keep the queue for short jobs",
    lede: "Durable execution is the right primitive for agents that sleep, wait on humans, and must survive deploys. A job queue remains the right primitive for bursty, short work. Use both, on purpose.",
    findings: [
      "Queues excel at lease exclusivity, backoff, and dead letters. They make you invent sleep, hooks, and replay.",
      "WDK makes those language-level: `'use workflow'` orchestrates, `'use step'` isolates I/O and retries.",
      "The patterns that matter for agents — parallel fan-out, sequential draft, evaluator-optimizer, human hook — are ordinary TypeScript control flow.",
      "Local world means the same code is inspectable with `npx workflow web` before it ever hits production.",
    ],
    recommendation:
      "Do not rewrite the queue. Commission a single durable brief/agent workflow, require a human hook before side effects, and measure resume-after-deploy plus time-to-approval. Expand only if those two numbers hold.",
    openQuestions: [
      "Which side effects are irreversible enough to require the approval hook?",
      "What is the maximum critique loop we will pay for before failing closed?",
      "How do we expose run traces to the same people who today tail worker logs?",
    ],
  };
}

export function demoEvaluation(iteration: number): Evaluation {
  if (iteration === 0) {
    return {
      score: 6,
      verdict: "revise",
      issues: [
        "Recommendation is directionally right but still sounds like a slogan, not a rollout.",
        "Does not say what stays on the existing queue.",
        "Open questions are generic; a staff brief should name the two numbers we will measure.",
      ],
      suggestions: [
        "Split the world: durable workflows for pause/resume agents, queue for short jobs.",
        "Name the pilot path explicitly: research → draft → critique → approve → publish.",
        "Add resume-after-deploy and time-to-approval as the success metrics.",
      ],
    };
  }

  return {
    score: 9,
    verdict: "pass",
    issues: [
      "Still assumes the team is already on Vercel — fine for this audience, say it once.",
    ],
    suggestions: [
      "Ship the pilot with the approval hook mandatory for publish.",
      "Keep the event log as the source of truth; do not add a second status table.",
    ],
  };
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
