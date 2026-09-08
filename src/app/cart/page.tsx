import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import CartView from "@/components/customer/CartView";
export const metadata: Metadata = { title: "장바구니" };
export default function CartPage() { return <CustomerShell><ClientGate><CartView /></ClientGate></CustomerShell>; }
