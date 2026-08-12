import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { isDemoMode } from "@/lib/model";
import { briefInputSchema } from "@/lib/types";
import { briefWorkflow } from "@/workflows/brief";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = briefInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid brief. Give a topic of at least 8 characters." },
      { status: 400 },
    );
  }

  const run = await start(briefWorkflow, [parsed.data]);

  return NextResponse.json({
    runId: run.runId,
    briefId: parsed.data.briefId,
    demo: isDemoMode(),
  });
}
