"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { useRouter } from "next/navigation";
import {
  CarFront,
  Clock3,
  Loader2,
  LogOut,
  SparklesIcon,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type Slot = {
  id: string;
  label: string;
  slotType: "compact" | "sedan" | "suv";
  hourlyRateCents: number;
  status: "available" | "occupied";
};

type Session = {
  id: string;
  slotId: string;
  userId: string;
  vehicleNumber: string;
  startedAt: string;
  hourlyRateCents: number;
  status: "active" | "completed";
  endedAt: string | null;
};

type ParkingState = {
  slots: Slot[];
  activeSessions: Session[];
  activeForUser: Session[];
};

const toCurrency = (amountCents: number) =>
  `INR ${(amountCents / 100).toFixed(2)}`;

export function ParkingDashboard({ onSignOut }: { onSignOut: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<ParkingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [busy, setBusy] = useState(false);
  const [referenceNowMs, setReferenceNowMs] = useState(0);
  const [tick, setTick] = useState(0);

  const fetchState = async () => {
    const response = await fetch("/api/parking/state", { cache: "no-store" });
    const payload = (await response.json()) as ParkingState | { error: string };

    if (!response.ok) {
      throw new Error(
        "error" in payload ? payload.error : "Failed to load parking state.",
      );
    }

    setState(payload as ParkingState);
    setReferenceNowMs(Date.now());
    setTick(0);
  };

  const [vehicleType, setVehicleType] = useState<
    "all" | "compact" | "sedan" | "suv"
  >("all");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await fetchState();
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load data.",
        );
      } finally {
        setLoading(false);
      }
    };

    void run();

    const polling = setInterval(() => {
      void fetchState();
    }, 10000);

    const ticker = setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      clearInterval(polling);
      clearInterval(ticker);
    };
  }, []);

  const activeSession = state?.activeForUser[0] ?? null;
  const availableSlots =
    state?.slots.filter((slot) => slot.status === "available") ?? [];
  const effectiveSelectedSlotId = selectedSlotId || availableSlots[0]?.id || "";
  const nowMs = referenceNowMs + tick * 1000;

  const currentLivePriceCents = useMemo(() => {
    if (!activeSession) return 0;
    const elapsedSeconds = Math.max(
      1,
      Math.floor((nowMs - new Date(activeSession.startedAt).getTime()) / 1000),
    );
    return Math.ceil((activeSession.hourlyRateCents / 3600) * elapsedSeconds);
  }, [activeSession, nowMs]);
  const occupiedCount =
    state?.slots.filter((slot) => slot.status === "occupied").length ?? 0;

  const onCheckIn = async () => {
    if (!effectiveSelectedSlotId || !vehicleNumber.trim()) return;

    try {
      setBusy(true);
      setError("");
      const response = await fetch("/api/parking/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: effectiveSelectedSlotId,
          vehicleNumber,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to check in.");
      }

      setVehicleNumber("");
      await fetchState();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to check in.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onCheckout = async () => {
    if (!activeSession) return;

    try {
      setBusy(true);
      setError("");
      const response = await fetch("/api/parking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      const payload = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to checkout.");
      }

      if (!payload.sessionId) {
        throw new Error("Missing billing session after checkout.");
      }

      router.push(`/billing/${payload.sessionId}`);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to checkout.",
      );
    } finally {
      setBusy(false);
    }
  };

  const onSignOutClick = async () => {
    await authClient.signOut();
    onSignOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const filteredSlots =
    vehicleType === "all"
      ? state?.slots
      : state?.slots.filter((slot) => slot.slotType === vehicleType);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-x-2">
            <SparklesIcon className="text-violet-500" />
            <h1 className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl">
              ParkEase Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Automated slot assignment with live duration and billing.
          </p>
        </div>
        <Button variant="outline" onClick={onSignOutClick}>
          <LogOut /> Sign out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card hover-lift border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Total slots</p>
              <p className="text-2xl font-semibold">{20}</p>
            </div>
            <CarFront className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="glass-card hover-lift border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Available slots</p>
              <p className="text-2xl font-semibold">{availableSlots.length}</p>
            </div>
            <CarFront className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="glass-card hover-lift border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Occupied slots</p>
              <p className="text-2xl font-semibold">{occupiedCount}</p>
            </div>
            <Clock3 className="size-5 text-primary" />
          </CardContent>
        </Card>
        <Card className="glass-card hover-lift border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Live amount</p>
              <p className="text-2xl font-semibold">
                {activeSession ? toCurrency(currentLivePriceCents) : "INR 0.00"}
              </p>
            </div>
            <Wallet className="size-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2 border-primary/20">
          <CardHeader>
            <div className="w-full flex justify-between items-center">
              <div>
                <CardTitle>Parking Slots</CardTitle>
                <CardDescription>Live inventory for all slots.</CardDescription>
              </div>
              <Select
                value={vehicleType}
                onValueChange={(value) =>
                  setVehicleType(value as "all" | "compact" | "sedan" | "suv")
                }
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue
                    defaultValue={`all`}
                    placeholder="Select Vehicle Type"
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      onClick={() => setVehicleType("all")}
                      value="all"
                    >
                      All
                    </SelectItem>
                    <SelectItem
                      onClick={() => setVehicleType("compact")}
                      value="compact"
                    >
                      Compact
                    </SelectItem>
                    <SelectItem
                      onClick={() => setVehicleType("sedan")}
                      value="sedan"
                    >
                      Sedan
                    </SelectItem>
                    <SelectItem
                      onClick={() => setVehicleType("suv")}
                      value="suv"
                    >
                      SUV
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredSlots?.map((slot) => {
              const occupied = slot.status === "occupied";

              return (
                <button
                  key={slot.id}
                  onClick={() => !occupied && setSelectedSlotId(slot.id)}
                  className={`hover-lift rounded-xl border p-3 text-left transition ${
                    effectiveSelectedSlotId === slot.id
                      ? "border-primary bg-linear-to-br from-primary/20 to-violet-500/10"
                      : "border-border hover:border-primary/60"
                  } ${occupied ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{slot.label}</span>
                    <Badge variant={occupied ? "secondary" : "default"}>
                      {slot.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground uppercase">
                    {slot.slotType}
                  </p>
                  <p className="text-sm mt-1">
                    {toCurrency(slot.hourlyRateCents)}/hr
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle>
              {activeSession ? "Active Session" : "Start Parking"}
            </CardTitle>
            <CardDescription>
              {activeSession
                ? "Track live pricing and checkout when ready."
                : "Select a slot and check in your vehicle."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{activeSession.vehicleNumber}</p>
                </div>
                <Separator />
                <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {formatDistanceStrict(
                      new Date(activeSession.startedAt),
                      nowMs,
                      {
                        roundingMethod: "floor",
                      },
                    )}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">Live amount</p>
                  <p className="text-xl font-semibold">
                    {toCurrency(currentLivePriceCents)}
                  </p>
                </div>
                <Button
                  onClick={onCheckout}
                  className="w-full bg-linear-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-95"
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : null}
                  Checkout
                </Button>
                {/* /razorpay integration/ */}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-number">Vehicle number</Label>
                  <Input
                    id="vehicle-number"
                    placeholder="e.g. MH12AB1234"
                    value={vehicleNumber}
                    onChange={(event) =>
                      setVehicleNumber(event.target.value.toUpperCase())
                    }
                  />
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">Selected slot</p>
                  <p className="font-medium">
                    {state?.slots.find(
                      (slot) => slot.id === effectiveSelectedSlotId,
                    )?.label ?? "None"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {availableSlots.length} slots currently available
                  </p>
                </div>

                <Button
                  onClick={onCheckIn}
                  className="w-full bg-linear-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-95"
                  disabled={
                    busy || !effectiveSelectedSlotId || !vehicleNumber.trim()
                  }
                >
                  {busy ? <Loader2 className="animate-spin" /> : <CarFront />}
                  Start parking
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
