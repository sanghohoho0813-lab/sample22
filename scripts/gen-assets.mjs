// public/assets 아래 실제 존재하는 이미지 키를 모아 src/lib/assets.generated.json 으로 만든다.
// 사진이 없는 슬롯은 네트워크 요청 없이 바로 placeholder를 그린다 (404 폭주 방지).
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = join(process.cwd(), "public", "assets");
const out = join(process.cwd(), "src", "lib", "assets.generated.json");
const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const keys = [];
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    if (!exts.has(ext)) continue;
    const key = relative(root, p).split(sep).join("/").replace(/\.[^.]+$/, "");
    keys.push({ key, ext });
  }
}
walk(root);
mkdirSync(join(process.cwd(), "src", "lib"), { recursive: true });
writeFileSync(out, JSON.stringify(Object.fromEntries(keys.map((k) => [k.key, k.ext])), null, 2) + "\n");
console.log(`[assets] ${keys.length} image(s) indexed → src/lib/assets.generated.json`);
