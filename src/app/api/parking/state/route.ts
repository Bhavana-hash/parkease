import { NextResponse } from "next/server";
import { getParkingState } from "@/lib/parking";
import { requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    const state = await getParkingState(session.user.id);
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
