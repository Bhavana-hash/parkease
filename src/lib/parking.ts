import { and, asc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { parkingSessions, parkingSlots } from "@/db/schema";

type SlotType = "compact" | "sedan" | "suv";

const DEFAULT_SLOTS: {
  id: string;
  label: string;
  slotType: SlotType;
  hourlyRateCents: number;
  status: "available";
}[] = Array.from({ length: 20 }).map((_, index) => {
  const slotNumber = index + 1;
  const slotType: SlotType =
    slotNumber <= 8 ? "compact" : slotNumber <= 16 ? "sedan" : "suv";
  const hourlyRateCents = slotType === "compact" ? 1200 : slotType === "sedan" ? 1800 : 2400;

  return {
    id: randomUUID(),
    label: `P-${slotNumber.toString().padStart(2, "0")}`,
    slotType,
    hourlyRateCents,
    status: "available" as const,
  };
});

export const calculatePriceCents = (startedAt: Date, hourlyRateCents: number) => {
  const elapsedMs = Date.now() - startedAt.getTime();
  const elapsedSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
  const perSecondRate = hourlyRateCents / 3600;
  return Math.ceil(elapsedSeconds * perSecondRate);
};

export const seedSlotsIfNeeded = async () => {
  const existing = await db.select({ id: parkingSlots.id }).from(parkingSlots).limit(1);
  if (existing.length > 0) return;

  await db.insert(parkingSlots).values(DEFAULT_SLOTS);
};

export const getParkingState = async (userId: string) => {
  await seedSlotsIfNeeded();

  const slots = await db.select().from(parkingSlots).orderBy(asc(parkingSlots.label));
  const activeSessions = await db
    .select()
    .from(parkingSessions)
    .where(and(eq(parkingSessions.status, "active"), isNull(parkingSessions.endedAt)));

  const activeForUser = activeSessions.filter((session) => session.userId === userId);

  return { slots, activeSessions, activeForUser };
};

export const checkInToSlot = async ({
  userId,
  slotId,
  vehicleNumber,
}: {
  userId: string;
  slotId: string;
  vehicleNumber: string;
}) => {
  await seedSlotsIfNeeded();

  const [slot] = await db.select().from(parkingSlots).where(eq(parkingSlots.id, slotId)).limit(1);

  if (!slot) throw new Error("Slot not found.");
  if (slot.status === "occupied") throw new Error("This slot is already occupied.");

  const [activeForUser] = await db
    .select({ id: parkingSessions.id })
    .from(parkingSessions)
    .where(and(eq(parkingSessions.userId, userId), eq(parkingSessions.status, "active"), isNull(parkingSessions.endedAt)))
    .limit(1);

  if (activeForUser) throw new Error("You already have an active parking session.");

  const newSession = {
    id: randomUUID(),
    slotId,
    userId,
    vehicleNumber,
    status: "active" as const,
    hourlyRateCents: slot.hourlyRateCents,
  };

  await db.transaction(async (tx) => {
    await tx.insert(parkingSessions).values(newSession);
    await tx
      .update(parkingSlots)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(parkingSlots.id, slotId));
  });

  return newSession.id;
};

export const checkoutSession = async ({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) => {
  const [session] = await db
    .select()
    .from(parkingSessions)
    .where(and(eq(parkingSessions.id, sessionId), eq(parkingSessions.userId, userId)))
    .limit(1);

  if (!session) throw new Error("Session not found.");
  if (session.status !== "active" || session.endedAt) {
    throw new Error("Session is already checked out.");
  }

  const totalAmountCents = calculatePriceCents(session.startedAt, session.hourlyRateCents);
  const endedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(parkingSessions)
      .set({ status: "completed", endedAt, totalAmountCents, updatedAt: endedAt })
      .where(eq(parkingSessions.id, session.id));

    await tx
      .update(parkingSlots)
      .set({ status: "available", updatedAt: endedAt })
      .where(eq(parkingSlots.id, session.slotId));
  });

  return { totalAmountCents, sessionId: session.id };
};

export const getCompletedSessionBilling = async ({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string;
}) => {
  const [row] = await db
    .select({
      id: parkingSessions.id,
      slotId: parkingSessions.slotId,
      slotLabel: parkingSlots.label,
      slotType: parkingSlots.slotType,
      vehicleNumber: parkingSessions.vehicleNumber,
      startedAt: parkingSessions.startedAt,
      endedAt: parkingSessions.endedAt,
      hourlyRateCents: parkingSessions.hourlyRateCents,
      totalAmountCents: parkingSessions.totalAmountCents,
      status: parkingSessions.status,
    })
    .from(parkingSessions)
    .innerJoin(parkingSlots, eq(parkingSlots.id, parkingSessions.slotId))
    .where(and(eq(parkingSessions.id, sessionId), eq(parkingSessions.userId, userId)))
    .limit(1);

  if (!row) {
    throw new Error("Billing record not found.");
  }

  if (row.status !== "completed" || !row.endedAt || row.totalAmountCents === null) {
    throw new Error("Billing is only available after checkout.");
  }

  return row;
};
