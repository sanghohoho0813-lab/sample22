import type {
  AXAction,
  Brand,
  Category,
  CategorySales,
  CategorySlug,
  Customer,
  DailySalesPoint,
  DemandSignal,
  DemoData,
  EvidenceLog,
  Inventory,
  Order,
  OrderItem,
  OrderStage,
  Product,
  Promotion,
  PurchaseOrder,
  ReturnRequest,
  SKU,
  Supplier,
  SupplierProduct,
  Warehouse,
} from "./types";

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260908);
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const rf = (min: number, max: number) => rnd() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

const iso = (d: Date) => d.toISOString();
const dayStr = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const addHours = (d: Date, n: number) => new Date(d.getTime() + n * 3600000);

// ---------- static catalogs ----------
export const CATEGORIES: Category[] = [
  { slug: "food", name: "식품", description: "생수·간편식·간식·커피", hue: 24 },
  { slug: "living", name: "생활", description: "세제·물티슈·화장지·위생", hue: 190 },
  { slug: "kitchen", name: "주방", description: "주방세제·조리도구·보관", hue: 150 },
  { slug: "home", name: "리빙", description: "수납·침구·욕실·청소", hue: 210 },
  { slug: "digital", name: "디지털", description: "소형가전·케이블·조명", hue: 250 },
  { slug: "pet", name: "반려", description: "배변패드·사료·간식", hue: 35 },
  { slug: "baby", name: "유아", description: "기저귀·물티슈·이유식", hue: 330 },
  { slug: "health", name: "건강", description: "비타민·마스크·위생", hue: 120 },
];

const BRANDS: Brand[] = [
  { id: "b-01", name: "데일리홈", origin: "국내" },
  { id: "b-02", name: "클린랩", origin: "국내" },
  { id: "b-03", name: "퓨어라이프", origin: "국내" },
  { id: "b-04", name: "그린키친", origin: "국내" },
  { id: "b-05", name: "루미테크", origin: "국내" },
  { id: "b-06", name: "펫프렌즈", origin: "국내" },
  { id: "b-07", name: "베이비소프트", origin: "국내" },
  { id: "b-08", name: "헬시데이", origin: "국내" },
  { id: "b-09", name: "모던리빙", origin: "국내" },
  { id: "b-10", name: "오션워터", origin: "국내" },
  { id: "b-11", name: "노르딕홈", origin: "수입" },
  { id: "b-12", name: "카페모먼트", origin: "국내" },
];

type ProductSeed = {
  name: string;
  cat: CategorySlug;
  brand: string;
  price: number; // 단품 판매가
  cost: number; // 단품 원가
  repeat?: number; // avg cycle days
  delivery?: "fast" | "standard" | "reserve";
  tags?: string[];
  bundles?: number[]; // bundle sizes
  options?: string[];
  velocity: number; // avg daily units (all SKUs)
  desc: string;
};

