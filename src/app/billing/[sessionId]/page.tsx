import { differenceInMinutes, format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCompletedSessionBilling } from "@/lib/parking";
import { requireSession } from "@/lib/session";
import { PaymentButton } from "./payment-button";

declare global {
  interface Window {
    Razorpay: any;
  }
}


const toCurrency = (amountCents: number) => `INR ${(amountCents / 100).toFixed(2)}`;

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function BillingPage({ params }: Props) {
  const { sessionId } = await params;
  const authSession = await requireSession();
  const billingResult = await getCompletedSessionBilling({
    userId: authSession.user.id,
    sessionId,
  }).catch(() => null);

  if (!billingResult) {
    notFound();
  }

  const endedAt = billingResult.endedAt;
  const totalAmountCents = billingResult.totalAmountCents;

  if (!endedAt || totalAmountCents === null) {
    notFound();
  }

  const durationMinutes = Math.max(
    1,
    differenceInMinutes(new Date(endedAt), new Date(billingResult.startedAt)),
  );

   

  return (
    <main className="container mx-auto px-4 py-6 sm:py-10">
      <Card className="glass-card mx-auto max-w-2xl border-primary/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-2xl text-transparent">
            Billing Summary
          </CardTitle>
          <CardDescription>
            Review parking and vehicle details before payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Vehicle number</p>
              <p className="font-medium">{billingResult.vehicleNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slot</p>
              <p className="font-medium">{billingResult.slotLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Slot type</p>
              <p className="font-medium uppercase">{billingResult.slotType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rate</p>
              <p className="font-medium">{toCurrency(billingResult.hourlyRateCents)} / hour</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Check in</p>
              <p className="font-medium">{format(new Date(billingResult.startedAt), "PPpp")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Check out</p>
              <p className="font-medium">{format(new Date(endedAt), "PPpp")}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total parked duration</p>
            <p className="font-medium">{durationMinutes} minutes</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-muted-foreground">Total amount</p>
            <p className="text-2xl font-semibold">{toCurrency(totalAmountCents)}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to dashboard
            </Link>
           <PaymentButton amount={totalAmountCents} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
