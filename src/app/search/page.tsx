import type { Metadata } from "next";
import { Suspense } from "react";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import SearchView from "@/components/customer/SearchView";

export const metadata: Metadata = { title: "검색" };

export default function SearchPage() {
  return (
    <CustomerShell>
      <ClientGate><Suspense fallback={null}><SearchView /></Suspense></ClientGate>
    </CustomerShell>
  );
}
