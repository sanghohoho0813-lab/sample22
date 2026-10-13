import type {
  Brand,
  Category,
  CategorySales,
  CategorySlug,
  Customer,
  DailySalesPoint,
  DemandSignal,
  DemoData,
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
import { dateKey } from "./format";
import { mulberry32, makeSampler } from "./rng";
import { DEFAULT_COST_MODEL, isBulky, orderEconomics, type Channel } from "./costs";
import {
  generateCustomerBase,
  generateLedger,
  HOUR_WEIGHTS,
  type Ledger,
  type LedgerCustomer,
} from "./ledger";
import { rememberLedger } from "./ledgerCache";
import {
  cutoffForCreated,
  cutoffOnOrAfter,
  finishAfterWork,
  forecastShipments,
  toShift,
  workMinutes,
} from "./fulfillment";
import { buildSeedActions } from "./seedActions";
import { opsSnapshot } from "./lifecycle";

const SEED = 20260908;
let rnd = mulberry32(SEED);
const ri = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const rf = (min: number, max: number) => rnd() * (max - min) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

const iso = (d: Date) => d.toISOString();
const dayStr = dateKey;
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
  {
    name: "프리미엄 물티슈 100매",
    cat: "living",
    brand: "b-02",
    price: 1900,
    cost: 1150,
    repeat: 21,
    bundles: [1, 10, 20],
    velocity: 38,
    delivery: "fast",
    tags: ["베스트", "반복구매"],
    desc: "두툼한 원단과 순한 성분의 데일리 물티슈. 20팩 묶음이 가장 인기.",
  },
  {
    name: "액상 세탁세제 3L",
    cat: "living",
    brand: "b-02",
    price: 12900,
    cost: 8200,
    repeat: 35,
    bundles: [1, 2],
    velocity: 14,
    delivery: "fast",
    tags: ["반복구매"],
    desc: "찬물에도 잘 녹는 고농축 액상 세제.",
  },
  {
    name: "섬유유연제 2.5L",
    cat: "living",
    brand: "b-02",
    price: 8900,
    cost: 5600,
    repeat: 40,
    bundles: [1, 2],
    velocity: 9,
    desc: "은은한 코튼향 섬유유연제.",
  },
  {
    name: "3겹 롤화장지 30롤",
    cat: "living",
    brand: "b-01",
    price: 15900,
    cost: 10500,
    repeat: 30,
    bundles: [1, 2],
    velocity: 17,
    delivery: "fast",
    tags: ["베스트"],
    desc: "부드러운 3겹 화장지 30롤.",
  },
  {
    name: "키친타월 150매 6롤",
    cat: "living",
    brand: "b-01",
    price: 7900,
    cost: 5100,
    repeat: 28,
    bundles: [1, 2, 4],
    velocity: 11,
    desc: "흡수력 좋은 키친타월.",
  },
  {
    name: "종량제 쓰레기봉투 20L 100매",
    cat: "living",
    brand: "b-01",
    price: 9900,
    cost: 6900,
    repeat: 45,
    bundles: [1],
    velocity: 6,
    desc: "지역 공용 규격 봉투.",
  },
  {
    name: "손소독 티슈 60매",
    cat: "living",
    brand: "b-03",
    price: 3900,
    cost: 2300,
    repeat: 30,
    bundles: [1, 5],
    velocity: 7,
    desc: "외출용 휴대 소독티슈.",
  },
  {
    name: "빨래 건조대 스탠드형",
    cat: "living",
    brand: "b-09",
    price: 34900,
    cost: 21000,
    velocity: 1.5,
    desc: "접이식 대형 건조대.",
  },
  {
    name: "화장실 청소용 세정제 1L",
    cat: "living",
    brand: "b-02",
    price: 5900,
    cost: 3600,
    repeat: 50,
    bundles: [1, 2],
    velocity: 5,
    desc: "물때·찌든때 제거 세정제.",
  },
  {
    name: "일회용 위생장갑 200매",
    cat: "living",
    brand: "b-03",
    price: 4500,
    cost: 2700,
    repeat: 40,
    bundles: [1, 3],
    velocity: 6,
    desc: "조리·청소 겸용 위생장갑.",
  },
  // kitchen
  {
    name: "주방세제 리필 2L",
    cat: "kitchen",
    brand: "b-04",
    price: 6900,
    cost: 4300,
    repeat: 32,
    bundles: [1, 2, 4],
    velocity: 16,
    delivery: "fast",
    tags: ["반복구매"],
    desc: "기름때에 강한 저자극 주방세제 리필.",
  },
  {
    name: "스테인리스 3중 냄비 세트",
    cat: "kitchen",
    brand: "b-04",
    price: 59000,
    cost: 36000,
    velocity: 0.9,
    desc: "18·20·24cm 3종 세트.",
  },
  {
    name: "실리콘 밀폐용기 6종",
    cat: "kitchen",
    brand: "b-04",
    price: 24900,
    cost: 15200,
    velocity: 2.4,
    desc: "전자레인지 사용 가능 밀폐용기.",
  },
  {
    name: "수세미 10입",
    cat: "kitchen",
    brand: "b-04",
    price: 4900,
    cost: 2800,
    repeat: 45,
    bundles: [1, 3],
    velocity: 8,
    desc: "항균 양면 수세미.",
  },
  {
    name: "위생 지퍼백 대형 50매",
    cat: "kitchen",
    brand: "b-01",
    price: 5900,
    cost: 3500,
    repeat: 40,
    bundles: [1, 2],
    velocity: 7,
    desc: "냉동보관용 두꺼운 지퍼백.",
  },
  {
    name: "친환경 종이호일 30m",
    cat: "kitchen",
    brand: "b-04",
    price: 3900,
    cost: 2300,
    repeat: 60,
    bundles: [1, 3],
    velocity: 4,
    desc: "에어프라이어 겸용 종이호일.",
  },
  {
    name: "세라믹 프라이팬 28cm",
    cat: "kitchen",
    brand: "b-11",
    price: 32900,
    cost: 20500,
    velocity: 1.6,
    desc: "코팅이 오래가는 세라믹 팬.",
  },
  {
    name: "전기 커피포트 1.7L",
    cat: "kitchen",
    brand: "b-05",
    price: 27900,
    cost: 17800,
    velocity: 1.8,
    desc: "온도조절 전기포트.",
  },
  {
    name: "도마 항균 2종 세트",
    cat: "kitchen",
    brand: "b-04",
    price: 14900,
    cost: 8900,
    velocity: 1.7,
    desc: "육류·채소 분리 도마.",
  },
  // food
  {
    name: "생수 2L 12병",
    cat: "food",
    brand: "b-10",
    price: 9900,
    cost: 7100,
    repeat: 14,
    bundles: [1, 2],
    velocity: 42,
    delivery: "fast",
    tags: ["베스트", "반복구매"],
    desc: "깨끗한 암반수 생수 2L 12병 묶음.",
  },
  {
    name: "생수 500ml 20병",
    cat: "food",
    brand: "b-10",
    price: 7900,
    cost: 5600,
    repeat: 21,
    bundles: [1, 2],
    velocity: 20,
    delivery: "fast",
    desc: "휴대용 소용량 생수.",
  },
  {
    name: "즉석 흰밥 210g 12개",
    cat: "food",
    brand: "b-12",
    price: 12900,
    cost: 9100,
    repeat: 25,
    bundles: [1, 2],
    velocity: 15,
    desc: "갓 지은 밥맛 즉석밥.",
  },
  {
    name: "드립 커피 40개입",
    cat: "food",
    brand: "b-12",
    price: 15900,
    cost: 9800,
    repeat: 30,
    bundles: [1, 2],
    velocity: 10,
    desc: "산미 균형 잡힌 블렌드 드립백.",
  },
  {
    name: "컵라면 12개입",
    cat: "food",
    brand: "b-12",
    price: 10900,
    cost: 7900,
    repeat: 30,
    bundles: [1, 2],
    velocity: 12,
    desc: "인기 매운맛 컵라면 박스.",
  },
  {
    name: "그릭요거트 100g 6개",
    cat: "food",
    brand: "b-08",
    price: 8900,
    cost: 6200,
    repeat: 10,
    delivery: "fast",
    velocity: 9,
    desc: "무가당 고단백 요거트.",
  },
  {
    name: "견과류 하루견과 30봉",
    cat: "food",
    brand: "b-08",
    price: 18900,
    cost: 12500,
    repeat: 30,
    bundles: [1, 2],
    velocity: 8,
    desc: "매일 한 봉 견과 믹스.",
  },
  {
    name: "냉동 만두 1kg",
    cat: "food",
    brand: "b-12",
    price: 11900,
    cost: 8200,
    repeat: 20,
    delivery: "fast",
    velocity: 7,
    desc: "육즙 가득 고기만두.",
  },
  {
    name: "올리브유 1L",
    cat: "food",
    brand: "b-11",
    price: 19900,
    cost: 13500,
    repeat: 60,
    velocity: 4,
    desc: "엑스트라버진 올리브유.",
  },
  {
    name: "탄산수 500ml 20병",
    cat: "food",
    brand: "b-10",
    price: 11900,
    cost: 8300,
    repeat: 18,
    bundles: [1, 2],
    velocity: 13,
    desc: "강탄산 플레인 탄산수.",
  },
  // home
  {
    name: "극세사 이불 겨울용 Q",
    cat: "home",
    brand: "b-09",
    price: 49900,
    cost: 31000,
    velocity: 1.2,
    delivery: "standard",
    desc: "포근한 극세사 겨울 이불.",
  },
  {
    name: "리빙박스 50L 3개",
    cat: "home",
    brand: "b-09",
    price: 29900,
    cost: 18500,
    velocity: 2.1,
    desc: "투명 대형 수납박스.",
  },
  {
    name: "욕실 미끄럼방지 매트",
    cat: "home",
    brand: "b-09",
    price: 12900,
    cost: 7400,
    velocity: 2.6,
    desc: "물빠짐 좋은 욕실매트.",
  },
  {
    name: "무선 물걸레 청소포 40매",
    cat: "home",
    brand: "b-02",
    price: 8900,
    cost: 5300,
    repeat: 30,
    bundles: [1, 3],
    velocity: 6,
    desc: "일회용 물걸레 청소포.",
  },
  {
    name: "옷걸이 논슬립 30개",
    cat: "home",
    brand: "b-09",
    price: 9900,
    cost: 5800,
    velocity: 3,
    desc: "옷이 흘러내리지 않는 벨벳 옷걸이.",
  },
  {
    name: "암막커튼 2장 세트",
    cat: "home",
    brand: "b-11",
    price: 39900,
    cost: 24500,
    velocity: 1.1,
    desc: "빛 차단 99% 암막커튼.",
  },
  {
    name: "디퓨저 200ml 화이트머스크",
    cat: "home",
    brand: "b-09",
    price: 14900,
    cost: 8100,
    repeat: 60,
    velocity: 3.2,
    desc: "은은한 실내 방향제.",
  },
  {
    name: "방수 매트리스 커버 Q",
    cat: "home",
    brand: "b-09",
    price: 22900,
    cost: 13800,
    velocity: 1.4,
    desc: "세탁 가능한 방수 커버.",
  },
  // digital
  {
    name: "무선 미니가습기",
    cat: "digital",
    brand: "b-05",
    price: 24900,
    cost: 15200,
    velocity: 0.6,
    tags: ["저회전"],
    desc: "책상 위 USB 무선 가습기.",
  },
  {
    name: "USB-C 고속충전 케이블 2m",
    cat: "digital",
    brand: "b-05",
    price: 8900,
    cost: 4200,
    velocity: 6,
    bundles: [1, 2],
    desc: "60W 고속충전 케이블.",
  },
  {
    name: "LED 스탠드 조명",
    cat: "digital",
    brand: "b-05",
    price: 32900,
    cost: 19800,
    velocity: 1.4,
    desc: "3단 밝기 조절 스탠드.",
  },
  {
    name: "무선 핸디 청소기",
    cat: "digital",
    brand: "b-05",
    price: 69000,
    cost: 42000,
    velocity: 0.9,
    desc: "차량·소파용 무선 청소기.",
  },
  {
    name: "전기 방석 온열매트",
    cat: "digital",
    brand: "b-05",
    price: 29900,
    cost: 18500,
    velocity: 0.8,
    desc: "사무실용 온열방석.",
  },
  {
    name: "멀티탭 6구 3m",
    cat: "digital",
    brand: "b-05",
    price: 13900,
    cost: 8400,
    velocity: 3.4,
    desc: "개별스위치 멀티탭.",
  },
  {
    name: "블루투스 스피커 미니",
    cat: "digital",
    brand: "b-05",
    price: 25900,
    cost: 15900,
    velocity: 1.3,
    desc: "방수 휴대용 스피커.",
  },
  {
    name: "AA 건전지 20입",
    cat: "digital",
    brand: "b-05",
    price: 8900,
    cost: 5400,
    repeat: 90,
    velocity: 4,
    desc: "고성능 알카라인 건전지.",
  },
  // pet
  {
    name: "반려동물 배변패드 50매",
    cat: "pet",
    brand: "b-06",
    price: 12900,
    cost: 8100,
    repeat: 18,
    bundles: [1, 2, 4],
    velocity: 21,
    delivery: "fast",
    tags: ["반복구매"],
    desc: "흡수력 강한 두꺼운 배변패드.",
  },
  {
    name: "강아지 사료 소형견 3kg",
    cat: "pet",
    brand: "b-06",
    price: 25900,
    cost: 16800,
    repeat: 30,
    velocity: 6,
    desc: "연어 베이스 소형견 사료.",
  },
  {
    name: "고양이 모래 벤토나이트 10kg",
    cat: "pet",
    brand: "b-06",
    price: 15900,
    cost: 10200,
    repeat: 25,
    bundles: [1, 2],
    velocity: 8,
    desc: "먼지 적은 응고형 모래.",
  },
  {
    name: "고양이 습식캔 12개",
    cat: "pet",
    brand: "b-06",
    price: 14900,
    cost: 9600,
    repeat: 20,
    velocity: 7,
    desc: "참치·닭가슴살 습식캔.",
  },
  {
    name: "반려동물 간식 저키 300g",
    cat: "pet",
    brand: "b-06",
    price: 9900,
    cost: 5800,
    repeat: 25,
    velocity: 6,
    desc: "국내산 닭가슴살 저키.",
  },
  {
    name: "펫 배변봉투 300매",
    cat: "pet",
    brand: "b-06",
    price: 6900,
    cost: 3900,
    repeat: 45,
    velocity: 5,
    desc: "산책용 배변봉투.",
  },
  {
    name: "반려동물 급수기 자동",
    cat: "pet",
    brand: "b-06",
    price: 32900,
    cost: 20500,
    velocity: 0.9,
    desc: "순환 필터 급수기.",
  },
  // baby
  {
    name: "아기 물티슈 프리미엄 70매",
    cat: "baby",
    brand: "b-07",
    price: 2900,
    cost: 1800,
    repeat: 20,
    bundles: [1, 10, 20],
    velocity: 25,
    delivery: "fast",
    desc: "무향·무형광 아기 물티슈.",
  },
  {
    name: "기저귀 밴드형 M 4팩",
    cat: "baby",
    brand: "b-07",
    price: 42900,
    cost: 30500,
    repeat: 21,
    velocity: 9,
    delivery: "fast",
    desc: "통기성 좋은 밴드형 기저귀.",
  },
  {
    name: "분유 3단계 800g",
    cat: "baby",
    brand: "b-07",
    price: 29900,
    cost: 21800,
    repeat: 15,
    velocity: 7,
    desc: "성장기 맞춤 분유.",
  },
  {
    name: "아기 세탁세제 1.8L",
    cat: "baby",
    brand: "b-07",
    price: 13900,
    cost: 8600,
    repeat: 40,
    velocity: 5,
    desc: "저자극 아기 전용 세제.",
  },
  {
    name: "이유식 큐브 12종",
    cat: "baby",
    brand: "b-07",
    price: 24900,
    cost: 16500,
    repeat: 14,
    delivery: "fast",
    velocity: 4,
    desc: "냉동 이유식 큐브 세트.",
  },
  {
    name: "아기 욕조 접이식",
    cat: "baby",
    brand: "b-07",
    price: 34900,
    cost: 21000,
    velocity: 0.8,
    desc: "공간 절약형 접이식 욕조.",
  },
  // health
  {
    name: "종합비타민 90정",
    cat: "health",
    brand: "b-08",
    price: 21900,
    cost: 12500,
    repeat: 90,
    velocity: 5,
    desc: "하루 한 알 종합비타민.",
  },
  {
    name: "KF94 마스크 50매",
    cat: "health",
    brand: "b-03",
    price: 14900,
    cost: 8200,
    repeat: 45,
    bundles: [1, 2],
    velocity: 9,
    delivery: "fast",
    desc: "국내 생산 KF94 마스크.",
  },
  {
    name: "오메가3 60캡슐",
    cat: "health",
    brand: "b-08",
    price: 18900,
    cost: 10900,
    repeat: 60,
    velocity: 4,
    desc: "rTG 오메가3.",
  },
  {
    name: "손소독제 500ml",
    cat: "health",
    brand: "b-03",
    price: 6900,
    cost: 3900,
    repeat: 60,
    bundles: [1, 2],
    velocity: 4,
    desc: "펌프형 손소독제.",
  },
  {
    name: "유산균 30포",
    cat: "health",
    brand: "b-08",
    price: 24900,
    cost: 14500,
    repeat: 30,
    velocity: 6,
    desc: "19종 혼합 유산균.",
  },
  {
    name: "체온계 비접촉식",
    cat: "health",
    brand: "b-05",
    price: 29900,
    cost: 18200,
    velocity: 0.7,
    desc: "1초 측정 비접촉 체온계.",
  },
  {
    name: "구강청결제 1L",
    cat: "health",
    brand: "b-03",
    price: 8900,
    cost: 5200,
    repeat: 45,
    bundles: [1, 2],
    velocity: 5,
    desc: "저자극 무알코올 구강청결제.",
  },
  {
    name: "온열 안대 10매",
    cat: "health",
    brand: "b-08",
    price: 9900,
    cost: 5600,
    repeat: 30,
    velocity: 3,
    desc: "일회용 온열 안대.",
  },
];

