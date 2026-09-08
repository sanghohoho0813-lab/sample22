import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import ProductListView from "@/components/customer/ProductListView";

export const metadata: Metadata = { title: "특가" };

export default function DealsPage() {
  return (
    <CustomerShell>
      <ClientGate><ProductListView title="이번 주 특가" subtitle="묶음 구성 할인과 기획전 상품" base={{ discountOnly: true, sort: "discount" }} /></ClientGate>
    </CustomerShell>
  );
}
