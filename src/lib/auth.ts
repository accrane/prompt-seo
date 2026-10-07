import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, isOwner } from "@/lib/team";

export type Operator = {
  id: string;
  email: string;
  owner: boolean;
};

/** The signed-in operator, or null. Enforces the owner + team allowlist. */
export async function getOperator(): Promise<Operator | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !(await isAllowedEmail(user.email))) return null;
  return { id: user.id, email: user.email, owner: isOwner(user.email) };
}

/** Use at the top of every page and server action. Redirects when signed out. */
export async function requireOperator(): Promise<Operator> {
  const operator = await getOperator();
  if (!operator) redirect("/login?error=Please+sign+in");
  return operator;
}

export { isAllowedEmail as isAllowed };
