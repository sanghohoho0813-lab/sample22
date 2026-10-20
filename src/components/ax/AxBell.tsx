"use client";
/**
 * 운영 헤더 알림 — "내가 지금 처리할 실행"과 "방금 누가 무엇을 했는지"를 화면 이동 없이 훑는다.
 * 항목을 누르면 실행 센터에서 해당 실행 상세가 바로 열린다.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useData, useHydrated, useMinute } from "@/lib/hooks";
import { ACTION_STAGE_LABEL, ROLE_LABEL, useStore } from "@/lib/store";
import { relTime } from "@/lib/format";
import type { Urgency } from "@/lib/types";
import { SeverityTag } from "./OpsUi";

const URG_RANK: Record<Urgency, number> = { critical: 4, high: 3, mid: 2, low: 1 };

export default function AxBell() {
  const data = useData();
  const hydrated = useHydrated();
  const now = useMinute();
  const role = useStore((s) => s.ui.role);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const mine = useMemo(
    () =>
      data.actions
        .filter(
          (a) => ["recommended", "reviewing"].includes(a.stage) && (role === "owner" || a.owner === role),
        )
        .sort(
          (a, b) =>
            URG_RANK[b.urgency] - URG_RANK[a.urgency] || (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0),
        ),
    [data.actions, role],
  );
  const feed = useMemo(
    () =>
      data.actions
        .flatMap((a) => (a.activity ?? []).map((e) => ({ e, a })))
        .sort((x, y) => (x.e.at < y.e.at ? 1 : -1))
        .slice(0, 6),
    [data.actions],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const n = hydrated ? mine.length : 0;
  return (
    <div ref={wrap} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-mist ${open ? "bg-mist" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={20} aria-hidden="true" />
        <span className="sr-only">알림{n ? ` · 처리 대기 ${n}건` : ""}</span>
        {n > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-strong px-1 text-[11px] font-bold tabular-nums text-white"
          >
            {n > 99 ? "99+" : n}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="알림"
          className="card-raised fade-up absolute right-0 top-[calc(100%+6px)] z-50 w-[400px] overflow-hidden"
        >
          <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
            <h2 className="text-[16px] font-bold">알림</h2>
            <span className="text-[13px] text-muted">{ROLE_LABEL[role]} 기준</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <section aria-labelledby="axb-mine">
              <h3 id="axb-mine" className="px-4 pb-1 pt-3 text-[13px] font-bold text-muted">
                내 처리 대기 <span className="tabular-nums text-ink">{mine.length}</span>
              </h3>
              {mine.length ? (
                <ul>
                  {mine.slice(0, 5).map((a) => {
                    const late = new Date(a.dueAt) < now;
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/ax/actions?id=${a.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-mist"
                        >
                          <SeverityTag s={a.urgency} />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-1 text-[14px] font-semibold">{a.title}</span>
                            <span className="text-[12px] text-muted">
                              {ACTION_STAGE_LABEL[a.stage]} ·{" "}
                              {late ? (
                                <b className="text-danger">기한 지남</b>
                              ) : (
                                `기한 ${relTime(a.dueAt, now)}`
                              )}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 pb-3 text-[14px] text-muted">지금 처리할 실행이 없습니다.</p>
              )}
            </section>
            <section aria-labelledby="axb-feed" className="border-t border-line">
              <h3 id="axb-feed" className="px-4 pb-1 pt-3 text-[13px] font-bold text-muted">
                최근 활동
              </h3>
              {feed.length ? (
                <ol className="pb-2">
                  {feed.map(({ e, a }, i) => (
                    <li key={`${a.id}-${e.at}-${i}`}>
                      <Link
                        href={`/ax/actions?id=${a.id}`}
                        onClick={() => setOpen(false)}
                        className="flex gap-2.5 px-4 py-2 hover:bg-mist"
                      >
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 text-[13px] leading-snug">
                          <span className="font-semibold">{e.actor}</span> ·{" "}
                          {e.to ? `${ACTION_STAGE_LABEL[e.to]}` : e.note}
                          <span className="block truncate text-muted">{a.title}</span>
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">{relTime(e.at, now)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-4 pb-3 text-[14px] text-muted">아직 기록된 활동이 없습니다.</p>
              )}
            </section>
          </div>
          <Link
            href="/ax/actions"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-line py-3 text-[14px] font-semibold text-primary hover:bg-mist"
          >
            실행 센터 전체 보기 <ChevronRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
