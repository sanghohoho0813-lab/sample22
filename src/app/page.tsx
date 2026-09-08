import CustomerShell from "@/components/customer/CustomerShell";
import HomeView from "@/components/customer/HomeView";
import ClientGate from "@/components/shared/ClientGate";

export default function HomePage() {
  return (
    <CustomerShell>
      <ClientGate><HomeView /></ClientGate>
    </CustomerShell>
  );
}
