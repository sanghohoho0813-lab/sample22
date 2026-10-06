import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // 날짜 로직(출고마감 15:00, 일자 키)은 KST 기준으로 검증한다
    env: { TZ: "Asia/Seoul" },
    coverage: { provider: "v8", include: ["src/lib/**/*.ts"], exclude: ["src/lib/types.ts"] },
  },
});
