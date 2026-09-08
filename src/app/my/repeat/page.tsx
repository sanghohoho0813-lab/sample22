import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { RepeatBasketView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "다시 구매 · Repeat Basket" };
export default function RepeatPage() { return <CustomerShell><ClientGate><RepeatBasketView /></ClientGate></CustomerShell>; }
