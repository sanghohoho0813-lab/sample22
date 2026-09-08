import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { TrackView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "주문·배송조회" };
export default function TrackPage() { return <CustomerShell><ClientGate><TrackView /></ClientGate></CustomerShell>; }
