"use client";

import { FormEvent, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) throw new Error(result.error.message);
      }

      onDone();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="glass-card hover-lift w-full max-w-md border-primary/20 shadow-2xl">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-2xl font-medium text-primary sparkle">
          <Sparkles className="size-3.5" />
          Parkease
        </div>
        <CardTitle className="text-2xl">
          {mode === "sign-up" ? "Create account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          Sign in to manage smart parking slots and real-time billing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "sign-up" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="transition-all focus-visible:ring-4"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="transition-all focus-visible:ring-4"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              className="transition-all focus-visible:ring-4"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            className="w-full bg-linear-to-r from-primary to-violet-500 text-primary-foreground hover:opacity-95"
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "sign-up"
              ? "Already have an account? Sign in"
              : "Need an account? Create one"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