const PRODUCT_SEEDS: ProductSeed[] = [
  // living
  { name: "프리미엄 물티슈 100매", cat: "living", brand: "b-02", price: 1900, cost: 1150, repeat: 21, bundles: [1, 10, 20], velocity: 38, delivery: "fast", tags: ["베스트", "반복구매"], desc: "두툼한 원단과 순한 성분의 데일리 물티슈. 20팩 묶음이 가장 인기." },
  { name: "액상 세탁세제 3L", cat: "living", brand: "b-02", price: 12900, cost: 8200, repeat: 35, bundles: [1, 2], velocity: 14, delivery: "fast", tags: ["반복구매"], desc: "찬물에도 잘 녹는 고농축 액상 세제." },
  { name: "섬유유연제 2.5L", cat: "living", brand: "b-02", price: 8900, cost: 5600, repeat: 40, bundles: [1, 2], velocity: 9, desc: "은은한 코튼향 섬유유연제." },
  { name: "3겹 롤화장지 30롤", cat: "living", brand: "b-01", price: 15900, cost: 10500, repeat: 30, bundles: [1, 2], velocity: 17, delivery: "fast", tags: ["베스트"], desc: "부드러운 3겹 화장지 30롤." },
  { name: "키친타월 150매 6롤", cat: "living", brand: "b-01", price: 7900, cost: 5100, repeat: 28, bundles: [1, 2, 4], velocity: 11, desc: "흡수력 좋은 키친타월." },
  { name: "종량제 쓰레기봉투 20L 100매", cat: "living", brand: "b-01", price: 9900, cost: 6900, repeat: 45, bundles: [1], velocity: 6, desc: "지역 공용 규격 봉투." },
  { name: "손소독 티슈 60매", cat: "living", brand: "b-03", price: 3900, cost: 2300, repeat: 30, bundles: [1, 5], velocity: 7, desc: "외출용 휴대 소독티슈." },
  { name: "빨래 건조대 스탠드형", cat: "living", brand: "b-09", price: 34900, cost: 21000, velocity: 1.5, desc: "접이식 대형 건조대." },
  { name: "화장실 청소용 세정제 1L", cat: "living", brand: "b-02", price: 5900, cost: 3600, repeat: 50, bundles: [1, 2], velocity: 5, desc: "물때·찌든때 제거 세정제." },
  { name: "일회용 위생장갑 200매", cat: "living", brand: "b-03", price: 4500, cost: 2700, repeat: 40, bundles: [1, 3], velocity: 6, desc: "조리·청소 겸용 위생장갑." },
  // kitchen
  { name: "주방세제 리필 2L", cat: "kitchen", brand: "b-04", price: 6900, cost: 4300, repeat: 32, bundles: [1, 2, 4], velocity: 16, delivery: "fast", tags: ["반복구매"], desc: "기름때에 강한 저자극 주방세제 리필." },
  { name: "스테인리스 3중 냄비 세트", cat: "kitchen", brand: "b-04", price: 59000, cost: 36000, velocity: 0.9, desc: "18·20·24cm 3종 세트." },
  { name: "실리콘 밀폐용기 6종", cat: "kitchen", brand: "b-04", price: 24900, cost: 15200, velocity: 2.4, desc: "전자레인지 사용 가능 밀폐용기." },
  { name: "수세미 10입", cat: "kitchen", brand: "b-04", price: 4900, cost: 2800, repeat: 45, bundles: [1, 3], velocity: 8, desc: "항균 양면 수세미." },
  { name: "위생 지퍼백 대형 50매", cat: "kitchen", brand: "b-01", price: 5900, cost: 3500, repeat: 40, bundles: [1, 2], velocity: 7, desc: "냉동보관용 두꺼운 지퍼백." },
  { name: "친환경 종이호일 30m", cat: "kitchen", brand: "b-04", price: 3900, cost: 2300, repeat: 60, bundles: [1, 3], velocity: 4, desc: "에어프라이어 겸용 종이호일." },
  { name: "세라믹 프라이팬 28cm", cat: "kitchen", brand: "b-11", price: 32900, cost: 20500, velocity: 1.6, desc: "코팅이 오래가는 세라믹 팬." },
  { name: "전기 커피포트 1.7L", cat: "kitchen", brand: "b-05", price: 27900, cost: 17800, velocity: 1.8, desc: "온도조절 전기포트." },
  { name: "도마 항균 2종 세트", cat: "kitchen", brand: "b-04", price: 14900, cost: 8900, velocity: 1.7, desc: "육류·채소 분리 도마." },
  // food
  { name: "생수 2L 12병", cat: "food", brand: "b-10", price: 9900, cost: 7100, repeat: 14, bundles: [1, 2], velocity: 42, delivery: "fast", tags: ["베스트", "반복구매"], desc: "깨끗한 암반수 생수 2L 12병 묶음." },
  { name: "생수 500ml 20병", cat: "food", brand: "b-10", price: 7900, cost: 5600, repeat: 21, bundles: [1, 2], velocity: 20, delivery: "fast", desc: "휴대용 소용량 생수." },
  { name: "즉석 흰밥 210g 12개", cat: "food", brand: "b-12", price: 12900, cost: 9100, repeat: 25, bundles: [1, 2], velocity: 15, desc: "갓 지은 밥맛 즉석밥." },
  { name: "드립 커피 40개입", cat: "food", brand: "b-12", price: 15900, cost: 9800, repeat: 30, bundles: [1, 2], velocity: 10, desc: "산미 균형 잡힌 블렌드 드립백." },
  { name: "컵라면 12개입", cat: "food", brand: "b-12", price: 10900, cost: 7900, repeat: 30, bundles: [1, 2], velocity: 12, desc: "인기 매운맛 컵라면 박스." },
  { name: "그릭요거트 100g 6개", cat: "food", brand: "b-08", price: 8900, cost: 6200, repeat: 10, delivery: "fast", velocity: 9, desc: "무가당 고단백 요거트." },
  { name: "견과류 하루견과 30봉", cat: "food", brand: "b-08", price: 18900, cost: 12500, repeat: 30, bundles: [1, 2], velocity: 8, desc: "매일 한 봉 견과 믹스." },
  { name: "냉동 만두 1kg", cat: "food", brand: "b-12", price: 11900, cost: 8200, repeat: 20, delivery: "fast", velocity: 7, desc: "육즙 가득 고기만두." },
  { name: "올리브유 1L", cat: "food", brand: "b-11", price: 19900, cost: 13500, repeat: 60, velocity: 4, desc: "엑스트라버진 올리브유." },
  { name: "탄산수 500ml 20병", cat: "food", brand: "b-10", price: 11900, cost: 8300, repeat: 18, bundles: [1, 2], velocity: 13, desc: "강탄산 플레인 탄산수." },
  // home
  { name: "극세사 이불 겨울용 Q", cat: "home", brand: "b-09", price: 49900, cost: 31000, velocity: 1.2, delivery: "standard", desc: "포근한 극세사 겨울 이불." },
  { name: "리빙박스 50L 3개", cat: "home", brand: "b-09", price: 29900, cost: 18500, velocity: 2.1, desc: "투명 대형 수납박스." },
  { name: "욕실 미끄럼방지 매트", cat: "home", brand: "b-09", price: 12900, cost: 7400, velocity: 2.6, desc: "물빠짐 좋은 욕실매트." },
  { name: "무선 물걸레 청소포 40매", cat: "home", brand: "b-02", price: 8900, cost: 5300, repeat: 30, bundles: [1, 3], velocity: 6, desc: "일회용 물걸레 청소포." },
  { name: "옷걸이 논슬립 30개", cat: "home", brand: "b-09", price: 9900, cost: 5800, velocity: 3, desc: "옷이 흘러내리지 않는 벨벳 옷걸이." },
  { name: "암막커튼 2장 세트", cat: "home", brand: "b-11", price: 39900, cost: 24500, velocity: 1.1, desc: "빛 차단 99% 암막커튼." },
  { name: "디퓨저 200ml 화이트머스크", cat: "home", brand: "b-09", price: 14900, cost: 8100, repeat: 60, velocity: 3.2, desc: "은은한 실내 방향제." },
  { name: "방수 매트리스 커버 Q", cat: "home", brand: "b-09", price: 22900, cost: 13800, velocity: 1.4, desc: "세탁 가능한 방수 커버." },
  // digital
  { name: "무선 미니가습기", cat: "digital", brand: "b-05", price: 24900, cost: 15200, velocity: 0.6, tags: ["저회전"], desc: "책상 위 USB 무선 가습기." },
  { name: "USB-C 고속충전 케이블 2m", cat: "digital", brand: "b-05", price: 8900, cost: 4200, velocity: 6, bundles: [1, 2], desc: "60W 고속충전 케이블." },
  { name: "LED 스탠드 조명", cat: "digital", brand: "b-05", price: 32900, cost: 19800, velocity: 1.4, desc: "3단 밝기 조절 스탠드." },
  { name: "무선 핸디 청소기", cat: "digital", brand: "b-05", price: 69000, cost: 42000, velocity: 0.9, desc: "차량·소파용 무선 청소기." },
  { name: "전기 방석 온열매트", cat: "digital", brand: "b-05", price: 29900, cost: 18500, velocity: 0.8, desc: "사무실용 온열방석." },
  { name: "멀티탭 6구 3m", cat: "digital", brand: "b-05", price: 13900, cost: 8400, velocity: 3.4, desc: "개별스위치 멀티탭." },
  { name: "블루투스 스피커 미니", cat: "digital", brand: "b-05", price: 25900, cost: 15900, velocity: 1.3, desc: "방수 휴대용 스피커." },
  { name: "AA 건전지 20입", cat: "digital", brand: "b-05", price: 8900, cost: 5400, repeat: 90, velocity: 4, desc: "고성능 알카라인 건전지." },
  // pet
  { name: "반려동물 배변패드 50매", cat: "pet", brand: "b-06", price: 12900, cost: 8100, repeat: 18, bundles: [1, 2, 4], velocity: 21, delivery: "fast", tags: ["반복구매"], desc: "흡수력 강한 두꺼운 배변패드." },
  { name: "강아지 사료 소형견 3kg", cat: "pet", brand: "b-06", price: 25900, cost: 16800, repeat: 30, velocity: 6, desc: "연어 베이스 소형견 사료." },
  { name: "고양이 모래 벤토나이트 10kg", cat: "pet", brand: "b-06", price: 15900, cost: 10200, repeat: 25, bundles: [1, 2], velocity: 8, desc: "먼지 적은 응고형 모래." },
  { name: "고양이 습식캔 12개", cat: "pet", brand: "b-06", price: 14900, cost: 9600, repeat: 20, velocity: 7, desc: "참치·닭가슴살 습식캔." },
  { name: "반려동물 간식 저키 300g", cat: "pet", brand: "b-06", price: 9900, cost: 5800, repeat: 25, velocity: 6, desc: "국내산 닭가슴살 저키." },
  { name: "펫 배변봉투 300매", cat: "pet", brand: "b-06", price: 6900, cost: 3900, repeat: 45, velocity: 5, desc: "산책용 배변봉투." },
  { name: "반려동물 급수기 자동", cat: "pet", brand: "b-06", price: 32900, cost: 20500, velocity: 0.9, desc: "순환 필터 급수기." },
  // baby
  { name: "아기 물티슈 프리미엄 70매", cat: "baby", brand: "b-07", price: 2900, cost: 1800, repeat: 20, bundles: [1, 10, 20], velocity: 25, delivery: "fast", desc: "무향·무형광 아기 물티슈." },
  { name: "기저귀 밴드형 M 4팩", cat: "baby", brand: "b-07", price: 42900, cost: 30500, repeat: 21, velocity: 9, delivery: "fast", desc: "통기성 좋은 밴드형 기저귀." },
  { name: "분유 3단계 800g", cat: "baby", brand: "b-07", price: 29900, cost: 21800, repeat: 15, velocity: 7, desc: "성장기 맞춤 분유." },
  { name: "아기 세탁세제 1.8L", cat: "baby", brand: "b-07", price: 13900, cost: 8600, repeat: 40, velocity: 5, desc: "저자극 아기 전용 세제." },
  { name: "이유식 큐브 12종", cat: "baby", brand: "b-07", price: 24900, cost: 16500, repeat: 14, delivery: "fast", velocity: 4, desc: "냉동 이유식 큐브 세트." },
  { name: "아기 욕조 접이식", cat: "baby", brand: "b-07", price: 34900, cost: 21000, velocity: 0.8, desc: "공간 절약형 접이식 욕조." },
  // health
  { name: "종합비타민 90정", cat: "health", brand: "b-08", price: 21900, cost: 12500, repeat: 90, velocity: 5, desc: "하루 한 알 종합비타민." },
  { name: "KF94 마스크 50매", cat: "health", brand: "b-03", price: 14900, cost: 8200, repeat: 45, bundles: [1, 2], velocity: 9, delivery: "fast", desc: "국내 생산 KF94 마스크." },
  { name: "오메가3 60캡슐", cat: "health", brand: "b-08", price: 18900, cost: 10900, repeat: 60, velocity: 4, desc: "rTG 오메가3." },
  { name: "손소독제 500ml", cat: "health", brand: "b-03", price: 6900, cost: 3900, repeat: 60, bundles: [1, 2], velocity: 4, desc: "펌프형 손소독제." },
  { name: "유산균 30포", cat: "health", brand: "b-08", price: 24900, cost: 14500, repeat: 30, velocity: 6, desc: "19종 혼합 유산균." },
  { name: "체온계 비접촉식", cat: "health", brand: "b-05", price: 29900, cost: 18200, velocity: 0.7, desc: "1초 측정 비접촉 체온계." },
  { name: "구강청결제 1L", cat: "health", brand: "b-03", price: 8900, cost: 5200, repeat: 45, bundles: [1, 2], velocity: 5, desc: "저자극 무알코올 구강청결제." },
  { name: "온열 안대 10매", cat: "health", brand: "b-08", price: 9900, cost: 5600, repeat: 30, velocity: 3, desc: "일회용 온열 안대." },
];

