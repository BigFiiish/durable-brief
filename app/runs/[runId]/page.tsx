import { Desk } from "@/components/desk";

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <Desk runId={runId} />;
}
