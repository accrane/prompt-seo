import type { ComponentProps } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { signOut } from "@/lib/auth-actions";

type Props = Omit<
  ComponentProps<typeof AdminShell>,
  "logoutAction" | "userEmail" | "showAdminNav"
> & {
  operatorEmail: string;
};

/** AdminShell wired to this app's auth so pages only pass page-level props. */
export function AppShell({ operatorEmail, ...rest }: Props) {
  return <AdminShell logoutAction={signOut} userEmail={operatorEmail} {...rest} />;
}
