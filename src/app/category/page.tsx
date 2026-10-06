import type { Metadata } from "next";
import Link from "next/link";
import CustomerShell from "@/components/customer/CustomerShell";
import { CATEGORIES } from "@/lib/seed";

export const metadata: Metadata = { title: "카테고리" };
const CAT_ICON: Record<string, string> = {
  food: "🍚",
  living: "🧻",
  kitchen: "🧽",
  home: "🛋️",
  digital: "🔌",
  pet: "🐾",
  baby: "🍼",
  health: "💊",
};

export default function CategoryIndex() {
  return (
    <CustomerShell>
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">카테고리</h1>
        <p className="mt-1 text-muted">생활 필수품 8개 카테고리</p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="card lift flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft text-2xl sm:h-14 sm:w-14 sm:text-3xl"
                aria-hidden
              >
                {CAT_ICON[c.slug]}
              </span>
              <div className="min-w-0">
                <div className="text-lg font-bold">{c.name}</div>
                <div className="line-clamp-2 text-[14px] leading-snug text-muted">{c.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </CustomerShell>
  );
}
