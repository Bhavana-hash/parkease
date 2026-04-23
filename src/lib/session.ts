import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export const requireSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session;
};