const SUPPLIER_SEEDS: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "source">[] = [
  {
    name: "한빛생활유통",
    contact: "박정우",
    contractStatus: "active",
    categories: ["living", "kitchen", "baby"],
    leadTimeDays: 5,
    onTimeRate: 0.93,
    fillRate: 0.97,
    defectRate: 0.006,
    riskLevel: "low",
  },
  {
    name: "동아위생산업",
    contact: "이수민",
    contractStatus: "active",
    categories: ["living", "health", "baby"],
    leadTimeDays: 3,
    onTimeRate: 0.96,
    fillRate: 0.95,
    defectRate: 0.008,
    riskLevel: "low",
    note: "긴급 대응 가능, 단가 3~5% 높음",
  },
  {
    name: "케이푸드물류",
    contact: "최다은",
    contractStatus: "active",
    categories: ["food"],
    leadTimeDays: 2,
    onTimeRate: 0.91,
    fillRate: 0.98,
    defectRate: 0.004,
    riskLevel: "low",
  },
  {
    name: "청정수원",
    contact: "김민재",
    contractStatus: "active",
    categories: ["food"],
    leadTimeDays: 4,
    onTimeRate: 0.88,
    fillRate: 0.96,
    defectRate: 0.003,
    riskLevel: "mid",
  },
  {
    name: "그린키친코리아",
    contact: "정하늘",
    contractStatus: "active",
    categories: ["kitchen"],
    leadTimeDays: 7,
    onTimeRate: 0.78,
    fillRate: 0.9,
    defectRate: 0.012,
    riskLevel: "high",
    note: "최근 2회 납기지연",
  },
  {
    name: "리빙앤홈",
    contact: "오세훈",
    contractStatus: "active",
    categories: ["home", "kitchen"],
    leadTimeDays: 6,
    onTimeRate: 0.9,
    fillRate: 0.94,
    defectRate: 0.01,
    riskLevel: "mid",
  },
  {
    name: "루미전자유통",
    contact: "한지원",
    contractStatus: "active",
    categories: ["digital", "health"],
    leadTimeDays: 8,
    onTimeRate: 0.85,
    fillRate: 0.92,
    defectRate: 0.018,
    riskLevel: "mid",
  },
  {
    name: "펫케어서플라이",
    contact: "윤서준",
    contractStatus: "active",
    categories: ["pet"],
    leadTimeDays: 4,
    onTimeRate: 0.94,
    fillRate: 0.97,
    defectRate: 0.005,
    riskLevel: "low",
  },
  {
    name: "베이비퍼스트",
    contact: "장예린",
    contractStatus: "active",
    categories: ["baby"],
    leadTimeDays: 5,
    onTimeRate: 0.92,
    fillRate: 0.96,
    defectRate: 0.007,
    riskLevel: "low",
  },
  {
    name: "헬스앤라이프",
    contact: "송지호",
    contractStatus: "review",
    categories: ["health"],
    leadTimeDays: 6,
    onTimeRate: 0.87,
    fillRate: 0.93,
    defectRate: 0.009,
    riskLevel: "mid",
    note: "계약 갱신 검토 중",
  },
  {
    name: "노르딕임포트",
    contact: "배수아",
    contractStatus: "active",
    categories: ["home", "kitchen", "food"],
    leadTimeDays: 12,
    onTimeRate: 0.82,
    fillRate: 0.9,
    defectRate: 0.011,
    riskLevel: "mid",
    note: "수입 리드타임 김",
  },
];

