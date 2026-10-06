import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { RepeatBasketView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "다시 구매" };
export default function RepeatPage() {
  return (
    <CustomerShell hideBottomNav backHref="/my">
      <ClientGate>
        <RepeatBasketView />
      </ClientGate>
    </CustomerShell>
  );
}
