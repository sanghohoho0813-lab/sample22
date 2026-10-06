import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NEXMART 종합유통 플랫폼 (시연)",
    short_name: "NEXMART",
    description:
      "검색 → 배송예정 확인 → 주문 → 다시 구매. 고객 화면과 AX 운영화면이 하나의 데이터로 연결된 시연용 샘플.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#10243E",
    lang: "ko",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
