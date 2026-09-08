"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  const [addr, setAddr] = useState(me ? `${me.address.line1} ${me.address.line2 ?? ""}` : "");

  const rows = useMemo(() => cart.map((c) => { const sku = skuById.get(c.skuId)!; const product = productById.get(sku.productId)!; const inv = invBySku.get(sku.id); const av = Math.max(0, (inv?.onHand ?? 0) - (inv?.reserved ?? 0)); return { c, sku, product, promise: deliveryPromise(product.deliveryType, av, inv?.inboundEta) }; }), [cart, skuById, productById, invBySku]);
  const subtotal = rows.reduce((a, r) => a + r.sku.salePrice * r.c.qty, 0);
  const shipping = subtotal >= 30000 ? 0 : 3000;
  const eta = rows.length ? (rows.some((r) => r.promise.kind !== "fast") ? "일반배송 포함 · 2~3일 내 도착" : rows[0].promise.text) : "";

  if (!rows.length) return <div className="mx-auto max-w-[900px] px-4 py-8"><div className="card"><EmptyState title="주문할 상품이 없습니다" body="장바구니에서 상품을 선택해 주세요." action={<Link href="/cart" className="btn-primary btn-sm">장바구니로</Link>} /></div></div>;

  const submit = () => {
    if (!agree || !name || !phone || !addr) { toast({ title: "입력을 확인해 주세요", body: "주문자·연락처·배송지와 약관 동의가 필요합니다.", tone: "warn" }); return; }
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
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">주문·결제</h1>
      <div className="mt-2 rounded-xl border border-orange/40 bg-orange/5 px-4 py-3 text-sm flex items-start gap-2"><Info size={16} className="text-orange mt-0.5 shrink-0" /><div><b>DEMO CHECKOUT</b> — 실제 결제는 연결되지 않으며, 주문·재고·배송 Data Loop를 보여주는 시연입니다.</div></div>

      <div className="mt-5 grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-4">
          <section className="card p-5">
            <h2 className="font-bold text-lg flex items-center gap-2"><MapPin size={18} className="text-primary" />주문자 · 배송지</h2>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <label className="text-sm"><span className="text-muted">주문자</span><input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="text-sm"><span className="text-muted">연락처</span><input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></label>
              <label className="text-sm sm:col-span-2"><span className="text-muted">배송지</span><input className="input mt-1" value={addr} onChange={(e) => setAddr(e.target.value)} /></label>
              <label className="text-sm sm:col-span-2"><span className="text-muted">배송 요청사항</span>
                <select className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)}>
                  {["문 앞에 놓아주세요", "경비실에 맡겨주세요", "배송 전 연락주세요", "부재 시 문자 남겨주세요"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-lg">주문 상품 {rows.length}건</h2>
            <ul className="mt-3 divide-y divide-line">
              {rows.map(({ c, sku, product, promise }) => (
                <li key={c.skuId} className="py-3 flex gap-3 items-center">
                  <AssetImage assetKey={`product/${product.id}`} category={product.categorySlug} label={product.name} className="w-14 h-14 rounded-lg shrink-0" ratio="" />
                  <div className="min-w-0 flex-1"><div className="font-semibold text-sm line-clamp-1">{product.name}</div><div className="text-xs text-muted">{sku.name} × {c.qty} · {promise.text}</div></div>
                  <div className="font-bold tabular-nums text-sm">{won(sku.salePrice * c.qty)}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-lg flex items-center gap-2"><CreditCard size={18} className="text-primary" />결제수단 <span className="badge bg-mist text-muted">Preview</span></h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([["card", "신용·체크카드"], ["transfer", "계좌이체"], ["pay", "간편결제"]] as const).map(([k, l]) => <button key={k} onClick={() => setPay(k)} aria-pressed={pay === k} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${pay === k ? "border-primary bg-soft" : "border-line hover:bg-mist"}`}>{l}</button>)}
            </div>
            <p className="text-xs text-muted mt-2 inline-flex items-center gap-1"><Lock size={12} />실제 PG 연동은 READY 단계입니다. 시연에서는 결제 없이 주문이 생성됩니다.</p>
          </section>

          <section className="card p-5">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-[var(--t-primary)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>(필수) 개인정보 수집·이용 및 구매조건에 동의합니다. <span className="text-muted">시연용 약관이며 실제 개인정보는 저장되지 않습니다.</span></span></label>
          </section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-32">
          <div className="font-bold text-lg">결제 예정금액</div>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">상품금액</dt><dd className="tabular-nums">{won(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">할인</dt><dd className="tabular-nums">-0원</dd></div>
            <div className="flex justify-between"><dt className="text-muted">배송비</dt><dd className="tabular-nums">{shipping === 0 ? "무료" : won(shipping)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-semibold">최종 결제예정금액</dt><dd className="font-black text-xl tabular-nums">{won(subtotal + shipping)}</dd></div>
          </dl>
          <div className="mt-2 text-xs text-muted">예상 도착: {eta}</div>
          <button onClick={submit} disabled={busy} className="btn-primary btn-lg w-full mt-4">{busy ? "주문 처리 중…" : `${won(subtotal + shipping)} DEMO 주문하기`}</button>
          <Link href="/cart" className="btn-ghost w-full mt-2">장바구니로 돌아가기</Link>
        </aside>
      </div>
    </div>
  );
}
