"use client"

import { Button } from "@/components/ui/button"

interface Props {
    amount: number
}

export const PaymentButton = ({amount}: Props) => {

    const handlePayment = async () => {
        try {
          const res = await fetch("/api/create-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: amount,
            }),
          });
    
          const order: {
            id: string;
            amount: number;
          } = await res.json();
    
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_TEST_API_KEY,
    
            amount: Math.round((amount ?? 0) * 100),
            currency: "INR",
            name: "Parkease",
            description: "Smart Parking System",
    
            image: "https://example.com/your_logo",
    
            order_id: order.id,
    
            handler: function (response: any) {
            },
    
            prefill: {
              name: "",
              email: "",
              contact: "",
            },
    
            theme: {
              color: "#000000",
            },
          };
    
          const rzp = new window.Razorpay(options);
    
          rzp.on("payment.failed", function (response: any) {
            console.log(response.error);
          });
    
          rzp.open();
        } catch (error) {
          console.log(error);
        }
      };


    return (
         <Button onClick={handlePayment} className="bg-linear-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-95">
              Pay now
            </Button>
    )
}