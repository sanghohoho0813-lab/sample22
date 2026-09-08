import type { Metadata } from "next";
import Link from "next/link";
import CustomerShell from "@/components/customer/CustomerShell";
import { CATEGORIES } from "@/lib/seed";

export const metadata: Metadata = { title: "카테고리" };
const CAT_ICON: Record<string, string> = { food: "🍚", living: "🧻", kitchen: "🧽", home: "🛋️", digital: "🔌", pet: "🐾", baby: "🍼", health: "💊" };

export default function CategoryIndex() {
  return (
    <CustomerShell>
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">카테고리</h1>
        <p className="text-muted mt-1">생활 필수품 8개 카테고리</p>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="card p-5 hover:shadow-raised transition-shadow flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-soft flex items-center justify-center text-3xl" aria-hidden>{CAT_ICON[c.slug]}</span>
              <div><div className="font-bold text-lg">{c.name}</div><div className="text-sm text-muted">{c.description}</div></div>
            </Link>
          ))}
        </div>
      </div>
    </CustomerShell>
  );
}
