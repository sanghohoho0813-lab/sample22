import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import ProductDetailView from "@/components/customer/ProductDetailView";
import { generateDemoData } from "@/lib/seed";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = generateDemoData().products.find((x) => x.id === id);
  return { title: p ? p.name : "상품", description: p?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <CustomerShell hideBottomNav={false}>
      <ClientGate><ProductDetailView productId={id} /></ClientGate>
    </CustomerShell>
  );
}
