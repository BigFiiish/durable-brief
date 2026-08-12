"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EXAMPLES } from "@/lib/types";

export function ComposeForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [topic, setTopic] = useState<string>(EXAMPLES[0].topic);
  const [audience, setAudience] = useState<string>(EXAMPLES[0].audience);
  const [notes, setNotes] = useState<string>(EXAMPLES[0].notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const briefId = crypto.randomUUID();
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId, topic, audience, notes }),
      });
      const data = (await response.json()) as { runId?: string; error?: string };
      if (!response.ok || !data.runId) {
        throw new Error(data.error ?? "Could not start the workflow.");
      }
      router.push(`/runs/${data.runId}?briefId=${briefId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the workflow.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => {
          const active = topic === example.topic;
          return (
            <button
              key={example.label}
              type="button"
              onClick={() => {
                setTopic(example.topic);
                setAudience(example.audience);
                setNotes(example.notes);
              }}
              className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide uppercase ${
                active
                  ? "border-ember bg-ember text-paper"
                  : "border-rule/40 text-paper/70 hover:border-paper/40"
              }`}
            >
              {example.label}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
          Assignment
        </span>
        <textarea
          required
          minLength={8}
          rows={4}
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="resize-y rounded-sm border border-rule/50 bg-chrome px-4 py-3 font-serif text-xl leading-snug text-paper outline-none focus:border-ember"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            Audience
          </span>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className="rounded-sm border border-rule/50 bg-chrome px-3 py-2 text-sm text-paper outline-none focus:border-ember"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            Notes
          </span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-sm border border-rule/50 bg-chrome px-3 py-2 text-sm text-paper outline-none focus:border-ember"
          />
        </label>
      </div>

      {error ? (
        <p className="font-mono text-sm text-ember">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-paper px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-ink hover:bg-paper-2 disabled:opacity-60"
        >
          {pending ? "Starting run…" : "Commission brief"}
        </button>
        <p className="font-mono text-[11px] text-muted">
          {demo
            ? "Demo world — canned steps, no API key. The approval hook is real."
            : "Live model — each step is a durable LLM call."}
        </p>
      </div>
    </form>
  );
}
