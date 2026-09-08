import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import CheckoutView from "@/components/customer/CheckoutView";
export const metadata: Metadata = { title: "주문·결제" };
export default function CheckoutPage() { return <CustomerShell plain hideBottomNav><ClientGate><CheckoutView /></ClientGate></CustomerShell>; }
