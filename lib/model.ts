export function isDemoMode() {
  if (process.env.DEMO_MODE === "1") return true;
  if (process.env.DEMO_MODE === "0") return false;
  return (
    !process.env.OPENAI_API_KEY &&
    !process.env.AI_GATEWAY_API_KEY &&
    !process.env.GATEWAY_API_KEY
  );
}

export function getModelId() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
