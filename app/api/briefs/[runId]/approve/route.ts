import { NextResponse } from "next/server";
import { resumeHook } from "workflow/api";
import { z } from "zod";
import { approvalSchema } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = approvalSchema.extend({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval payload." }, { status: 400 });
  }

  const { token, ...decision } = parsed.data;

  try {
    await resumeHook(token, decision);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No waiting approval hook for this brief." },
      { status: 404 },
    );
  }
}
