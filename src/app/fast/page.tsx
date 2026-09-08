import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import ProductListView from "@/components/customer/ProductListView";

export const metadata: Metadata = { title: "빠른배송" };

export default function FastPage() {
  return (
    <CustomerShell>
      <ClientGate><ProductListView title="빠른배송" subtitle="오늘 15:00 전 주문하면 내일 도착하는 상품" base={{ delivery: "fast", sort: "popular" }} /></ClientGate>
    </CustomerShell>
  );
}
