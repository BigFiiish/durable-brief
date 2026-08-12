import { ComposeForm } from "@/components/compose-form";
import { isDemoMode } from "@/lib/model";

const PATTERNS = [
  {
    pattern: "Parallel",
    title: "Research fan-out",
    body: "Three `'use step'` calls in `Promise.all`: landscape, constraints, comparables. Independent I/O, one join.",
  },
  {
    pattern: "Sequential",
    title: "Draft from evidence",
    body: "The draft step cannot start until every lane returns. Ordinary `await`, persisted by the runtime.",
  },
  {
    pattern: "Loop",
    title: "Evaluator-optimizer",
    body: "Critique scores the draft. Below 8, revise and try again. The loop lives in the workflow, not in a chat agent.",
  },
  {
    pattern: "Hook",
    title: "Human gate",
    body: "`createHook` suspends the run. Approve hours later — after a refresh or a deploy — and publish resumes.",
  },
];

export default function Home() {
  const demo = isDemoMode();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-end justify-between gap-6 border-b border-white/10 px-6 py-5 sm:px-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Workflow SDK · briefing desk
          </p>
          <h1 className="mt-2 font-serif text-4xl text-paper sm:text-5xl">
            Durable Brief
          </h1>
        </div>
        <p className="hidden max-w-xs text-right font-mono text-[11px] leading-relaxed text-muted sm:block">
          Built to show pause, resume, and critique — the Workflows job, in one run.
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="flex flex-col gap-8">
          <p className="max-w-xl font-serif text-2xl leading-snug text-paper/90">
            Commission a one-page brief. The run researches in parallel, drafts,
            argues with itself, then waits for you. Kill the tab. It will still
            be waiting.
          </p>
          <ComposeForm demo={demo} />
        </section>

        <aside className="flex flex-col gap-4">
          {PATTERNS.map((item) => (
            <article
              key={item.pattern}
              className="border border-white/10 bg-white/[0.03] px-5 py-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ember">
                {item.pattern}
              </p>
              <h2 className="mt-1 font-serif text-xl text-paper">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">{item.body}</p>
            </article>
          ))}
        </aside>
      </main>
    </div>
  );
}
