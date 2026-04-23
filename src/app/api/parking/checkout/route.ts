import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutSession } from "@/lib/parking";
import { requireSession } from "@/lib/session";

const payloadSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    const result = await checkoutSession({
      userId: session.user.id,
      sessionId: payload.sessionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