const SUPPLIER_SEEDS: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "source">[] = [
  { name: "한빛생활유통", contact: "박정우", contractStatus: "active", categories: ["living", "kitchen", "baby"], leadTimeDays: 5, onTimeRate: 0.93, fillRate: 0.97, defectRate: 0.006, riskLevel: "low" },
  { name: "동아위생산업", contact: "이수민", contractStatus: "active", categories: ["living", "health", "baby"], leadTimeDays: 3, onTimeRate: 0.96, fillRate: 0.95, defectRate: 0.008, riskLevel: "low", note: "긴급 대응 가능, 단가 3~5% 높음" },
  { name: "케이푸드물류", contact: "최다은", contractStatus: "active", categories: ["food"], leadTimeDays: 2, onTimeRate: 0.91, fillRate: 0.98, defectRate: 0.004, riskLevel: "low" },
  { name: "청정수원", contact: "김민재", contractStatus: "active", categories: ["food"], leadTimeDays: 4, onTimeRate: 0.88, fillRate: 0.96, defectRate: 0.003, riskLevel: "mid" },
  { name: "그린키친코리아", contact: "정하늘", contractStatus: "active", categories: ["kitchen"], leadTimeDays: 7, onTimeRate: 0.78, fillRate: 0.9, defectRate: 0.012, riskLevel: "high", note: "최근 2회 납기지연" },
  { name: "리빙앤홈", contact: "오세훈", contractStatus: "active", categories: ["home", "kitchen"], leadTimeDays: 6, onTimeRate: 0.9, fillRate: 0.94, defectRate: 0.01, riskLevel: "mid" },
  { name: "루미전자유통", contact: "한지원", contractStatus: "active", categories: ["digital", "health"], leadTimeDays: 8, onTimeRate: 0.85, fillRate: 0.92, defectRate: 0.018, riskLevel: "mid" },
  { name: "펫케어서플라이", contact: "윤서준", contractStatus: "active", categories: ["pet"], leadTimeDays: 4, onTimeRate: 0.94, fillRate: 0.97, defectRate: 0.005, riskLevel: "low" },
  { name: "베이비퍼스트", contact: "장예린", contractStatus: "active", categories: ["baby"], leadTimeDays: 5, onTimeRate: 0.92, fillRate: 0.96, defectRate: 0.007, riskLevel: "low" },
  { name: "헬스앤라이프", contact: "송지호", contractStatus: "review", categories: ["health"], leadTimeDays: 6, onTimeRate: 0.87, fillRate: 0.93, defectRate: 0.009, riskLevel: "mid", note: "계약 갱신 검토 중" },
  { name: "노르딕임포트", contact: "배수아", contractStatus: "active", categories: ["home", "kitchen", "food"], leadTimeDays: 12, onTimeRate: 0.82, fillRate: 0.9, defectRate: 0.011, riskLevel: "mid", note: "수입 리드타임 김" },
];

const WAREHOUSES: Warehouse[] = [
  { id: "wh-A", name: "A구역 (생활·위생)", congestion: 0.35 },
  { id: "wh-B", name: "B구역 (식품·냉장)", congestion: 0.42 },
  { id: "wh-C", name: "C구역 (주방·리빙)", congestion: 0.82 },
  { id: "wh-D", name: "D구역 (반려·유아)", congestion: 0.3 },
  { id: "wh-E", name: "E구역 (디지털·건강)", congestion: 0.25 },
];

const CAT_WH: Record<CategorySlug, string> = {
  living: "wh-A", health: "wh-E", food: "wh-B", kitchen: "wh-C", home: "wh-C", digital: "wh-E", pet: "wh-D", baby: "wh-D",
};

const CUSTOMER_NAMES = [
  "김서연", "이준호", "박지민", "최유진", "정민수", "강하은", "조현우", "윤지아", "임도윤", "한소율",
  "오태양", "신수빈", "권민재", "황예은", "송하람", "안지호", "문채원", "배시우", "홍다인", "류건우",
  "노아인", "전서윤", "백지훈", "서예준",
];

const DISTRICTS = ["서울 마포구", "서울 송파구", "경기 성남시 분당구", "경기 고양시 일산동구", "인천 연수구", "서울 강서구", "경기 용인시 수지구", "서울 노원구", "부산 해운대구", "대전 유성구"];

