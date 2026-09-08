"use client";
import { useNow } from "@/lib/hooks";
import { DOW } from "@/lib/format";

export default function Clock({ className = "", withSeconds = false }: { className?: string; withSeconds?: boolean }) {
  const now = useNow(1000);
  if (!now) return <span className={`skeleton inline-block h-4 w-40 ${className}`} />;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <time dateTime={now.toISOString()} className={`tabular-nums ${className}`} suppressHydrationWarning>
      {now.getFullYear()}.{p(now.getMonth() + 1)}.{p(now.getDate())} ({DOW[now.getDay()]}) {p(now.getHours())}:{p(now.getMinutes())}{withSeconds ? `:${p(now.getSeconds())}` : ""}
    </time>
  );
}
