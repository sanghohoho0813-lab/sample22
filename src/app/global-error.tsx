"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const hardReset = () => { try { localStorage.removeItem("nexmart-demo-v1"); } catch { /* ignore */ } window.location.href = "/"; };
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F3F6F8", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 520, width: "100%", boxShadow: "0 12px 32px rgba(16,36,62,0.10)" }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>앱을 다시 시작해야 합니다</h1>
            <p style={{ color: "#66727F", marginTop: 8, lineHeight: 1.6 }}>예상치 못한 오류가 발생했습니다. 다시 시도하거나, 시연 데이터를 초기화하고 처음부터 시작할 수 있습니다.</p>
            {error?.message && <pre style={{ background: "#F3F6F8", borderRadius: 12, padding: 12, fontSize: 12, color: "#66727F", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error.message}</pre>}
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={reset} style={{ background: "#087A83", color: "#fff", border: 0, borderRadius: 12, padding: "12px 18px", fontWeight: 700, fontSize: 16 }}>다시 시도</button>
              <button onClick={hardReset} style={{ background: "#fff", color: "#15202B", border: "1px solid #DDE3E8", borderRadius: 12, padding: "12px 18px", fontWeight: 700, fontSize: 16 }}>데이터 초기화 후 홈으로</button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
