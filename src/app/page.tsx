"use client";

import { AuthForm } from "@/components/app/auth-form";
import { ParkingDashboard } from "@/components/app/parking-dashboard";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data, isPending, refetch } = authClient.useSession();

  if (isPending) {
    return (
      <main className="container mx-auto px-4 py-16">
        <p className="text-sm text-muted-foreground sparkle">Loading session...</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6 sm:py-10">
      {data?.session ? (
        <ParkingDashboard onSignOut={() => void refetch()} />
      ) : (
        <div className="min-h-[80vh] grid place-items-center">
          <AuthForm onDone={() => void refetch()} />
        </div>
      )}
    </main>
  );
}
