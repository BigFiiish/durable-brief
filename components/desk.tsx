"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  initialDeskState,
  parseEventLine,
  reduceDesk,
  type DeskState,
  type LaneId,
  type Phase,
} from "@/lib/events";
import type { Draft, Evaluation, ResearchLane } from "@/lib/types";

const STAGES: { id: Phase; label: string; pattern: string }[] = [
  { id: "research", label: "Research", pattern: "parallel" },
  { id: "draft", label: "Draft", pattern: "sequential" },
  { id: "critique", label: "Critique", pattern: "loop" },
  { id: "awaiting_approval", label: "Human gate", pattern: "hook" },
  { id: "published", label: "Publish", pattern: "step" },
];

const LANES: { id: LaneId; label: string }[] = [
  { id: "landscape", label: "Landscape" },
  { id: "constraints", label: "Constraints" },
  { id: "comparables", label: "Comparables" },
];

export function Desk({ runId }: { runId: string }) {
  const [state, setState] = useState<DeskState>(initialDeskState);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [chunkIndex, setChunkIndex] = useState(0);
  const receivedRef = useRef(0);
  const phaseRef = useRef<Phase>(initialDeskState.phase);

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    const isTerminal = (phase: Phase) =>
      phase === "published" || phase === "rejected" || phase === "failed";

    async function connect(startIndex: number) {
      const response = await fetch(
        `/api/briefs/${runId}/stream?startIndex=${startIndex}`,
        { signal: abort.signal },
      );
      if (!response.ok || !response.body) {
        throw new Error("Could not attach to the run stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyLine = (line: string) => {
        const event = parseEventLine(line);
        if (!event) return;
        receivedRef.current += 1;
        if (cancelled) return;
        setChunkIndex(receivedRef.current);
        setState((current) => {
          const next = reduceDesk(current, event);
          phaseRef.current = next.phase;
          return next;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          applyLine(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) applyLine(line);
      }
    }

    async function follow() {
      while (!cancelled && !isTerminal(phaseRef.current)) {
        try {
          await connect(receivedRef.current);
        } catch (error: unknown) {
          if (abort.signal.aborted || cancelled) return;
          setStreamError(
            error instanceof Error ? error.message : "Stream failed.",
          );
          return;
        }
        if (cancelled || isTerminal(phaseRef.current)) return;
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    follow();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [runId]);

  const latestDraft = state.drafts.at(-1)?.draft;
  const latestEval = state.evaluations.at(-1)?.evaluation;
  const activeStage = normalizeStage(state.phase);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-6 py-4 sm:px-8">
        <div>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold hover:text-paper"
          >
            ← Durable Brief
          </Link>
          <p className="mt-2 font-mono text-[11px] text-muted">
            run {runId.slice(0, 12)} · {chunkIndex} events
          </p>
        </div>
        <StatusPill phase={state.phase} />
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
        <Pipeline active={activeStage} phase={state.phase} />

        <main className="border-white/10 px-6 py-6 sm:px-8 lg:border-x">
          {streamError ? (
            <p className="font-mono text-sm text-ember">{streamError}</p>
          ) : null}
          {state.error ? (
            <p className="font-mono text-sm text-ember">{state.error}</p>
          ) : null}

          <section className="mb-8">
            <Eyebrow>Parallel · three steps, one join</Eyebrow>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {LANES.map((lane) => (
                <LaneCard
                  key={lane.id}
                  label={lane.label}
                  lane={state.lanes[lane.id]}
                  pending={state.phase === "research" && !state.lanes[lane.id]}
                />
              ))}
            </div>
          </section>

          <section>
            <Eyebrow>Sequential · then a critique loop</Eyebrow>
            {latestDraft ? (
              <BriefPaper
                draft={latestDraft}
                iteration={state.drafts.at(-1)?.iteration ?? 0}
                published={state.phase === "published"}
              />
            ) : (
              <p className="mt-3 font-mono text-sm text-muted">
                Waiting on research before the draft step runs.
              </p>
            )}
          </section>
        </main>

        <aside className="flex flex-col gap-6 px-6 py-6">
          <CritiquePanel evaluations={state.evaluations} />
          <ApprovalPanel runId={runId} state={state} latestEval={latestEval} />
        </aside>
      </div>
    </div>
  );
}

function Pipeline({ active, phase }: { active: Phase; phase: Phase }) {
  const activeIndex = STAGES.findIndex((stage) => stage.id === active);
  const rejected = phase === "rejected";
  const failed = phase === "failed";

  return (
    <ol className="flex gap-3 overflow-x-auto px-6 py-5 lg:flex-col lg:overflow-visible lg:px-6 lg:py-6">
      {STAGES.map((stage, index) => {
        const done =
          !rejected &&
          !failed &&
          (index < activeIndex || phase === "published");
        const current = stage.id === active && phase !== "published";
        return (
          <li key={stage.id} className="min-w-[9.5rem]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ember">
              {stage.pattern}
            </p>
            <p
              className={`font-serif text-lg ${
                current || done ? "text-paper" : "text-muted"
              }`}
            >
              {stage.label}
            </p>
            <p className="font-mono text-[10px] text-muted">
              {done ? "done" : current ? "running" : "queued"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function LaneCard({
  label,
  lane,
  pending,
}: {
  label: string;
  lane?: ResearchLane;
  pending: boolean;
}) {
  return (
    <article className="border border-white/10 bg-white/[0.03] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
        {label}
      </p>
      {lane ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-paper/85">{lane.summary}</p>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-paper/65">
            {lane.bullets.map((bullet) => (
              <li key={bullet}>· {bullet}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 font-mono text-xs text-muted">
          {pending ? "step running…" : "not started"}
        </p>
      )}
    </article>
  );
}

function BriefPaper({
  draft,
  iteration,
  published,
}: {
  draft: Draft;
  iteration: number;
  published: boolean;
}) {
  return (
    <article className="mt-3 bg-paper px-6 py-7 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:px-8">
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
          Draft {iteration + 1}
          {published ? " · published" : ""}
        </p>
        <p className="font-mono text-[10px] text-muted">one page</p>
      </div>
      <h2 className="mt-5 font-serif text-3xl leading-tight">{draft.title}</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{draft.lede}</p>
      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        Findings
      </h3>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed">
        {draft.findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        Recommendation
      </h3>
      <p className="mt-2 text-sm leading-relaxed">{draft.recommendation}</p>
      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        Open questions
      </h3>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-ink/75">
        {draft.openQuestions.map((question) => (
          <li key={question}>— {question}</li>
        ))}
      </ul>
    </article>
  );
}

function CritiquePanel({
  evaluations,
}: {
  evaluations: DeskState["evaluations"];
}) {
  return (
    <section>
      <Eyebrow>Evaluator-optimizer</Eyebrow>
      {evaluations.length === 0 ? (
        <p className="mt-2 font-mono text-xs text-muted">No critique yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {evaluations.map(({ evaluation, iteration }) => (
            <li key={iteration} className="border border-white/10 p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                  Pass {iteration + 1}
                </p>
                <p className="font-serif text-2xl text-paper">{evaluation.score}/10</p>
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase text-ember">
                {evaluation.verdict}
              </p>
              <ul className="mt-3 space-y-1 text-xs leading-relaxed text-paper/70">
                {evaluation.issues.map((issue) => (
                  <li key={issue}>· {issue}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ApprovalPanel({
  runId,
  state,
  latestEval,
}: {
  runId: string;
  state: DeskState;
  latestEval?: Evaluation;
}) {
  const waiting = state.phase === "awaiting_approval" && Boolean(state.token);

  if (state.phase === "published" && state.published) {
    return (
      <section className="border border-moss/40 bg-moss/10 p-4">
        <Eyebrow>Published</Eyebrow>
        <p className="mt-2 font-serif text-xl text-paper">{state.published.title}</p>
        <p className="mt-2 font-mono text-[11px] text-paper/70">
          {state.published.reviewer} · {state.published.publishedAt}
        </p>
        {state.published.comment ? (
          <p className="mt-3 text-sm text-paper/80">{state.published.comment}</p>
        ) : null}
      </section>
    );
  }

  if (state.phase === "rejected" && state.decision) {
    return (
      <section className="border border-danger/40 bg-danger/10 p-4">
        <Eyebrow>Held</Eyebrow>
        <p className="mt-2 text-sm text-paper/80">
          {state.decision.reviewer} sent it back.
        </p>
        <p className="mt-2 text-sm text-paper/70">{state.decision.comment}</p>
      </section>
    );
  }

  return (
    <section className="border border-white/10 p-4">
      <Eyebrow>Human gate</Eyebrow>
      <p className="mt-2 text-sm leading-relaxed text-paper/70">
        Publish is a step with a side effect. The workflow suspends on a hook
        until a person resumes it. Refresh this page — the run is still here.
      </p>
      {latestEval && latestEval.verdict === "revise" && waiting ? (
        <p className="mt-3 font-mono text-[11px] text-gold">
          Critic never hit {8}+. You can still ship, or send it back.
        </p>
      ) : null}
      {waiting && state.token ? (
        <ApproveForm runId={runId} token={state.token} />
      ) : (
        <p className="mt-3 font-mono text-xs text-muted">Waiting for the hook…</p>
      )}
    </section>
  );
}

function ApproveForm({ runId, token }: { runId: string; token: string }) {
  const [comment, setComment] = useState("Ship the pilot.");
  const [reviewer, setReviewer] = useState("you");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (approved: boolean) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${runId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, approved, comment, reviewer }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not resume the hook.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not resume the hook.");
        setPending(false);
      }
    },
    [comment, reviewer, runId, token],
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      <input
        value={reviewer}
        onChange={(event) => setReviewer(event.target.value)}
        placeholder="Reviewer"
        className="rounded-sm border border-white/15 bg-chrome px-3 py-2 text-sm outline-none focus:border-ember"
      />
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        className="rounded-sm border border-white/15 bg-chrome px-3 py-2 text-sm outline-none focus:border-ember"
      />
      {error ? <p className="font-mono text-xs text-ember">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(true)}
          className="flex-1 bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(false)}
          className="flex-1 border border-white/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-paper disabled:opacity-60"
        >
          Hold
        </button>
      </div>
    </div>
  );
}

function StatusPill({ phase }: { phase: Phase }) {
  const label = useMemo(() => {
    switch (phase) {
      case "research":
        return "Fan-out";
      case "draft":
        return "Drafting";
      case "critique":
        return "Scoring";
      case "awaiting_approval":
        return "Paused · hook";
      case "published":
        return "Published";
      case "rejected":
        return "Held";
      case "failed":
        return "Failed";
    }
  }, [phase]);

  return (
    <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/80">
      {label}
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
      {children}
    </p>
  );
}

function normalizeStage(phase: Phase): Phase {
  if (phase === "rejected" || phase === "failed") return "awaiting_approval";
  return phase;
}
