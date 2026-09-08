import type { Metadata } from "next";
import CustomerShell from "@/components/customer/CustomerShell";
import ClientGate from "@/components/shared/ClientGate";
import { MyPageView } from "@/components/customer/OrderViews";
export const metadata: Metadata = { title: "마이페이지" };
export default function MyPage() { return <CustomerShell><ClientGate><MyPageView /></ClientGate></CustomerShell>; }