// 작업 인원: C구역은 정원 2명 중 1명 결원 (시나리오 D — 데이터에서 병목이 드러나야 한다)
const WAREHOUSES: Warehouse[] = [
  { id: "wh-A", name: "A구역 (생활·위생)", congestion: 0, staff: 3, staffPlanned: 3 },
  { id: "wh-B", name: "B구역 (식품·냉장)", congestion: 0, staff: 3, staffPlanned: 3 },
  { id: "wh-C", name: "C구역 (주방·리빙)", congestion: 0, staff: 1, staffPlanned: 2 },
  { id: "wh-D", name: "D구역 (반려·유아)", congestion: 0, staff: 2, staffPlanned: 2 },
  { id: "wh-E", name: "E구역 (디지털·건강)", congestion: 0, staff: 2, staffPlanned: 2 },
];

const CAT_WH: Record<CategorySlug, string> = {
  living: "wh-A",
  health: "wh-E",
  food: "wh-B",
  kitchen: "wh-C",
  home: "wh-C",
  digital: "wh-E",
  pet: "wh-D",
  baby: "wh-D",
};

const CUSTOMER_NAMES = [
  "김서연",
  "이준호",
  "박지민",
  "최유진",
  "정민수",
  "강하은",
  "조현우",
  "윤지아",
  "임도윤",
  "한소율",
  "오태양",
  "신수빈",
  "권민재",
  "황예은",
  "송하람",
  "안지호",
  "문채원",
  "배시우",
  "홍다인",
  "류건우",
  "노아인",
  "전서윤",
  "백지훈",
  "서예준",
];