// ---------- generator ----------
export function generateDemoData(now = new Date()): DemoData {
  const nowIso = iso(now);
  const base = { createdAt: nowIso, updatedAt: nowIso, source: "demo" as const };

  const suppliers: Supplier[] = SUPPLIER_SEEDS.map((s, i) => ({ ...base, id: `sup-${String(i + 1).padStart(2, "0")}`, ...s }));
  const supByCat = (cat: CategorySlug) => suppliers.filter((s) => s.categories.includes(cat));

  const products: Product[] = [];
  const skus: SKU[] = [];
  const supplierProducts: SupplierProduct[] = [];
  const inventory: Inventory[] = [];
  const demand: DemandSignal[] = [];
  const velocityBySku = new Map<string, number>();

  PRODUCT_SEEDS.forEach((p, idx) => {
    const pid = `p-${String(idx + 1).padStart(3, "0")}`;
    const catSup = supByCat(p.cat);
    const primary = catSup[idx % catSup.length];
    products.push({
      ...base,
      id: pid,
      name: p.name,
      categorySlug: p.cat,
      brandId: p.brand,
      description: p.desc,
      tags: p.tags ?? [],
      rating: Math.round(rf(4.2, 4.9) * 10) / 10,
      reviewCount: ri(40, 2400),
      deliveryType: p.delivery ?? (p.velocity > 5 ? "fast" : "standard"),
      isRepeatable: !!p.repeat,
      avgRepeatCycleDays: p.repeat,
      status: "active",
    });

    const bundles = p.bundles ?? [1];
    const options = p.options ?? [undefined];
    let skuIdx = 0;
    for (const b of bundles) {
      for (const opt of options) {
        skuIdx += 1;
        const sid = `${pid}-s${skuIdx}`;
        const bundleDiscount = b === 1 ? 1 : b <= 2 ? 0.96 : b <= 4 ? 0.92 : 0.88;
        const listPrice = Math.round((p.price * b) / 100) * 100;
        const salePrice = Math.round((p.price * b * bundleDiscount) / 100) * 100;
        const cost = Math.round(p.cost * b);
        const moq = b >= 10 ? 20 : 30;
        skus.push({
          ...base,
          id: sid,
          productId: pid,
          name: b === 1 ? (opt ?? "단품") : `${b}개 묶음`,
          bundleQty: b,
          option: opt,
          listPrice,
          salePrice,
          cost,
          moq,
          primarySupplierId: primary.id,
        });
        // share of velocity: bundles get share by weight
        const share = bundles.length === 1 ? 1 : b === 1 ? 0.45 : b === bundles[bundles.length - 1] ? 0.35 : 0.2;
        const v = (p.velocity * share) / (options.length);
        velocityBySku.set(sid, v);

        // supplier products: primary + 1~2 alternates
        supplierProducts.push({ supplierId: primary.id, skuId: sid, unitCost: cost, moq, leadTimeDays: primary.leadTimeDays });
        const alts = catSup.filter((s) => s.id !== primary.id).slice(0, 2);
        alts.forEach((a, ai) => {
          supplierProducts.push({
            supplierId: a.id,
            skuId: sid,
            unitCost: Math.round(cost * (1 + (ai === 0 ? 0.03 : -0.02) + rf(-0.01, 0.02))),
            moq: Math.max(10, Math.round(moq * rf(0.7, 1.6))),
            leadTimeDays: a.leadTimeDays,
          });
        });

        // inventory: baseline ~ 25 days of stock with noise
        const days = rf(12, 40);
        const onHand = Math.max(0, Math.round(v * days));
        inventory.push({
          skuId: sid,
          warehouseId: CAT_WH[p.cat],
          onHand,
          reserved: Math.round(v * rf(0.3, 1.2)),
          inboundExpected: 0,
          updatedAt: nowIso,
        });

        // demand: 14 day series around velocity
        const daily = Array.from({ length: 14 }, () => Math.max(0, Math.round(v * rf(0.6, 1.4))));
        const order7d = daily.slice(7).reduce((a, c) => a + c, 0);
        const orderPrev7d = daily.slice(0, 7).reduce((a, c) => a + c, 0);
        demand.push({
          skuId: sid,
          search7d: Math.round(order7d * rf(3, 6)),
          searchPrev7d: Math.round(orderPrev7d * rf(3, 6)),
          view7d: Math.round(order7d * rf(6, 12)),
          viewPrev7d: Math.round(orderPrev7d * rf(6, 12)),
          cart7d: Math.round(order7d * rf(1.4, 2.2)),
          cartPrev7d: Math.round(orderPrev7d * rf(1.4, 2.2)),
          order7d,
          orderPrev7d,
          dailySales: daily,
        });
      }
    }
  });

  // ---------- scenario overrides ----------
  const findSku = (productName: string, bundle: number) => {
    const p = products.find((x) => x.name === productName)!;
    return skus.find((s) => s.productId === p.id && s.bundleQty === bundle)!;
  };
  const setInv = (skuId: string, patch: Partial<Inventory>) => {
    const inv = inventory.find((i) => i.skuId === skuId)!;
    Object.assign(inv, patch);
  };
  const setDemand = (skuId: string, patch: Partial<DemandSignal>) => {
    const d = demand.find((x) => x.skuId === skuId)!;
    Object.assign(d, patch);
  };

  // Scenario A — 프리미엄 물티슈 20팩: 수요급증 + 품절위험
  const skuA = findSku("프리미엄 물티슈 100매", 20);
  velocityBySku.set(skuA.id, 31);
  setInv(skuA.id, { onHand: 96, reserved: 12, inboundExpected: 0 });
  setDemand(skuA.id, {
    dailySales: [17, 18, 16, 19, 20, 18, 21, 24, 26, 28, 30, 33, 35, 37],
    order7d: 213, orderPrev7d: 129, search7d: 1240, searchPrev7d: 760, view7d: 2310, viewPrev7d: 1380, cart7d: 402, cartPrev7d: 236,
  });

  // Scenario B — 주방세제 리필 2L 단품: 공급사 납기지연
  const skuB = findSku("주방세제 리필 2L", 1);
  const supGreen = suppliers.find((s) => s.name === "그린키친코리아")!;
  skuB.primarySupplierId = supGreen.id;
  supplierProducts.filter((sp) => sp.skuId === skuB.id).forEach((sp, i) => {
    if (i === 0) { sp.supplierId = supGreen.id; sp.leadTimeDays = 7; }
  });
  // ensure alt supplier 한빛생활유통 exists for skuB
  const supHanbit = suppliers.find((s) => s.name === "한빛생활유통")!;
  if (!supplierProducts.some((sp) => sp.skuId === skuB.id && sp.supplierId === supHanbit.id)) {
    supplierProducts.push({ supplierId: supHanbit.id, skuId: skuB.id, unitCost: Math.round(skuB.cost * 1.03), moq: 40, leadTimeDays: 5 });
  }
  velocityBySku.set(skuB.id, 8);
  setInv(skuB.id, { onHand: 54, reserved: 6, inboundExpected: 240, inboundEta: dayStr(addDays(now, 9)) });
  setDemand(skuB.id, { dailySales: [7, 8, 8, 9, 7, 8, 9, 8, 9, 8, 9, 10, 9, 10], order7d: 63, orderPrev7d: 56 });

  // Scenario C — 무선 미니가습기: 저회전·마진주의
  const skuC = findSku("무선 미니가습기", 1);
  velocityBySku.set(skuC.id, 0.4);
  setInv(skuC.id, { onHand: 186, reserved: 1, inboundExpected: 0 });
  setDemand(skuC.id, { dailySales: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0], order7d: 2, orderPrev7d: 3, search7d: 28, searchPrev7d: 41, view7d: 90, viewPrev7d: 130, cart7d: 6, cartPrev7d: 9 });

  // Supporting: a few more at-risk / overstock SKUs for realistic radar
  const skuWater = findSku("생수 2L 12병", 1);
  setInv(skuWater.id, { onHand: 140, reserved: 30, inboundExpected: 600, inboundEta: dayStr(addDays(now, 2)) });
  const skuPad = findSku("반려동물 배변패드 50매", 2);
  setInv(skuPad.id, { onHand: 40, reserved: 8 });
  velocityBySku.set(skuPad.id, 7);
  const skuDiaper = findSku("기저귀 밴드형 M 4팩", 1);
  setInv(skuDiaper.id, { onHand: 22, reserved: 5, inboundExpected: 120, inboundEta: dayStr(addDays(now, 3)) });
  const skuHeat = findSku("전기 방석 온열매트", 1);
  setInv(skuHeat.id, { onHand: 140, reserved: 0 });
  velocityBySku.set(skuHeat.id, 0.5);
  const skuBath = findSku("아기 욕조 접이식", 1);
  setInv(skuBath.id, { onHand: 64, reserved: 0 });
  const skuMask = findSku("KF94 마스크 50매", 1);
  setInv(skuMask.id, { onHand: 0, reserved: 0, inboundExpected: 300, inboundEta: dayStr(addDays(now, 1)) });
  const skuSpeaker = findSku("블루투스 스피커 미니", 1);
  setInv(skuSpeaker.id, { onHand: 9, reserved: 2 });

  // ---------- customers ----------
  const customers: Customer[] = CUSTOMER_NAMES.map((n, i) => ({
    ...base,
    id: `c-${String(i + 1).padStart(3, "0")}`,
    name: n,
    email: `user${i + 1}@example.com`,
    phone: `010-${ri(2000, 9999)}-${ri(1000, 9999)}`,
    address: { label: i === 0 ? "집" : pick(["집", "회사"]), line1: `${DISTRICTS[i % DISTRICTS.length]} ${pick(["행복로", "중앙대로", "테크노로", "하늘길"])} ${ri(10, 200)}`, line2: `${ri(101, 1504)}호`, zip: String(ri(10000, 63000)).padStart(5, "0") },
    joinedAt: iso(addDays(now, -ri(60, 700))),
  }));

  // ---------- daily sales 90d ----------
  const dailySales: DailySalesPoint[] = [];
  const totalVelocity = Array.from(velocityBySku.values()).reduce((a, c) => a + c, 0); // units/day
  const avgPrice = 11800;
  for (let d = 89; d >= 0; d--) {
    const date = addDays(now, -d);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 1.18 : 1;
    const trend = 1 + (89 - d) * 0.0025; // slight growth
    const units = totalVelocity * weekend * trend * rf(0.85, 1.15);
    const orders = Math.round(units / 2.6);
    const revenue = Math.round(units * avgPrice * rf(0.95, 1.05));
    const discount = Math.round(revenue * rf(0.04, 0.09));
    const shippingCost = Math.round(orders * 2400 * rf(0.6, 0.85));
    const cogs = Math.round(revenue * rf(0.62, 0.67));
    dailySales.push({ date: dayStr(date), orders, revenue, discount, shippingCost, grossMargin: revenue - cogs - discount - shippingCost, returns: Math.round(orders * rf(0.03, 0.06)) });
  }

  const categorySales: CategorySales[] = CATEGORIES.map((c) => {
    const catSkus = skus.filter((s) => products.find((p) => p.id === s.productId)!.categorySlug === c.slug);
    const units30 = catSkus.reduce((a, s) => a + (velocityBySku.get(s.id) ?? 0) * 30, 0);
    const avg = catSkus.reduce((a, s) => a + s.salePrice, 0) / Math.max(1, catSkus.length);
    const revenue = Math.round(units30 * avg);
    const costAvg = catSkus.reduce((a, s) => a + s.cost, 0) / Math.max(1, catSkus.length);
    return { categorySlug: c.slug, revenue, orders: Math.round(units30 / 2.4), margin: Math.round(units30 * (avg - costAvg) * 0.82) };
  });

  // ---------- orders (recent detailed) ----------
  const orders: Order[] = [];
  const stages: OrderStage[] = ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait", "shipped", "in_transit", "delivered"];
  const cutoffToday = new Date(now); cutoffToday.setHours(15, 0, 0, 0);
  const staff = ["박운영", "이물류", "최피킹", "정포장"];
  let orderSeq = 1;
  const mkOrder = (opts: { customer: Customer; items: OrderItem[]; stage: OrderStage; createdAt: Date; warehouseId?: string; promiseDays?: number; risk?: boolean; repeat?: boolean; promotionId?: string; }) => {
    const subtotal = opts.items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
    const discount = opts.promotionId ? Math.round(subtotal * 0.1) : 0;
    const shippingFee = subtotal - discount >= 30000 ? 0 : 3000;
    const id = `NX${dayStr(opts.createdAt).replace(/-/g, "").slice(2)}-${String(orderSeq++).padStart(4, "0")}`;
    const stageIdx = stages.indexOf(opts.stage);
    const history = stages.slice(0, Math.max(1, stageIdx + 1)).map((s, i) => ({ at: iso(addHours(opts.createdAt, i * rf(1, 6))), stage: s, actor: i === 0 ? "고객" : pick(staff) }));
    const wh = opts.warehouseId ?? CAT_WH[products.find((p) => p.id === opts.items[0].productId)!.categorySlug];
    const o: Order = {
      ...base,
      id,
      createdAt: iso(opts.createdAt),
      updatedAt: history[history.length - 1].at,
      customerId: opts.customer.id,
      items: opts.items,
      subtotal,
      discount,
      shippingFee,
      total: subtotal - discount + shippingFee,
      stage: opts.stage,
      warehouseId: wh,
      promisedAt: iso(addDays(opts.createdAt, opts.promiseDays ?? 2)),
      cutoffAt: iso(cutoffToday),
      assignee: stageIdx >= 2 ? pick(staff) : undefined,
      history,
      isRepeatOrder: opts.repeat,
      promotionId: opts.promotionId,
      riskFlag: opts.risk,
    };
    orders.push(o);
    return o;
  };
  const itemOf = (sku: SKU, qty = 1): OrderItem => {
    const p = products.find((x) => x.id === sku.productId)!;
    return { skuId: sku.id, productId: p.id, name: p.name, skuName: sku.name, qty, unitPrice: sku.salePrice, unitCost: sku.cost };
  };
  const fastSkus = skus.filter((s) => products.find((p) => p.id === s.productId)!.deliveryType === "fast");

  // Current customer (c-001 김서연) purchase history for Repeat Basket (Scenario E)
  const me = customers[0];
  const skuWipe10 = findSku("프리미엄 물티슈 100매", 10);
  const skuDet = findSku("액상 세탁세제 3L", 1);
  const skuPad1 = findSku("반려동물 배변패드 50매", 1);
  const skuKit2 = findSku("주방세제 리필 2L", 2);
  const skuWater1 = skuWater;
  const skuYog = findSku("그릭요거트 100g 6개", 1);
  mkOrder({ customer: me, items: [itemOf(skuWipe10, 1), itemOf(skuPad1, 2)], stage: "delivered", createdAt: addDays(now, -23) });
  mkOrder({ customer: me, items: [itemOf(skuDet, 1), itemOf(skuKit2, 1)], stage: "delivered", createdAt: addDays(now, -36) });
  mkOrder({ customer: me, items: [itemOf(skuWater1, 2), itemOf(skuYog, 1)], stage: "delivered", createdAt: addDays(now, -15) });
  mkOrder({ customer: me, items: [itemOf(skuWipe10, 1), itemOf(skuWater1, 1)], stage: "delivered", createdAt: addDays(now, -44) });
  mkOrder({ customer: me, items: [itemOf(skuPad1, 2)], stage: "delivered", createdAt: addDays(now, -41) });
  mkOrder({ customer: me, items: [itemOf(skuDet, 1)], stage: "delivered", createdAt: addDays(now, -71) });
  mkOrder({ customer: me, items: [itemOf(findSku("드립 커피 40개입", 1), 1)], stage: "in_transit", createdAt: addDays(now, -2), promiseDays: 3 });

  // Scenario D — 12 at-risk orders in congested C구역 with promise today
  for (let i = 0; i < 12; i++) {
    const cust = customers[(i % 20) + 2];
    const kitchenSkus = skus.filter((s) => ["kitchen", "home"].includes(products.find((p) => p.id === s.productId)!.categorySlug));
    const items = [itemOf(pick(kitchenSkus), ri(1, 2))];
    if (rnd() > 0.5) items.push(itemOf(pick(fastSkus), 1));
    mkOrder({ customer: cust, items, stage: pick(["confirmed", "picking_wait", "picking"]), createdAt: addHours(now, -ri(3, 20)), warehouseId: "wh-C", promiseDays: 1, risk: true });
  }
  // other recent orders (last 7 days)
  for (let i = 0; i < 58; i++) {
    const cust = customers[ri(1, customers.length - 1)];
    const n = ri(1, 3);
    const items: OrderItem[] = [];
    for (let k = 0; k < n; k++) items.push(itemOf(pick(rnd() > 0.35 ? fastSkus : skus), ri(1, 2)));
    const ageH = ri(1, 7 * 24);
    const stage: OrderStage = ageH < 6 ? pick(["new", "confirmed"]) : ageH < 20 ? pick(["picking_wait", "picking", "packing_wait", "ship_wait"]) : ageH < 48 ? pick(["shipped", "in_transit"]) : ageH < 60 ? "in_transit" : "delivered";
    mkOrder({ customer: cust, items, stage, createdAt: addHours(now, -ageH), promiseDays: 2, repeat: rnd() > 0.7, promotionId: rnd() > 0.85 ? "promo-02" : undefined });
  }
  // a couple of cancelled / return orders
  mkOrder({ customer: customers[5], items: [itemOf(findSku("LED 스탠드 조명", 1))], stage: "cancelled", createdAt: addDays(now, -3) });
  mkOrder({ customer: customers[7], items: [itemOf(findSku("세라믹 프라이팬 28cm", 1))], stage: "return", createdAt: addDays(now, -5) });
  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // ---------- purchase orders ----------
  const purchaseOrders: PurchaseOrder[] = [
    { ...base, id: "PO-2609-018", supplierId: supGreen.id, skuId: skuB.id, qty: 240, unitCost: skuB.cost, status: "in_transit", expectedAt: dayStr(addDays(now, 9)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -6)) },
    { ...base, id: "PO-2609-017", supplierId: suppliers.find((s) => s.name === "청정수원")!.id, skuId: skuWater.id, qty: 600, unitCost: skuWater.cost, status: "confirmed", expectedAt: dayStr(addDays(now, 2)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -2)) },
    { ...base, id: "PO-2609-016", supplierId: suppliers.find((s) => s.name === "베이비퍼스트")!.id, skuId: skuDiaper.id, qty: 120, unitCost: skuDiaper.cost, status: "in_transit", expectedAt: dayStr(addDays(now, 3)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -3)) },
    { ...base, id: "PO-2609-015", supplierId: suppliers.find((s) => s.name === "동아위생산업")!.id, skuId: skuMask.id, qty: 300, unitCost: skuMask.cost, status: "in_transit", expectedAt: dayStr(addDays(now, 1)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -2)) },
    { ...base, id: "PO-2609-011", supplierId: supHanbit.id, skuId: findSku("3겹 롤화장지 30롤", 1).id, qty: 200, unitCost: findSku("3겹 롤화장지 30롤", 1).cost, status: "received", expectedAt: dayStr(addDays(now, -4)), receivedAt: dayStr(addDays(now, -4)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -10)) },
    { ...base, id: "PO-2609-009", supplierId: suppliers.find((s) => s.name === "펫케어서플라이")!.id, skuId: skuPad.id, qty: 150, unitCost: skuPad.cost, status: "received", expectedAt: dayStr(addDays(now, -8)), receivedAt: dayStr(addDays(now, -7)), actor: "구매담당 김구매", createdAt: iso(addDays(now, -13)) },
  ];

  // ---------- returns ----------
  const returns: ReturnRequest[] = [];
  const reasons: ReturnRequest["reason"][] = ["defect", "damaged", "wrong_item", "delay", "info_mismatch", "missing", "change_mind", "other"];
  const reasonWeights = [0.22, 0.18, 0.12, 0.14, 0.1, 0.06, 0.15, 0.03];
  for (let i = 0; i < 84; i++) {
    let r = rnd(); let ridx = 0;
    while (r > reasonWeights[ridx] && ridx < reasons.length - 1) { r -= reasonWeights[ridx]; ridx++; }
    const sku = pick(skus);
    returns.push({ ...base, id: `RT-${String(i + 1).padStart(4, "0")}`, createdAt: iso(addDays(now, -ri(0, 89))), orderId: pick(orders).id, skuId: sku.id, reason: reasons[ridx], status: pick(["requested", "approved", "received", "refunded", "refunded", "refunded"]), supplierId: sku.primarySupplierId });
  }
  // supplier defect concentration for 그린키친코리아 (scenario B narrative)
  for (let i = 0; i < 9; i++) {
    const sku = pick(skus.filter((s) => s.primarySupplierId === supGreen.id));
    returns.push({ ...base, id: `RT-${String(90 + i).padStart(4, "0")}`, createdAt: iso(addDays(now, -ri(0, 40))), orderId: pick(orders).id, skuId: sku.id, reason: "defect", status: "refunded", supplierId: supGreen.id });
  }

  // ---------- promotions ----------
  const mkPromo = (id: string, name: string, skuIds: string[], segment: string, rate: number, start: number, end: number, status: Promotion["status"], mult = 1): Promotion => {
    const impressions = ri(18000, 60000) * mult;
    const clicks = Math.round(impressions * rf(0.04, 0.09));
    const carts = Math.round(clicks * rf(0.18, 0.32));
    const ordersN = Math.round(carts * rf(0.35, 0.55));
    const avg = skuIds.reduce((a, id) => a + skus.find((s) => s.id === id)!.salePrice, 0) / skuIds.length;
    const revenue = Math.round(ordersN * avg * (1 - rate));
    const cogsAvg = skuIds.reduce((a, id) => a + skus.find((s) => s.id === id)!.cost, 0) / skuIds.length;
    return { ...base, id, name, startsAt: dayStr(addDays(now, start)), endsAt: dayStr(addDays(now, end)), skuIds, segment, discountRate: rate, impressions, clicks, carts, orders: ordersN, revenue, shippingCost: Math.round(ordersN * 2100), discountCost: Math.round(ordersN * avg * rate), cogs: Math.round(ordersN * cogsAvg), returns: Math.round(ordersN * rf(0.02, 0.06)), status };
  };
  const promotions: Promotion[] = [
    mkPromo("promo-01", "가을맞이 생활필수품 기획전", [skuWipe10.id, skuDet.id, findSku("3겹 롤화장지 30롤", 1).id], "전체", 0.1, -12, 2, "running", 1.4),
    mkPromo("promo-02", "반려 가족 재구매 감사전", [skuPad.id, findSku("고양이 모래 벤토나이트 10kg", 1).id], "반복상품 구매주기 도래", 0.12, -7, 7, "running"),
    mkPromo("promo-03", "미니가전 재고 정리", [skuC.id, skuHeat.id], "카테고리 충성고객", 0.25, -20, -3, "ended", 0.6),
    mkPromo("promo-04", "첫 주문 웰컴 5천원", fastSkus.slice(0, 6).map((s) => s.id), "첫 주문 전환후보", 0.08, -30, 30, "running"),
    mkPromo("promo-05", "장바구니 복귀 쿠폰", [skuWater.id, findSku("즉석 흰밥 210g 12개", 1).id], "장바구니 이탈", 0.05, -14, 0, "ended"),
    mkPromo("promo-06", "유아용품 정기 특가", [skuDiaper.id, findSku("아기 물티슈 프리미엄 70매", 10).id], "카테고리 충성고객", 0.1, -40, -25, "ended"),
    mkPromo("promo-07", "주방 새단장 위크", [findSku("실리콘 밀폐용기 6종", 1).id, findSku("세라믹 프라이팬 28cm", 1).id], "전체", 0.15, 3, 10, "planned", 0.01),
  ];
  // 미니가전 promo: force margin negative (매출만 높고 실질마진 낮음)
  const p3 = promotions[2];
  p3.discountCost = Math.round(p3.revenue * 0.42);
  p3.shippingCost = Math.round(p3.orders * 3200);

  // ---------- actions ----------
  const dueIn = (h: number) => iso(addHours(now, h));
  const ago = (h: number) => iso(addHours(now, -h));
  const actions: AXAction[] = [];
  const pushAction = (a: Omit<AXAction, "id" | "createdAt" | "updatedAt" | "source" | "evidenceIds"> & { id: string; createdAt?: string }) => {
    actions.push({ ...base, evidenceIds: [], ...a, createdAt: a.createdAt ?? nowIso });
  };
  const supDonga = suppliers.find((s) => s.name === "동아위생산업")!;
  pushAction({
    id: "act-001", type: "urgent_po", scenario: "A",
    title: "프리미엄 물티슈 20팩 긴급발주 검토",
    summary: "최근 7일 판매속도가 65% 증가했고 가용재고가 84개로 예상 소진일이 2.7일입니다. 기본 공급기간 5일보다 빠릅니다.",
    trigger: "예상 소진일(2.7일) < 공급 리드타임(5일)",
    reasons: ["최근 7일 판매속도 65% 증가 (129 → 213개)", "가용재고 84개, 예상 소진 2.7일", "검색 63%·장바구니 70% 증가로 대기수요 존재", "기본 공급사 리드타임 5일"],
    expectedImpact: "품절 시 약 5일간 일 31개 판매기회 손실 (추정 약 150개)",
    caution: "긴급발주 단가가 3% 높은 공급사를 선택하면 마진이 낮아집니다.",
    urgency: "critical", owner: "buyer", assignee: "김구매", recommendedAt: ago(2), dueAt: dueIn(6), stage: "recommended",
    related: { productId: skuA.productId, skuId: skuA.id, supplierId: supHanbit.id, altSupplierId: supDonga.id },
    proposal: { qty: 400, supplierId: supDonga.id, note: "3일 납기 공급사로 400개 발주 시 12일치 확보" },
  });
  pushAction({
    id: "act-002", type: "alt_supplier", scenario: "B",
    title: "주방세제 리필 2L 공급사 납기지연 대체구매 검토",
    summary: "그린키친코리아 입고(PO-2609-018)가 4일 지연되어 재고 소진 가능성이 있습니다. 한빛생활유통은 단가 3% 높지만 5일 납기입니다.",
    trigger: "PO 예정일 초과 + 예상 소진일 < 변경된 입고일",
    reasons: ["기존 PO 입고예정 4일 지연 (D+9)", "가용재고 48개, 일 8개 판매 → 6일 후 소진", "그린키친코리아 최근 정시납품률 78%", "대체 공급사 5일 납기 가능"],
    expectedImpact: "3일간 품절 방지, 반복구매 고객 이탈 방지",
    caution: "분할발주 시 최소주문수량 40개 조건을 확인하세요.",
    urgency: "high", owner: "buyer", assignee: "김구매", recommendedAt: ago(5), dueAt: dueIn(24), stage: "recommended",
    related: { productId: skuB.productId, skuId: skuB.id, supplierId: supGreen.id, altSupplierId: supHanbit.id, poId: "PO-2609-018" },
    proposal: { qty: 120, supplierId: supHanbit.id, note: "부족분 120개만 대체발주, 기존 PO 유지" },
  });
  pushAction({
    id: "act-003", type: "stop_po", scenario: "C",
    title: "무선 미니가습기 발주중단·프로모션 조정 검토",
    summary: "재고일수가 465일이고 최근 4주 판매가 감소했습니다. 직전 25% 할인 프로모션은 매출 대비 실질마진이 마이너스였습니다.",
    trigger: "재고일수 > 180일 AND 판매량 4주 연속 감소",
    reasons: ["가용재고 185개, 일 0.4개 판매 → 465일치", "상세조회 31% 감소, 검색 32% 감소", "미니가전 재고정리 프로모션 실질마진 -18%", "계절성 상품(가을~겨울)으로 11월 이후 수요 회복 가능"],
    expectedImpact: "추가 발주 보류로 약 280만원 재고자금 절감",
    caution: "완전 단종보다는 11월 재평가를 권장합니다.",
    urgency: "mid", owner: "buyer", assignee: "김구매", recommendedAt: ago(30), dueAt: dueIn(72), stage: "reviewing",
    related: { productId: skuC.productId, skuId: skuC.id, promotionId: "promo-03" },
    proposal: { note: "발주 보류 + 묶음구성(가습기+온열매트) 프로모션 검토" },
  });
  const riskOrderIds = orders.filter((o) => o.riskFlag).map((o) => o.id);
  pushAction({
    id: "act-004", type: "priority_order", scenario: "D",
    title: "C구역 마감임박 배송약속 주문 12건 우선처리",
    summary: "오후 3시 출고마감까지 C구역 피킹 적체율 82%입니다. 오늘 배송약속이 있는 주문 12건이 피킹 대기 중입니다.",
    trigger: "출고마감 D-3h AND 구역 적체 > 70% AND 배송약속 주문 존재",
    reasons: ["C구역 피킹 적체율 82% (평균 40%)", "배송약속 오늘인 주문 12건이 피킹 이전 단계", "동일 시간대 평균 처리량 대비 38% 부족", "지연 시 고객 사전안내 필요"],
    expectedImpact: "정시출고율 하락 방지, 배송지연 VOC 예방",
    urgency: "critical", owner: "ops", assignee: "박운영", recommendedAt: ago(1), dueAt: iso(cutoffToday), stage: "recommended",
    related: { orderIds: riskOrderIds },
    proposal: { note: "A구역 피커 2명을 C구역으로 임시 배치, 12건 우선 피킹" },
  });
  pushAction({
    id: "act-005", type: "delay_notice", scenario: "D",
    title: "배송지연 가능 고객 사전안내",
    summary: "우선처리 후에도 마감을 넘길 가능성이 있는 주문 4건은 고객에게 미리 안내합니다.",
    trigger: "우선처리 후 예상 출고시각 > 마감",
    reasons: ["C구역 적체가 해소되지 않으면 4건은 익일 출고", "사전안내 시 배송지연 VOC 60% 감소(업계 통상 경험치, 검증 필요)"],
    expectedImpact: "VOC 감소, 고객 신뢰 유지",
    urgency: "high", owner: "cs", assignee: "이CS", recommendedAt: ago(1), dueAt: dueIn(3), stage: "recommended",
    related: { orderIds: riskOrderIds.slice(8) },
  });
  pushAction({
    id: "act-006", type: "repeat_expose", scenario: "E",
    title: "재구매 주기 도래 고객 42명 Repeat Basket 노출",
    summary: "물티슈·세제·반려패드 평균 구매주기가 도래한 고객 42명에게 Repeat Basket을 노출합니다.",
    trigger: "마지막 구매일 + 평균 구매주기 ≤ 오늘 + 3일",
    reasons: ["반복상품 구매고객 42명이 주기 도래", "해당 상품 현재 재고 보유(물티슈 20팩 제외)", "지난달 Repeat Basket 전환율 31% (Demo 집계)"],
    expectedImpact: "재구매 주문 약 13건 예상 (Demo 시뮬레이션)",
    caution: "물티슈 20팩은 품절위험이라 10팩으로 대체 노출합니다.",
    urgency: "mid", owner: "owner", assignee: "대표", recommendedAt: ago(8), dueAt: dueIn(48), stage: "recommended",
    related: { customerIds: customers.slice(0, 8).map((c) => c.id), skuId: skuWipe10.id },
  });
  pushAction({
    id: "act-007", type: "promo_adjust", scenario: "C",
    title: "가을맞이 기획전 물티슈 10팩 할인율 조정",
    summary: "기획전 매출은 높지만 물티슈 10팩은 할인 후 마진율이 9%로 낮습니다. 할인율을 10%→5%로 조정 검토합니다.",
    trigger: "프로모션 상품 할인 후 마진율 < 12%",
    reasons: ["물티슈 10팩 할인 후 마진율 9%", "프로모션 없이도 판매속도 상승 중", "할인이 기존 구매를 대체한 비율 추정 40%"],
    expectedImpact: "기획전 실질마진 약 +6%p",
    urgency: "mid", owner: "owner", assignee: "대표", recommendedAt: ago(20), dueAt: dueIn(48), stage: "recommended",
    related: { promotionId: "promo-01", skuId: skuWipe10.id },
  });
  pushAction({
    id: "act-008", type: "urgent_po", title: "KF94 마스크 50매 품절 — 입고 D+1 확인 및 예약판매 전환",
    summary: "현재 품절 상태이며 300개가 내일 입고 예정입니다. 상품 상세를 예약배송으로 전환합니다.",
    trigger: "가용재고 0 AND 입고예정 존재",
    reasons: ["가용재고 0", "PO-2609-015 내일 입고 300개", "최근 7일 검색 유지"],
    expectedImpact: "품절 이탈 대신 예약주문 확보",
    urgency: "high", owner: "buyer", assignee: "김구매", recommendedAt: ago(12), dueAt: dueIn(12), stage: "in_progress",
    related: { productId: skuMask.productId, skuId: skuMask.id, poId: "PO-2609-015" },
  });
  pushAction({
    id: "act-009", type: "urgent_po", title: "블루투스 스피커 미니 안전재고 미달 발주 검토",
    summary: "가용재고 7개로 안전재고(15개)를 밑돕니다. 리드타임 8일을 감안해 발주를 검토합니다.",
    trigger: "가용재고 < 안전재고",
    reasons: ["가용재고 7개", "일 1.3개 판매 → 5.4일치", "루미전자유통 리드타임 8일"],
    expectedImpact: "약 3일 품절 방지",
    urgency: "mid", owner: "buyer", assignee: "김구매", recommendedAt: ago(26), dueAt: dueIn(36), stage: "recommended",
    related: { productId: skuSpeaker.productId, skuId: skuSpeaker.id, supplierId: skuSpeaker.primarySupplierId },
    proposal: { qty: 40, supplierId: skuSpeaker.primarySupplierId },
  });
  pushAction({
    id: "act-010", type: "stop_po", title: "전기 방석 온열매트 저회전 발주 보류",
    summary: "재고일수 280일. 11월 성수기 전까지 발주를 보류합니다.",
    trigger: "재고일수 > 180일",
    reasons: ["가용재고 140개, 일 0.5개 판매", "계절상품, 11월 수요 회복 예상"],
    expectedImpact: "재고자금 약 260만원 보류",
    urgency: "low", owner: "buyer", assignee: "김구매", recommendedAt: ago(70), dueAt: dueIn(120), stage: "held", holdReason: "11월 1일 재평가",
    related: { productId: skuHeat.productId, skuId: skuHeat.id },
  });
  pushAction({
    id: "act-011", type: "alt_supplier", title: "그린키친코리아 불량·납기 복합위험 — 공급사 평가 갱신",
    summary: "최근 40일 불량 반품 9건과 납기지연 2회가 겹쳤습니다. 주방 카테고리 대체 공급사 비중 확대를 검토합니다.",
    trigger: "공급사 불량률 > 1% AND 정시납품률 < 80%",
    reasons: ["불량 반품 9건 (동일 공급사)", "정시납품률 78%", "리빙앤홈·한빛생활유통 대체 가능"],
    expectedImpact: "반품비용·품절위험 동시 감소",
    urgency: "mid", owner: "buyer", assignee: "김구매", recommendedAt: ago(40), dueAt: dueIn(96), stage: "reviewing",
    related: { supplierId: supGreen.id, altSupplierId: suppliers.find((s) => s.name === "리빙앤홈")!.id },
  });
  pushAction({
    id: "act-012", type: "repeat_expose", title: "장바구니 이탈 고객 18명 복귀 안내",
    summary: "생수·즉석밥을 장바구니에 담고 48시간 내 주문하지 않은 고객에게 안내합니다.",
    trigger: "장바구니 담기 후 48시간 미주문",
    reasons: ["장바구니 이탈 18명", "해당 상품 재고 정상", "복귀 쿠폰 프로모션 전환율 22% (Demo)"],
    expectedImpact: "약 4건 주문 회복 (추정)",
    urgency: "low", owner: "cs", assignee: "이CS", recommendedAt: ago(15), dueAt: dueIn(30), stage: "recommended",
    related: { customerIds: customers.slice(8, 14).map((c) => c.id) },
  });
  // completed history (for evidence)
  pushAction({
    id: "act-013", type: "urgent_po", title: "3겹 롤화장지 30롤 긴급발주",
    summary: "판매 급증으로 200개 긴급발주 후 입고 완료. 품절 없이 판매 유지.",
    trigger: "예상 소진일 < 리드타임",
    reasons: ["일 17개 판매, 가용재고 40개", "한빛생활유통 5일 납기"],
    expectedImpact: "품절 0일 유지",
    urgency: "high", owner: "buyer", assignee: "김구매", recommendedAt: ago(24 * 10), dueAt: ago(24 * 8), stage: "done",
    related: { skuId: findSku("3겹 롤화장지 30롤", 1).id, supplierId: supHanbit.id, poId: "PO-2609-011" },
    result: "입고 완료 (D-4). 발주~입고 5일, 품절 0일.", createdAt: ago(24 * 10),
  });
  pushAction({
    id: "act-014", type: "urgent_po", title: "반려동물 배변패드 2개 묶음 발주",
    summary: "재구매 주기 도래 고객 증가 대응 150개 발주. 입고 완료.",
    trigger: "재구매 예상수요 > 가용재고",
    reasons: ["재구매 예상 고객 31명", "가용재고 22개"],
    expectedImpact: "재구매 품절 방지",
    urgency: "mid", owner: "buyer", assignee: "김구매", recommendedAt: ago(24 * 13), dueAt: ago(24 * 11), stage: "done",
    related: { skuId: skuPad.id, supplierId: suppliers.find((s) => s.name === "펫케어서플라이")!.id, poId: "PO-2609-009" },
    result: "입고 완료 (D-7). 이후 7일간 재구매 주문 27건 처리.", createdAt: ago(24 * 13),
  });
  pushAction({
    id: "act-015", type: "priority_order", title: "B구역 냉장식품 주문 우선출고",
    summary: "냉장 상품 배송약속 주문 9건 우선처리 완료.",
    trigger: "냉장상품 + 마감임박",
    reasons: ["냉장 9건 피킹 대기", "마감 2시간 전"],
    expectedImpact: "정시출고율 유지",
    urgency: "high", owner: "ops", assignee: "박운영", recommendedAt: ago(24 * 2 + 5), dueAt: ago(24 * 2), stage: "done",
    related: {},
    result: "9건 마감 전 출고 완료. 정시출고율 97% 유지.", createdAt: ago(24 * 2 + 5),
  });
  pushAction({
    id: "act-016", type: "promo_adjust", title: "장바구니 복귀 쿠폰 종료 및 결과 정리",
    summary: "복귀 쿠폰 2주 운영 종료. 전환율 22%, 실질마진 양호.",
    trigger: "프로모션 종료",
    reasons: ["전환 22%", "할인비용 대비 마진 +"],
    expectedImpact: "재운영 시 동일 구조 적용",
    urgency: "low", owner: "owner", assignee: "대표", recommendedAt: ago(24 * 1), dueAt: ago(2), stage: "done",
    related: { promotionId: "promo-05" },
    result: "종료. 결과를 Evidence로 기록.", createdAt: ago(24 * 1),
  });
  pushAction({
    id: "act-017", type: "stop_po", title: "아기 욕조 접이식 발주 보류",
    summary: "재고일수 80일 → 발주 보류.",
    trigger: "재고일수 > 60일 (저회전 카테고리)",
    reasons: ["가용재고 64개", "일 0.8개 판매"],
    expectedImpact: "재고자금 절감",
    urgency: "low", owner: "buyer", assignee: "김구매", recommendedAt: ago(24 * 5), dueAt: dueIn(24 * 20), stage: "dismissed", holdReason: "유아 카테고리 시즌 프로모션 예정으로 유지",
    related: { skuId: skuBath.id },
  });

  // ---------- evidence ----------
  const evidence: EvidenceLog[] = [
    { ...base, id: "ev-001", createdAt: ago(24 * 14), type: "BASELINE", title: "재고·발주 Baseline 측정 시작", detail: "주간 재고분석 소요시간, 긴급발주 비중, 품절률 Baseline은 실운영 데이터로 측정 예정. Demo 값은 Simulation입니다.", actor: "AX Owner", dataSource: "Demo Repository", mode: "실증 준비" },
    { ...base, id: "ev-002", createdAt: ago(24 * 10), type: "ACTION", title: "롤화장지 긴급발주 승인", detail: "예상 소진일 2.4일 < 리드타임 5일. 한빛생활유통 200개 발주 승인.", actor: "김구매", actionId: "act-013", skuId: findSku("3겹 롤화장지 30롤", 1).id, supplierId: supHanbit.id, dataSource: "Demand Signal + Inventory", mode: "Demo Evidence" },
    { ...base, id: "ev-003", createdAt: ago(24 * 4), type: "RESULT", title: "롤화장지 입고 완료 · 품절 0일", detail: "PO-2609-011 200개 입고. 발주~입고 5일. 해당 기간 품절 0일.", actor: "박운영", actionId: "act-013", skuId: findSku("3겹 롤화장지 30롤", 1).id, kpiDelta: "품절일수 0 / 긴급발주 1건", dataSource: "Inbound + Inventory", mode: "Demo Evidence" },
    { ...base, id: "ev-004", createdAt: ago(24 * 13), type: "ACTION", title: "배변패드 2개 묶음 150개 발주", detail: "재구매 예상 고객 31명 대비 가용재고 22개.", actor: "김구매", actionId: "act-014", skuId: skuPad.id, dataSource: "Repeat Prediction + Inventory", mode: "Demo Evidence" },
    { ...base, id: "ev-005", createdAt: ago(24 * 7), type: "REVENUE", title: "배변패드 입고 후 7일간 재구매 27건", detail: "Repeat Basket 노출 고객 중 27건 주문. 품절 없이 처리.", actor: "시스템", actionId: "act-014", skuId: skuPad.id, kpiDelta: "재구매 주문 27건 (Demo)", dataSource: "Orders", mode: "Simulation" },
    { ...base, id: "ev-006", createdAt: ago(24 * 2), type: "EFFICIENCY", title: "B구역 냉장 9건 마감 전 출고", detail: "우선처리 Action 실행 후 9건 모두 마감 전 출고. 정시출고율 97%.", actor: "박운영", actionId: "act-015", kpiDelta: "정시출고율 97%", dataSource: "Fulfillment", mode: "Demo Evidence" },
    { ...base, id: "ev-007", createdAt: ago(3), type: "RISK", title: "그린키친코리아 납기지연 감지", detail: "PO-2609-018 예정일 초과. 주방세제 리필 2L 품절 위험 상승.", actor: "시스템", actionId: "act-002", supplierId: supGreen.id, skuId: skuB.id, dataSource: "Purchase Orders", mode: "Demo Evidence" },
    { ...base, id: "ev-008", createdAt: ago(2), type: "RISK", title: "프리미엄 물티슈 20팩 품절위험 감지", detail: "판매속도 65% 증가, 예상 소진 2.7일.", actor: "시스템", actionId: "act-001", skuId: skuA.id, dataSource: "Demand Signal", mode: "Demo Evidence" },
    { ...base, id: "ev-009", createdAt: ago(24), type: "CUSTOMER", title: "장바구니 복귀 쿠폰 결과", detail: "노출 18명 중 4명 주문 (22%). 할인비용 대비 마진 양호.", actor: "이CS", actionId: "act-016", kpiDelta: "전환율 22%", dataSource: "Promotion Events", mode: "Simulation" },
    { ...base, id: "ev-010", createdAt: ago(24 * 6), type: "ADOPTION", title: "주간 AX 사용 집계", detail: "대표 5일, 구매담당 5일, 운영담당 5일 접속. Action 12건 중 9건 처리.", actor: "시스템", kpiDelta: "Action 실행률 75%", dataSource: "App Usage", mode: "Simulation" },
    { ...base, id: "ev-011", createdAt: ago(24 * 1), type: "EXCEPTION", title: "C구역 피킹 적체 82%", detail: "동시간대 평균 40% 대비 2배. 인력 재배치 필요.", actor: "시스템", actionId: "act-004", dataSource: "Fulfillment", mode: "Demo Evidence" },
    { ...base, id: "ev-012", createdAt: ago(24 * 20), type: "SCALE", title: "구매담당 1인당 관리 SKU", detail: "구매담당 1명이 관리하는 SKU 수를 측정지점으로 정의. 실측은 Pilot에서.", actor: "AX Owner", kpiDelta: "측정지점 정의", dataSource: "Product Master", mode: "실증 준비" },
  ];
  actions.forEach((a) => { a.evidenceIds = evidence.filter((e) => e.actionId === a.id).map((e) => e.id); });

  const orderCount90d = dailySales.reduce((a, c) => a + c.orders, 0);
  const returnCount90d = dailySales.reduce((a, c) => a + c.returns, 0);

  return {
    generatedAt: nowIso,
    categories: CATEGORIES,
    brands: BRANDS,
    products,
    skus,
    suppliers,
    supplierProducts,
    warehouses: WAREHOUSES,
    inventory,
    purchaseOrders,
    customers,
    demand,
    dailySales,
    categorySales,
    orders,
    returns,
    promotions,
    actions,
    evidence,
    notifications: [
      { ...base, id: "n-001", customerId: "c-001", title: "드립 커피 40개입 배송중", body: "주문하신 상품이 배송 중입니다. 내일 도착 예정입니다.", read: false },
    ],
    aggregates: {
      customerCount: 612,
      orderCount90d,
      returnCount90d,
      repeatCustomerRate: 0.38,
      detailVisitors30d: 18420,
      cartEntrants30d: 4110,
      orderers30d: 1730,
    },
  };
}
