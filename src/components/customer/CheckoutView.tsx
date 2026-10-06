"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CreditCard, MapPin, Info, Lock } from "lucide-react";
import { useLookups } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { deliveryPromise, won } from "@/lib/format";
import AssetImage from "@/components/shared/AssetImage";
import { EmptyState } from "@/components/shared/Bits";
import { useToast } from "@/components/shared/Toast";

export default function CheckoutView() {
  const router = useRouter();
  const { skuById, productById, invBySku, customerById } = useLookups();
  const cartAll = useStore((s) => s.ui.cart);
  const cart = useMemo(() => cartAll.filter((c) => c.selected), [cartAll]);
  const customerId = useStore((s) => s.ui.customerId);
  const placeOrder = useStore((s) => s.placeOrder);
  const toast = useToast();
  const me = customerById.get(customerId)!;
  const [note, setNote] = useState("문 앞에 놓아주세요");
  const [pay, setPay] = useState<"card" | "transfer" | "pay">("card");
  const [agree, setAgree] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [addr, setAddr] = useState(me ? `${me.address.line1} ${me.address.line2 ?? ""}`.trim() : "");
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  // 입력 검증 — 제출을 한 번 시도한 뒤부터 칸 아래에 바로 안내
  const digits = phone.replace(/\D/g, "");
  const errors = {
    name: !name.trim()
      ? "주문자 이름을 입력해 주세요"
      : name.trim().length < 2
        ? "이름을 2자 이상 입력해 주세요"
        : "",
    phone: !digits
      ? "연락처를 입력해 주세요"
      : !/^01[016789]\d{7,8}$/.test(digits)
        ? "휴대폰 번호 형식을 확인해 주세요 (예: 010-1234-5678)"
        : "",
    addr: addr.trim().length < 6 ? "배송지 주소를 정확히 입력해 주세요" : "",
    agree: !agree ? "필수 약관에 동의해 주세요" : "",
  };
  const invalid = Object.values(errors).some(Boolean);
  const fmtPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d.length < 4
      ? d
      : d.length < 8
        ? `${d.slice(0, 3)}-${d.slice(3)}`
        : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`;
  };

  const rows = useMemo(
    () =>
      cart.map((c) => {
        const sku = skuById.get(c.skuId)!;
        const product = productById.get(sku.productId)!;
        const inv = invBySku.get(sku.id);
        const av = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0));
        return { c, sku, product, promise: deliveryPromise(product.deliveryType, av, inv?.inboundEta) };
      }),
    [cart, skuById, productById, invBySku],
  );
  const subtotal = rows.reduce((a, r) => a + r.sku.salePrice * r.c.qty, 0);
  const shipping = subtotal >= 30000 ? 0 : 3000;
  const eta = rows.length
    ? rows.some((r) => r.promise.kind !== "fast")
      ? "일반배송 포함 · 2~3일 내 도착"
      : rows[0].promise.text
    : "";

  if (!rows.length)
    return (
      <div className="mx-auto max-w-[900px] px-4 py-8">
        <h1 className="sr-only">주문·결제</h1>
        <div className="card">
          <EmptyState
            title="주문할 상품이 없습니다"
            body="장바구니에서 상품을 선택해 주세요."
            action={
              <Link href="/cart" className="btn-primary btn-sm">
                장바구니로
              </Link>
            }
          />
        </div>
      </div>
    );

  const submit = () => {
    setTried(true);
    if (invalid) {
      toast({ title: "입력을 확인해 주세요", body: Object.values(errors).filter(Boolean)[0], tone: "warn" });
      setTimeout(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 30);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const order = placeOrder({ addressNote: note });
      setBusy(false);
      if (order) router.push(`/order/complete/${order.id}`);
      else toast({ title: "주문에 실패했습니다", tone: "warn" });
    }, 500);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">주문·결제</h1>
      <div className="mt-2 flex items-start gap-2 rounded-xl bg-orange/10 px-4 py-2.5 text-[15px]">
        <Info size={16} className="mt-0.5 shrink-0 text-orange" />
        <div>
          <b>시연용 주문서</b> · 실제 결제 없이 주문만 생성됩니다.
        </div>
      </div>

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4" ref={formRef}>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <MapPin size={18} className="text-primary" />
              주문자 · 배송지
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["name", "주문자", name, setName, "text", "name", ""],
                  ["phone", "연락처", phone, (v: string) => setPhone(fmtPhone(v)), "tel", "tel", ""],
                  ["addr", "배송지", addr, setAddr, "text", "street-address", "sm:col-span-2"],
                ] as const
              ).map(([k, label, value, set, type, auto, span]) => {
                const err = tried ? errors[k] : "";
                return (
                  <label key={k} className={`text-[15px] ${span}`}>
                    <span className="text-muted">{label}</span>
                    <input
                      className={`input mt-1 ${err ? "!border-danger focus:!ring-danger/30" : ""}`}
                      value={value}
                      onChange={(e) => (set as (v: string) => void)(e.target.value)}
                      type={type}
                      inputMode={type === "tel" ? "tel" : undefined}
                      autoComplete={auto}
                      aria-invalid={!!err}
                      aria-describedby={err ? `err-${k}` : undefined}
                    />
                    {err && (
                      <span id={`err-${k}`} className="mt-1 block text-[14px] text-danger">
                        {err}
                      </span>
                    )}
                  </label>
                );
              })}
              <label className="text-[15px] sm:col-span-2">
                <span className="text-muted">배송 요청사항</span>
                <select className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)}>
                  {[
                    "문 앞에 놓아주세요",
                    "경비실에 맡겨주세요",
                    "배송 전 연락주세요",
                    "부재 시 문자 남겨주세요",
                  ].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-bold">주문 상품 {rows.length}건</h2>
            <ul className="mt-3 divide-y divide-line">
              {rows.map(({ c, sku, product, promise }) => (
                <li key={c.skuId} className="flex items-center gap-3 py-3">
                  <AssetImage
                    assetKey={`product/${product.id}`}
                    category={product.categorySlug}
                    label={product.name}
                    className="h-14 w-14 shrink-0 rounded-lg"
                    ratio=""
                  />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[16px] font-semibold">{product.name}</div>
                    <div className="text-[14px] text-muted">
                      {sku.name} × {c.qty} · {promise.text}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums">{won(sku.salePrice * c.qty)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CreditCard size={18} className="text-primary" />
              결제수단 <span className="badge bg-mist text-muted">미리보기</span>
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["card", "카드"],
                  ["transfer", "계좌이체"],
                  ["pay", "간편결제"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPay(k)}
                  aria-pressed={pay === k}
                  className={`min-h-[52px] rounded-xl border px-2 py-3 text-[15px] font-semibold ${pay === k ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-2 inline-flex items-center gap-1 text-[13px] text-muted">
              <Lock size={13} />
              시연에서는 결제 없이 주문이 생성됩니다.
            </p>
          </section>

          <section className="card p-5">
            <label className="flex cursor-pointer items-start gap-2.5 text-[15px]">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--t-primary)]"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                aria-invalid={tried && !!errors.agree}
              />
              <span>
                (필수) 개인정보 수집·이용 및 구매조건에 동의합니다.{" "}
                <span className="text-muted">시연용 약관이며 실제 개인정보는 저장되지 않습니다.</span>
                {tried && errors.agree && (
                  <span className="mt-1 block text-[14px] text-danger">{errors.agree}</span>
                )}
              </span>
            </label>
          </section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-32">
          <div className="text-lg font-bold">결제 예정금액</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">상품금액</dt>
              <dd className="tabular-nums">{won(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">배송비</dt>
              <dd className="tabular-nums">{shipping === 0 ? "무료" : won(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="font-semibold">최종 결제예정금액</dt>
              <dd className="text-xl font-black tabular-nums">{won(subtotal + shipping)}</dd>
            </div>
          </dl>
          <div className="mt-2 text-xs text-muted">예상 도착: {eta}</div>
          <button
            onClick={submit}
            disabled={busy}
            className="btn-primary btn-lg mt-4 hidden w-full lg:inline-flex"
          >
            {busy ? "주문 처리 중…" : `${won(subtotal + shipping)} 시연 주문하기`}
          </button>
          <Link href="/cart" className="btn-ghost mt-2 w-full">
            장바구니로 돌아가기
          </Link>
        </aside>
      </div>
      {/* 모바일: 결제 버튼을 항상 화면 아래에 */}
      <div className="bg-white/97 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line px-4 pb-3 pt-2.5 shadow-[0_-6px_20px_rgba(16,36,62,0.06)] backdrop-blur lg:hidden">
        <button onClick={submit} disabled={busy} className="btn-primary !min-h-[52px] w-full text-[17px]">
          {busy ? "주문 처리 중…" : `${won(subtotal + shipping)} 시연 주문하기`}
        </button>
      </div>
    </div>
  );
}