const DISTRICTS = [
  "서울 마포구",
  "서울 송파구",
  "경기 성남시 분당구",
  "경기 고양시 일산동구",
  "인천 연수구",
  "서울 강서구",
  "경기 용인시 수지구",
  "서울 노원구",
  "부산 해운대구",
  "대전 유성구",
];

// ---------- generator ----------
export function generateDemoData(now = new Date(), opts: { ledgerOnly?: boolean } = {}): DemoData {
  // 호출마다 같은 시드로 다시 시작 — "시연 초기화"를 눌러도 처음과 같은 데이터가 나온다
  rnd = mulberry32(SEED);
  const nowIso = iso(now);
  const base = { createdAt: nowIso, updatedAt: nowIso, source: "demo" as const };

  const suppliers: Supplier[] = SUPPLIER_SEEDS.map((s, i) => ({
    ...base,
    id: `sup-${String(i + 1).padStart(2, "0")}`,
    ...s,
  }));
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
      bulky: isBulky(p),
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
        const share =
          bundles.length === 1 ? 1 : b === 1 ? 0.45 : b === bundles[bundles.length - 1] ? 0.35 : 0.2;
        const v = (p.velocity * share) / options.length;
        velocityBySku.set(sid, v);

        // supplier products: primary + 1~2 alternates
        supplierProducts.push({
          supplierId: primary.id,
          skuId: sid,
          unitCost: cost,
          moq,
          leadTimeDays: primary.leadTimeDays,
        });
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
          today: 0,
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
    order7d: 213,
    orderPrev7d: 129,
    search7d: 1240,
    searchPrev7d: 760,
    view7d: 2310,
    viewPrev7d: 1380,
    cart7d: 402,
    cartPrev7d: 236,
  });

  // Scenario B — 주방세제 리필 2L 단품: 공급사 납기지연
  const skuB = findSku("주방세제 리필 2L", 1);
  const supGreen = suppliers.find((s) => s.name === "그린키친코리아")!;
  skuB.primarySupplierId = supGreen.id;
  supplierProducts
    .filter((sp) => sp.skuId === skuB.id)
    .forEach((sp, i) => {
      if (i === 0) {
        sp.supplierId = supGreen.id;
        sp.leadTimeDays = 7;
      }
    });
  // ensure alt supplier 한빛생활유통 exists for skuB
  const supHanbit = suppliers.find((s) => s.name === "한빛생활유통")!;
  if (!supplierProducts.some((sp) => sp.skuId === skuB.id && sp.supplierId === supHanbit.id)) {
    supplierProducts.push({
      supplierId: supHanbit.id,
      skuId: skuB.id,
      unitCost: Math.round(skuB.cost * 1.03),
      moq: 40,
      leadTimeDays: 5,
    });
  }
  velocityBySku.set(skuB.id, 8);
  setInv(skuB.id, { onHand: 54, reserved: 6, inboundExpected: 240, inboundEta: dayStr(addDays(now, 9)) });
  setDemand(skuB.id, {
    dailySales: [7, 8, 8, 9, 7, 8, 9, 8, 9, 8, 9, 10, 9, 10],
    order7d: 63,
    orderPrev7d: 56,
  });

  // Scenario C — 무선 미니가습기: 저회전·마진주의
  const skuC = findSku("무선 미니가습기", 1);
  velocityBySku.set(skuC.id, 0.4);
  setInv(skuC.id, { onHand: 186, reserved: 1, inboundExpected: 0 });
  setDemand(skuC.id, {
    dailySales: [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
    order7d: 2,
    orderPrev7d: 3,
    search7d: 28,
    searchPrev7d: 41,
    view7d: 90,
    viewPrev7d: 130,
    cart7d: 6,
    cartPrev7d: 9,
  });

  // Supporting: a few more at-risk / overstock SKUs for realistic radar
  const skuWater = findSku("생수 2L 12병", 1);
  setInv(skuWater.id, {
    onHand: 140,
    reserved: 30,
    inboundExpected: 600,
    inboundEta: dayStr(addDays(now, 2)),
  });
  const skuPad = findSku("반려동물 배변패드 50매", 2);
  setInv(skuPad.id, { onHand: 40, reserved: 8 });
  velocityBySku.set(skuPad.id, 7);
  const skuDiaper = findSku("기저귀 밴드형 M 4팩", 1);
  setInv(skuDiaper.id, {
    onHand: 22,
    reserved: 5,
    inboundExpected: 120,
    inboundEta: dayStr(addDays(now, 3)),
  });
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
    address: {
      label: i === 0 ? "집" : pick(["집", "회사"]),
      line1: `${DISTRICTS[i % DISTRICTS.length]} ${pick(["행복로", "중앙대로", "테크노로", "하늘길"])} ${ri(10, 200)}`,
      line2: `${ri(101, 1504)}호`,
      zip: String(ri(10000, 63000)).padStart(5, "0"),
    },
    joinedAt: iso(addDays(now, -ri(60, 700))),
  }));

  // ---------- 공용 조회 ----------
  const productById = new Map(products.map((p) => [p.id, p]));
  const bulkyOf = (pid: string) => !!productById.get(pid)?.bulky;
  const whOf = (pid: string) => CAT_WH[productById.get(pid)!.categorySlug];
  const customerBase = generateCustomerBase(customers, now);

  // 시나리오가 정한 "가용재고" — 예약재고를 실제 미출고 주문으로 다시 계산한 뒤 보유재고를 맞춘다
  const intendedAvailable = new Map(inventory.map((i) => [i.skuId, Math.max(0, i.onHand - i.reserved)]));
  const forcedEmpty = new Set([skuMask.id]); // 품절 — 내일 입고 (시나리오)

  // ---------- promotions (기간·대상) ----------
  const promoDefs: {
    id: string;
    name: string;
    skuIds: string[];
    segment: string;
    rate: number;
    start: number;
    end: number;
  }[] = [
    {
      id: "promo-01",
      name: "가을맞이 생활필수품 기획전",
      skuIds: [
        findSku("프리미엄 물티슈 100매", 10).id,
        findSku("액상 세탁세제 3L", 1).id,
        findSku("3겹 롤화장지 30롤", 1).id,
      ],
      segment: "전체",
      rate: 0.1,
      start: -12,
      end: 2,
    },
    {
      id: "promo-02",
      name: "반려 가족 재구매 감사전",
      skuIds: [skuPad.id, findSku("고양이 모래 벤토나이트 10kg", 1).id],
      segment: "반복상품 구매주기 도래",
      rate: 0.12,
      start: -7,
      end: 7,
    },
    {
      id: "promo-03",
      name: "미니가전 재고 정리",
      skuIds: [skuC.id, skuHeat.id],
      segment: "카테고리 충성고객",
      rate: 0.25,
      start: -20,
      end: -3,
    },
    {
      id: "promo-05",
      name: "생수·즉석밥 복귀 쿠폰",
      skuIds: [skuWater.id, findSku("즉석 흰밥 210g 12개", 1).id],
      segment: "장바구니 이탈",
      rate: 0.05,
      start: -14,
      end: 0,
    },
    {
      id: "promo-06",
      name: "유아용품 정기 특가",
      skuIds: [skuDiaper.id, findSku("아기 물티슈 프리미엄 70매", 10).id],
      segment: "카테고리 충성고객",
      rate: 0.1,
      start: -40,
      end: -25,
    },
    {
      id: "promo-07",
      name: "주방 새단장 위크",
      skuIds: [findSku("실리콘 밀폐용기 6종", 1).id, findSku("세라믹 프라이팬 28cm", 1).id],
      segment: "전체",
      rate: 0.15,
      start: 3,
      end: 10,
    },
  ];
  const promoRateToday = (skuId: string) => {
    const pr = promoDefs.find((x) => x.skuIds.includes(skuId) && x.start <= 0 && x.end >= 0);
    return pr ? { id: pr.id, rate: pr.rate } : null;
  };

  // ---------- orders: 시나리오 고객(김서연) 이력 ----------
  const orders: Order[] = [];
  const staff = ["박운영", "이물류", "최피킹", "정포장"];
  let orderSeq = 1;
  const itemOf = (sku: SKU, qty = 1): OrderItem => {
    const p = productById.get(sku.productId)!;
    return {
      skuId: sku.id,
      productId: p.id,
      name: p.name,
      skuName: sku.name,
      qty,
      unitPrice: sku.salePrice,
      unitCost: sku.cost,
    };
  };
  const pricing = (items: OrderItem[], business: boolean) => {
    const subtotal = items.reduce((a, it) => a + it.unitPrice * it.qty, 0);
    let discount = 0;
    let promotionId: string | undefined;
    items.forEach((it) => {
      const pr = promoRateToday(it.skuId);
      if (pr) {
        discount += Math.round(it.unitPrice * it.qty * pr.rate);
        promotionId ??= pr.id;
      }
    });
    if (business) discount += Math.round(subtotal * 0.06);
    const shippingFee =
      business || subtotal - discount >= DEFAULT_COST_MODEL.freeShippingThreshold
        ? 0
        : DEFAULT_COST_MODEL.shippingFee;
    return { subtotal, discount, shippingFee, total: subtotal - discount + shippingFee, promotionId };
  };
  const promiseFor = (items: OrderItem[], cutoff: Date) => {
    const allFast = items.every((it) => productById.get(it.productId)!.deliveryType === "fast");
    const t = addDays(cutoff, allFast ? 1 : 3);
    t.setHours(21, 0, 0, 0);
    return t;
  };
  const me = customers[0];
  const history = (o: { createdAt: Date; stage: OrderStage }) => {
    const seq: OrderStage[] = [
      "new",
      "confirmed",
      "picking",
      "ship_wait",
      "shipped",
      "in_transit",
      "delivered",
    ];
    const upto = seq.indexOf(o.stage);
    return seq.slice(0, upto + 1).map((st, i) => ({
      at: iso(addHours(o.createdAt, [0, 0.2, 14, 17, 18, 24, 40][i])),
      stage: st,
      actor: i === 0 ? "고객" : pick(staff),
    }));
  };
  const scripted = (items: OrderItem[], daysAgo: number, stage: OrderStage) => {
    const createdAt = addHours(addDays(now, -daysAgo), -3);
    const price = pricing(items, false);
    const cutoff = cutoffForCreated(createdAt);
    const h = history({ createdAt, stage });
    orders.push({
      ...base,
      id: `NX${dayStr(createdAt).replace(/-/g, "").slice(2)}-${String(orderSeq++).padStart(4, "0")}`,
      createdAt: iso(createdAt),
      updatedAt: h[h.length - 1].at,
      customerId: me.id,
      items,
      ...price,
      promotionId: undefined,
      discount: 0,
      total: price.subtotal + price.shippingFee,
      stage,
      warehouseId: whOf(items[0].productId),
      promisedAt: iso(promiseFor(items, cutoff)),
      cutoffAt: iso(cutoff),
      history: h,
      channel: "app",
      isRepeatOrder: daysAgo < 40,
    });
  };
  const skuWipe10 = findSku("프리미엄 물티슈 100매", 10);
  const skuDet = findSku("액상 세탁세제 3L", 1);
  const skuPad1 = findSku("반려동물 배변패드 50매", 1);
  const skuKit2 = findSku("주방세제 리필 2L", 2);
  const skuYog = findSku("그릭요거트 100g 6개", 1);
  scripted([itemOf(skuDet, 1)], 71, "delivered");
  scripted([itemOf(skuWipe10, 1), itemOf(skuWater, 1)], 44, "delivered");
  scripted([itemOf(skuPad1, 2)], 41, "delivered");
  scripted([itemOf(skuDet, 1), itemOf(skuKit2, 1)], 36, "delivered");
  scripted([itemOf(skuWipe10, 1), itemOf(skuPad1, 2)], 23, "delivered");
  scripted([itemOf(skuWater, 2), itemOf(skuYog, 1)], 15, "delivered");
  scripted([itemOf(findSku("드립 커피 40개입", 1), 1)], 2, "in_transit");

  // ---------- orders: 오늘 출고 파이프라인 ----------
  // 다음 출고마감 기준 28시간 전부터 지금까지 들어온 주문을, 구역별 인원·작업시간으로 처리해 본 상태로 만든다.
  const nextCut = cutoffOnOrAfter(now);
  const windowStart = new Date(nextCut.getTime() - 28 * 3600000);
  const ORDERS_PER_DAY = 270;
  const meanHourW = HOUR_WEIGHTS.reduce((a, c) => a + c, 0) / 24;
  const skuVel = skus.map((s) => velocityBySku.get(s.id) ?? 0);
  const consumerPool = customerBase.filter((c) => !c.scripted && c.kind === "consumer");
  const businessPool = customerBase.filter((c) => c.kind === "business");
  const sampleConsumer = makeSampler(
    consumerPool.map((c) => (c.archetype === "loyal" ? 2 : c.archetype === "regular" ? 1.4 : 1)),
  );
  const pickSkuIdx = (exclude: Set<number>, cats?: string[]) => {
    const w = skuVel.map((v, i) =>
      exclude.has(i) || (cats && !cats.includes(productById.get(skus[i].productId)!.categorySlug)) ? 0 : v,
    );
    let total = 0;
    for (const x of w) total += x;
    let r = rnd() * total;
    for (let i = 0; i < w.length; i++) {
      r -= w[i];
      if (r <= 0) return i;
    }
    return w.length - 1;
  };
  type Draft = { createdAt: Date; customer: LedgerCustomer; items: OrderItem[]; big?: boolean };
  const drafts: Draft[] = [];
  for (let t = windowStart.getTime(); t < now.getTime(); t += 3600000) {
    const hour = new Date(t).getHours();
    const expected = (ORDERS_PER_DAY * HOUR_WEIGHTS[hour]) / (meanHourW * 24);
    const n = Math.max(0, Math.round(expected * rf(0.7, 1.3)));
    for (let k = 0; k < n; k++) {
      const createdAt = new Date(Math.min(now.getTime() - 60000, t + rnd() * 3600000));
      const business = rnd() < 0.02;
      const customer = business ? pick(businessPool) : consumerPool[sampleConsumer(rnd())];
      const cats = business ? ["living", "food", "kitchen", "health", "baby"] : undefined;
      const used = new Set<number>();
      const lines = 1 + (rnd() < 0.45 ? (rnd() < 0.35 ? 2 : 1) : 0);
      const items: OrderItem[] = [];
      for (let l = 0; l < lines; l++) {
        const i = pickSkuIdx(used, cats);
        used.add(i);
        items.push(itemOf(skus[i], business ? ri(6, 18) : rnd() < 0.82 ? 1 : 2));
      }
      drafts.push({ createdAt, customer, items });
    }
  }
  // 대형주문: 공유오피스 탕비실 일괄 구매 — C구역(주방) 작업량을 크게 차지한다
  const bigBuyer = businessPool.find((c) => c.name.startsWith("온누리공유오피스"))!;
  drafts.push({
    createdAt: new Date(Math.max(nextCut.getTime() - 24 * 3600000 + 40 * 60000, now.getTime() - 150 * 60000)),
    customer: bigBuyer,
    items: [
      itemOf(findSku("위생 지퍼백 대형 50매", 1), 40),
      itemOf(findSku("실리콘 밀폐용기 6종", 1), 16),
      itemOf(findSku("주방세제 리필 2L", 1), 30),
      itemOf(findSku("친환경 종이호일 30m", 1), 20),
    ],
    big: true,
  });
  drafts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // 구역별 처리 시뮬레이션 (출고 엔진과 같은 모델)
  const shipStateOf = new Map<Draft, { start: Date | null; finish: Date | null }>();
  WAREHOUSES.forEach((w) => {
    let cursor = windowStart;
    drafts
      .filter((d) => whOf(d.items[0].productId) === w.id)
      .forEach((d) => {
        if (d.items.some((it) => forcedEmpty.has(it.skuId))) {
          shipStateOf.set(d, { start: null, finish: null }); // 재고 없음 — 작업 시작 안 함
          return;
        }
        const ready = new Date(d.createdAt.getTime() + 10 * 60000);
        const start = toShift(new Date(Math.max(cursor.getTime(), ready.getTime())));
        const finish = finishAfterWork(start, workMinutes(d.items, bulkyOf), w.staff);
        cursor = finish;
        shipStateOf.set(d, { start, finish });
      });
  });
  drafts.forEach((d) => {
    const { start, finish } = shipStateOf.get(d)!;
    const cutoff = cutoffForCreated(d.createdAt);
    const ageMin = (now.getTime() - d.createdAt.getTime()) / 60000;
    const who = pick(staff);
    const h: Order["history"] = [{ at: iso(d.createdAt), stage: "new", actor: "고객" }];
    let stage: OrderStage;
    if (ageMin > 8)
      h.push({ at: iso(new Date(d.createdAt.getTime() + 6 * 60000)), stage: "confirmed", actor: "시스템" });
    if (!start || !finish || start > now) {
      stage = ageMin <= 8 ? "new" : ageMin < 50 ? "confirmed" : "picking_wait";
      if (stage === "picking_wait")
        h.push({
          at: iso(new Date(d.createdAt.getTime() + 30 * 60000)),
          stage: "picking_wait",
          actor: "시스템",
        });
    } else if (finish > now) {
      const done = (now.getTime() - start.getTime()) / (finish.getTime() - start.getTime());
      h.push({ at: iso(start), stage: "picking", actor: who });
      stage = "picking";
      if (done >= 0.6) {
        h.push({
          at: iso(new Date(start.getTime() + 0.6 * (finish.getTime() - start.getTime()))),
          stage: "packing_wait",
          actor: who,
        });
        stage = "packing_wait";
      }
    } else {
      h.push({ at: iso(start), stage: "picking", actor: who });
      h.push({ at: iso(finish), stage: "ship_wait", actor: who });
      const shipAt = cutoffOnOrAfter(finish);
      if (shipAt <= now) {
        h.push({ at: iso(shipAt), stage: "shipped", actor: "택배 집하" });
        stage = "shipped";
        if (now.getTime() - shipAt.getTime() > 6 * 3600000) {
          h.push({ at: iso(addHours(shipAt, 6)), stage: "in_transit", actor: "택배" });
          stage = "in_transit";
        }
      } else stage = "ship_wait";
    }
    const business = d.customer.kind === "business";
    const price = pricing(d.items, business);
    orders.push({
      ...base,
      id: `NX${dayStr(d.createdAt).replace(/-/g, "").slice(2)}-${String(orderSeq++).padStart(4, "0")}`,
      createdAt: iso(d.createdAt),
      updatedAt: h[h.length - 1].at,
      customerId: d.customer.id,
      items: d.items,
      ...price,
      stage,
      warehouseId: whOf(d.items[0].productId),
      promisedAt: iso(promiseFor(d.items, cutoff)),
      cutoffAt: iso(cutoff),
      assignee: h.length > 2 ? who : undefined,
      history: h,
      channel: d.customer.channel as Channel,
      isRepeatOrder: d.customer.archetype !== "light" && rnd() < 0.55,
    });
  });
  orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // ---------- 재고: 예약재고 = 미출고 주문 수량 ----------
  const PRE: OrderStage[] = ["new", "confirmed", "picking_wait", "picking", "packing_wait", "ship_wait"];
  const reservedBy = new Map<string, number>();
  orders
    .filter((o) => PRE.includes(o.stage))
    .forEach((o) =>
      o.items.forEach((it) => reservedBy.set(it.skuId, (reservedBy.get(it.skuId) ?? 0) + it.qty)),
    );
  inventory.forEach((inv) => {
    inv.reserved = reservedBy.get(inv.skuId) ?? 0;
    inv.onHand = forcedEmpty.has(inv.skuId) ? 0 : inv.reserved + (intendedAvailable.get(inv.skuId) ?? 0);
  });

  // ---------- 수요신호: 오늘 접수 수량 · 어제 분 맞춤 ----------
  const todayKey = dayStr(now);
  const yesterdayKey = dayStr(addDays(now, -1));
  const unitsOn = (key: string) => {
    const m = new Map<string, number>();
    orders
      .filter((o) => o.customerId !== me.id && dayStr(new Date(o.createdAt)) === key)
      .forEach((o) => o.items.forEach((it) => m.set(it.skuId, (m.get(it.skuId) ?? 0) + it.qty)));
    return m;
  };
  const todayUnits = unitsOn(todayKey);
  const yesterdayUnits = unitsOn(yesterdayKey);
  demand.forEach((d) => {
    d.today = todayUnits.get(d.skuId) ?? 0;
    const y = yesterdayUnits.get(d.skuId) ?? 0;
    if (d.dailySales[13] < y) d.dailySales[13] = y;
    d.order7d = d.dailySales.slice(7).reduce((a, c) => a + c, 0);
    d.orderPrev7d = d.dailySales.slice(0, 7).reduce((a, c) => a + c, 0);
  });

  // ---------- 90일 주문 원장 ----------
  const DAYS = 89;
  const skuIdx = new Map(skus.map((s, i) => [s.id, i]));
  const units: number[][] = skus.map((s) => {
    const d = demand.find((x) => x.skuId === s.id)!;
    const arr = new Array<number>(DAYS + 1).fill(0);
    for (let dd = 1; dd <= 14; dd++)
      arr[dd] = Math.max(0, d.dailySales[14 - dd] - (dd === 1 ? (yesterdayUnits.get(s.id) ?? 0) : 0));
    const baseV = d.dailySales.slice(0, 7).reduce((a, c) => a + c, 0) / 7;
    for (let dd = 15; dd <= DAYS; dd++) {
      const dow = addDays(now, -dd).getDay();
      const f = (dow === 0 || dow === 6 ? 1.15 : 0.95) * (1 - 0.0025 * (dd - 14));
      arr[dd] = Math.max(0, Math.round(baseV * f * rf(0.65, 1.35)));
    }
    return arr;
  });
  const ledger: Ledger = generateLedger({
    now,
    days: DAYS,
    products,
    skus,
    suppliers,
    supplierProducts,
    customers: customerBase,
    unitsFor: (skuId, d) => units[skuIdx.get(skuId)!]?.[d] ?? 0,
    promotions: promoDefs.map((p) => ({
      id: p.id,
      skuIds: p.skuIds,
      startsDaysAgo: -p.start,
      endsDaysAgo: -p.end,
      rate: p.rate,
    })),
    warehouseOf: (cat) => CAT_WH[cat],
    bulkyOf,
    scenario: {
      defectSupplierId: supGreen.id,
      contentProductId: products.find((p) => p.name === "무선 물걸레 청소포 40매")!.id,
      pickingWarehouseId: "wh-C",
      slowWarehouseId: "wh-C",
    },
  });
  rememberLedger(nowIso, ledger);
  if (opts.ledgerOnly) return { generatedAt: nowIso } as DemoData; // 원장만 필요할 때 (getLedger)

  // ---------- 일별·카테고리 매출 = 원장 + 저장 주문 ----------
  const econOf = (o: {
    channel?: Channel;
    items?: OrderItem[];
    lines?: OrderItem[] | Ledger["orders"][number]["lines"];
    discount: number;
    shippingFee: number;
  }) =>
    orderEconomics(
      {
        channel: o.channel ?? "app",
        lines: (o.items ?? o.lines)!,
        discount: o.discount,
        shippingFee: o.shippingFee,
      },
      bulkyOf,
    );
  const byDay = new Map<string, DailySalesPoint>();
  const bump = (key: string, e: ReturnType<typeof econOf>) => {
    const p = byDay.get(key) ?? {
      date: key,
      orders: 0,
      revenue: 0,
      grossMargin: 0,
      discount: 0,
      shippingCost: 0,
      returns: 0,
      cogs: 0,
    };
    p.orders += 1;
    p.revenue += e.net;
    p.discount += e.discount;
    p.cogs = (p.cogs ?? 0) + e.cogs;
    p.shippingCost += e.shipCost - e.shippingFee;
    p.grossMargin += e.net - e.cogs - (e.shipCost - e.shippingFee);
    byDay.set(key, p);
  };
  ledger.orders.forEach((o) => bump(dayStr(new Date(o.createdAt)), econOf(o)));
  orders.forEach((o) => bump(dayStr(new Date(o.createdAt)), econOf(o)));
  ledger.orders.forEach((o) => {
    if (!o.returned) return;
    const k = dayStr(new Date(o.returned.at));
    const p = byDay.get(k);
    if (p) p.returns += 1;
  });
  const dailySales: DailySalesPoint[] = [];
  for (let d = DAYS; d >= 0; d--) {
    const key = dayStr(addDays(now, -d));
    dailySales.push(
      byDay.get(key) ?? {
        date: key,
        orders: 0,
        revenue: 0,
        grossMargin: 0,
        discount: 0,
        shippingCost: 0,
        returns: 0,
        cogs: 0,
      },
    );
  }
  const catAgg = new Map<CategorySlug, CategorySales>();
  const addCat = (
    lines: { productId: string; qty: number; unitPrice: number; unitCost: number }[],
    discount: number,
    subtotal: number,
  ) => {
    const seen = new Set<CategorySlug>();
    lines.forEach((l) => {
      const cat = productById.get(l.productId)!.categorySlug;
      const share = subtotal > 0 ? (l.unitPrice * l.qty) / subtotal : 0;
      const rev = l.unitPrice * l.qty - discount * share;
      const c = catAgg.get(cat) ?? { categorySlug: cat, revenue: 0, orders: 0, margin: 0 };
      c.revenue += rev;
      c.margin += rev - l.unitCost * l.qty;
      if (!seen.has(cat)) c.orders += 1;
      seen.add(cat);
      catAgg.set(cat, c);
    });
  };
  ledger.orders.filter((o) => o.day <= 30).forEach((o) => addCat(o.lines, o.discount, o.subtotal));
  orders.forEach((o) => addCat(o.items, o.discount, o.subtotal));
  const categorySales: CategorySales[] = CATEGORIES.map(
    (c) => catAgg.get(c.slug) ?? { categorySlug: c.slug, revenue: 0, orders: 0, margin: 0 },
  ).map((c) => ({ ...c, revenue: Math.round(c.revenue), margin: Math.round(c.margin) }));

  // ---------- 반품 (최근 14일은 처리 대상으로 저장, 그 이전은 원장에서 분석) ----------
  const returns: ReturnRequest[] = ledger.orders
    .filter((o) => o.returned && o.returned.daysAgo <= 14)
    .map((o, i) => {
      const r = o.returned!;
      const sku = skus[skuIdx.get(r.skuId)!];
      const status: ReturnRequest["status"] =
        r.daysAgo <= 1 ? "requested" : r.daysAgo <= 3 ? "approved" : r.daysAgo <= 6 ? "received" : "refunded";
      return {
        ...base,
        id: `RT-${String(i + 1).padStart(4, "0")}`,
        createdAt: r.at,
        updatedAt: r.at,
        orderId: o.id,
        skuId: r.skuId,
        reason: r.reason,
        status,
        supplierId: sku.primarySupplierId,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // ---------- 진행 중인 발주 ----------
  const poNo = (n: number, created: Date) => `PO-${dayStr(created).slice(2, 7).replace("-", "")}-0${n}`;
  const openPo = (
    n: number,
    supplierId: string,
    sku: SKU,
    qty: number,
    status: PurchaseOrder["status"],
    orderedDaysAgo: number,
    etaDays: number,
  ): PurchaseOrder => {
    const created = addDays(now, -orderedDaysAgo);
    return {
      ...base,
      id: poNo(n, created),
      createdAt: iso(created),
      updatedAt: iso(created),
      supplierId,
      skuId: sku.id,
      qty,
      unitCost:
        supplierProducts.find((sp) => sp.skuId === sku.id && sp.supplierId === supplierId)?.unitCost ??
        sku.cost,
      status,
      expectedAt: dayStr(addDays(now, etaDays)),
      actor: "구매담당 김구매",
    };
  };
  const supByName = (n: string) => suppliers.find((s) => s.name === n)!;
  const purchaseOrders: PurchaseOrder[] = [
    // 원래 예정일(발주 +7일)보다 4일 늦게 통보된 입고 — 시나리오 B
    { ...openPo(18, supGreen.id, skuB, 240, "in_transit", 6, 9), note: "원 예정일 대비 +4일 지연 통보" },
    openPo(17, supByName("청정수원").id, skuWater, 600, "confirmed", 2, 2),
    openPo(16, supByName("베이비퍼스트").id, skuDiaper, 120, "in_transit", 3, 3),
    openPo(15, supByName("동아위생산업").id, skuMask, 300, "in_transit", 2, 1),
  ];
  inventory.forEach((inv) => {
    const open = purchaseOrders.filter((po) => po.skuId === inv.skuId);
    inv.inboundExpected = open.reduce((a, po) => a + po.qty, 0);
    inv.inboundEta = open.map((po) => po.expectedAt).sort()[0];
  });

  // ---------- 프로모션 성과 = 원장 집계 ----------
  const promotions: Promotion[] = promoDefs.map((pd) => {
    const hits = ledger.orders.filter((o) => o.promotionId === pd.id);
    const live = orders.filter((o) => o.promotionId === pd.id);
    const ordersN = hits.length + live.length;
    let revenue = 0;
    let discountCost = 0;
    let cogs = 0;
    let shippingCost = 0;
    let returnsN = 0;
    hits.forEach((o) => {
      const e = econOf(o);
      revenue += e.net;
      discountCost += e.discount;
      cogs += e.cogs;
      shippingCost += e.shipCost - e.shippingFee;
      if (o.returned) returnsN++;
    });
    live.forEach((o) => {
      const e = econOf(o);
      revenue += e.net;
      discountCost += e.discount;
      cogs += e.cogs;
      shippingCost += e.shipCost - e.shippingFee;
    });
    const carts = ordersN ? Math.round(ordersN / rf(0.38, 0.52)) : 0;
    const clicks = carts ? Math.round(carts / rf(0.2, 0.3)) : 0;
    const impressions = clicks ? Math.round(clicks / rf(0.045, 0.08)) : 0;
    return {
      ...base,
      id: pd.id,
      name: pd.name,
      startsAt: dayStr(addDays(now, pd.start)),
      endsAt: dayStr(addDays(now, pd.end)),
      skuIds: pd.skuIds,
      segment: pd.segment,
      discountRate: pd.rate,
      impressions,
      clicks,
      carts,
      orders: ordersN,
      revenue: Math.round(revenue),
      shippingCost: Math.round(shippingCost),
      discountCost: Math.round(discountCost),
      cogs: Math.round(cogs),
      returns: returnsN,
      status: pd.start > 0 ? "planned" : pd.end < 0 ? "ended" : "running",
    };
  });

  // ---------- 집계 ----------
  const allCustomerOrders = new Map<string, number>();
  ledger.orders.forEach((o) =>
    allCustomerOrders.set(o.customerId, (allCustomerOrders.get(o.customerId) ?? 0) + 1),
  );
  orders.forEach((o) => allCustomerOrders.set(o.customerId, (allCustomerOrders.get(o.customerId) ?? 0) + 1));
  const recent30 = new Set<string>();
  ledger.orders.filter((o) => o.day <= 30).forEach((o) => recent30.add(o.customerId));
  orders.forEach((o) => recent30.add(o.customerId));
  const customerCount = allCustomerOrders.size;
  const repeaters = Array.from(allCustomerOrders.values()).filter((n) => n >= 2).length;

  const data: DemoData = {
    generatedAt: nowIso,
    categories: CATEGORIES,
    brands: BRANDS,
    products,
    skus,
    suppliers,
    supplierProducts,
    warehouses: WAREHOUSES.map((w) => ({ ...w })),
    inventory,
    purchaseOrders,
    customers,
    demand,
    dailySales,
    categorySales,
    orders,
    returns,
    promotions,
    actions: [],
    evidence: [],
    notifications: [
      {
        ...base,
        id: "n-001",
        customerId: "c-001",
        title: "드립 커피 40개입 배송중",
        body: "주문하신 상품이 배송 중입니다. 내일 도착 예정입니다.",
        read: false,
      },
    ],
    aggregates: {
      customerCount,
      orderCount90d: dailySales.reduce((a, c) => a + c.orders, 0),
      returnCount90d: dailySales.reduce((a, c) => a + c.returns, 0),
      repeatCustomerRate: customerCount ? repeaters / customerCount : 0,
      // 방문·장바구니는 행동 로그 집계 (시연: 주문 고객 수 기준 전환율 가정)
      detailVisitors30d: Math.round(recent30.size / 0.094),
      cartEntrants30d: Math.round(recent30.size / 0.41),
      orderers30d: recent30.size,
    },
  };

  // 구역 부하 (생성 시점) — 화면은 출고 시뮬레이션으로 실시간 재계산
  const forecast = forecastShipments(data, now, { bulkyOf });
  data.warehouses = data.warehouses.map((w) => ({
    ...w,
    congestion:
      Math.round(Math.min(1.5, forecast.zones.find((z) => z.warehouse.id === w.id)?.utilization ?? 0) * 100) /
      100,
  }));

  // 시스템이 계산한 초기 실행 추천 + 근거 기록
  const seeded = buildSeedActions(data, ledger, now);
  data.actions = seeded.actions;
  data.evidence = seeded.evidence;
  data.baseline = opsSnapshot(data, ledger, now);
  return data;
}
