import { getRun } from "workflow/api";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const startIndexParam = new URL(request.url).searchParams.get("startIndex");
  const startIndex = startIndexParam ? Number(startIndexParam) : 0;

  const run = getRun(runId);
  if (!(await run.exists)) {
    return new Response("Run not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = run
    .getReadable({ startIndex: Number.isFinite(startIndex) ? startIndex : 0 })
    .pipeThrough(
      new TransformStream<unknown, Uint8Array>({
        transform(chunk, controller) {
          let text: string;
          if (chunk instanceof Uint8Array) {
            text = decoder.decode(chunk);
          } else if (typeof chunk === "string") {
            text = chunk;
          } else {
            text = JSON.stringify(chunk);
          }
          if (!text.endsWith("\n")) text += "\n";
          controller.enqueue(encoder.encode(text));
        },
      }),
    );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
