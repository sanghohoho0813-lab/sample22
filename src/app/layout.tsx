import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/shared/Providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: { default: "NEXMART — 생활에 필요한 모든 것, 한 번에", template: "%s | NEXMART" },
  description:
    "식품·생활·주방·리빙·디지털·반려·유아·건강 상품을 한곳에서 검색하고, 배송예정일을 확인한 뒤 바로 주문하세요. NEXMART 종합유통 플랫폼 (시연).",
  openGraph: {
    title: "NEXMART 종합유통 플랫폼",
    description: "검색 → 배송예정 확인 → 주문 → 다시 구매. 생활 필수품을 빠르게.",
    type: "website",
    locale: "ko_KR",
    siteName: "NEXMART",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10243E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="deep-teal" data-font="normal" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {/* 미래AI랩 데모 공용 뒤로·앞으로 버튼 */}
        <Script src="/mirae-history-nav.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
