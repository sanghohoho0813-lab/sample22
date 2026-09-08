import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import ProductListView from "@/components/customer/ProductListView";
import { CATEGORIES } from "@/lib/seed";
import type { CategorySlug } from "@/lib/types";

export function generateStaticParams() { return CATEGORIES.map((c) => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  return { title: c ? `${c.name} 상품` : "카테고리", description: c?.description };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.slug === slug);
  if (!c) notFound();
  return (
    <CustomerShell>
      <ClientGate><ProductListView title={c.name} subtitle={c.description} base={{ category: c.slug as CategorySlug }} lockCategory /></ClientGate>
    </CustomerShell>
  );
}
