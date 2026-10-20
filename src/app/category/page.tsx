import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import CategoryIndexView from "@/components/customer/CategoryIndexView";

export const metadata: Metadata = { title: "카테고리" };

export default function CategoryIndex() {
  return (
    <CustomerShell>
      <CategoryIndexView />
    </CustomerShell>
  );
}
