import { NextResponse } from "next/server";
import { z } from "zod";
import { checkInToSlot } from "@/lib/parking";
import { requireSession } from "@/lib/session";

const payloadSchema = z.object({
  slotId: z.string().min(1),
  vehicleNumber: z.string().trim().min(3).max(20),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const sessionId = await checkInToSlot({
      userId: session.user.id,
      slotId: payload.slotId,
      vehicleNumber: payload.vehicleNumber.toUpperCase(),
    });

    return NextResponse.json({ sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
