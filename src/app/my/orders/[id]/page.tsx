import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { OrderDetailView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "주문상세" };
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerShell><ClientGate><OrderDetailView orderId={id} /></ClientGate></CustomerShell>;
}
