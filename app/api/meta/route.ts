import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/model";

export async function GET() {
  return NextResponse.json({ demo: isDemoMode() });
}
