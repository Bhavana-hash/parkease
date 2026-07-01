import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_TEST_API_KEY!,
  key_secret: process.env.RAZORPAY_TEST_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  const { amount }: { amount: number } = await req.json();

  const order = await razorpay.orders.create({
    amount:  Math.round(amount),
    currency: "INR",
  });

  return NextResponse.json(order);
}
