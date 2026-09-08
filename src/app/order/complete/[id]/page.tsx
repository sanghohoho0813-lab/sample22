import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { OrderCompleteView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "주문완료" };
export default async function OrderCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerShell><ClientGate><OrderCompleteView orderId={id} /></ClientGate></CustomerShell>;
}
