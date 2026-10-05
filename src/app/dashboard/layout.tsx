import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentUser } from "@/lib/auth";
import { MarketProvider } from "@/components/market";
import { SessionProvider, Shell } from "@/components/shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <MarketProvider>
      <SessionProvider>
        <Shell>{children}</Shell>
      </SessionProvider>
    </MarketProvider>
  );
}
