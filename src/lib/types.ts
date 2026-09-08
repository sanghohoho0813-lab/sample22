// NEXMART shared domain types — Customer Platform and Business AX share ONE store.

export type Provenance = "demo" | "live";

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: Provenance;
}

export type CategorySlug =
  | "food"
  | "living"
  | "kitchen"
  | "home"
  | "digital"
  | "pet"
  | "baby"
  | "health";

export interface Category {
  slug: CategorySlug;
  name: string;
  description: string;
  hue: number; // placeholder art hue until photos arrive
}

export interface Brand {
  id: string;
  name: string;
  origin: "국내" | "수입";
}

export type DeliveryType = "fast" | "standard" | "reserve";

export interface Product extends BaseRecord {
  name: string;
  categorySlug: CategorySlug;
  brandId: string;
  description: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  deliveryType: DeliveryType;
  isRepeatable: boolean; // 반복구매 성격 상품
  avgRepeatCycleDays?: number;
  imageKey?: string; // future asset mapping (NEXMART-PHOTO-xx)
  status: "active" | "paused";
}

export interface SKU extends BaseRecord {
  productId: string;
  name: string; // e.g. "20팩 / 4개 묶음"
  bundleQty: number;
  option?: string;
  listPrice: number;
  salePrice: number;
  cost: number;
  moq: number; // supplier min order qty (default)
  primarySupplierId: string;
}

export interface Supplier extends BaseRecord {
  name: string;
  contact: string;
  contractStatus: "active" | "review" | "paused";
  categories: CategorySlug[];
  leadTimeDays: number;
  onTimeRate: number; // 0-1
  fillRate: number; // 0-1
  defectRate: number; // 0-1
  riskLevel: "low" | "mid" | "high";
  note?: string;
}

export interface SupplierProduct {
  supplierId: string;
  skuId: string;
  unitCost: number;
  moq: number;
  leadTimeDays: number;
}

export interface Warehouse {
  id: string;
  name: string; // 물류구역 A~E
  congestion: number; // 0-1 피킹 적체
}

export interface Inventory {
  skuId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  inboundExpected: number;
  inboundEta?: string; // ISO date
  updatedAt: string;
}

export interface InventoryMovement extends BaseRecord {
  skuId: string;
  qty: number;
  type: "sale" | "inbound" | "adjust" | "return";
  refId?: string;
}

export type POStatus =
  | "draft"
  | "requested"
  | "confirmed"
  | "in_transit"
  | "received"
  | "cancelled";

export interface PurchaseOrder extends BaseRecord {
  supplierId: string;
  skuId: string;
  qty: number;
  unitCost: number;
  status: POStatus;
  expectedAt: string;
  receivedAt?: string;
  actionId?: string;
  actor: string;
}

export interface Customer extends BaseRecord {
  name: string;
  email: string;
  phone: string;
  address: { label: string; line1: string; line2?: string; zip: string };
  joinedAt: string;
  segmentHint?: string;
}

/** Aggregated demand signals per SKU (7d vs previous 7d). */
export interface DemandSignal {
  skuId: string;
  search7d: number;
  searchPrev7d: number;
  view7d: number;
  viewPrev7d: number;
  cart7d: number;
  cartPrev7d: number;
  order7d: number;
  orderPrev7d: number;
  /** last 14 days daily unit sales */
  dailySales: number[];
}

export interface DailySalesPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  revenue: number;
  grossMargin: number;
  discount: number;
  shippingCost: number;
  returns: number;
}

export interface CategorySales {
  categorySlug: CategorySlug;
  revenue: number;
  orders: number;
  margin: number;
}

export type OrderStage =
  | "new"
  | "confirmed"
  | "picking_wait"
  | "picking"
  | "packing_wait"
  | "ship_wait"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "return";

export interface OrderItem {
  skuId: string;
  productId: string;
  name: string;
  skuName: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
}

export interface OrderHistoryEntry {
  at: string;
  stage: OrderStage;
  actor: string;
  note?: string;
}

export interface Order extends BaseRecord {
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  stage: OrderStage;
  warehouseId: string;
  promisedAt: string; // delivery promise
  cutoffAt: string; // ship cutoff
  assignee?: string;
  history: OrderHistoryEntry[];
  isRepeatOrder?: boolean;
  promotionId?: string;
  riskFlag?: boolean;
  customerNotified?: boolean;
}

export interface ReturnRequest extends BaseRecord {
  orderId: string;
  skuId: string;
  reason:
    | "defect"
    | "damaged"
    | "wrong_item"
    | "delay"
    | "info_mismatch"
    | "missing"
    | "change_mind"
    | "other";
  status: "requested" | "approved" | "received" | "refunded" | "rejected";
  supplierId?: string;
}

export interface Promotion extends BaseRecord {
  name: string;
  startsAt: string;
  endsAt: string;
  skuIds: string[];
  segment: string;
  discountRate: number;
  impressions: number;
  clicks: number;
  carts: number;
  orders: number;
  revenue: number;
  shippingCost: number;
  discountCost: number;
  cogs: number;
  returns: number;
  status: "planned" | "running" | "ended";
}

export type ActionType =
  | "urgent_po"
  | "stop_po"
  | "alt_supplier"
  | "priority_order"
  | "delay_notice"
  | "repeat_expose"
  | "promo_adjust";

export type ActionStage =
  | "recommended"
  | "reviewing"
  | "approved"
  | "requested"
  | "in_progress"
  | "done"
  | "dismissed"
  | "held";

export type Urgency = "critical" | "high" | "mid" | "low";

export interface AXAction extends BaseRecord {
  type: ActionType;
  title: string;
  summary: string;
  trigger: string;
  reasons: string[];
  expectedImpact: string;
  caution?: string;
  urgency: Urgency;
  owner: RoleKey;
  assignee: string;
  recommendedAt: string;
  dueAt: string;
  stage: ActionStage;
  related: {
    productId?: string;
    skuId?: string;
    supplierId?: string;
    altSupplierId?: string;
    orderIds?: string[];
    customerIds?: string[];
    promotionId?: string;
    poId?: string;
  };
  proposal?: {
    qty?: number;
    supplierId?: string;
    note?: string;
  };
  result?: string;
  holdReason?: string;
  evidenceIds: string[];
  scenario?: "A" | "B" | "C" | "D" | "E";
}

export type EvidenceType =
  | "BASELINE"
  | "ACTION"
  | "RESULT"
  | "ADOPTION"
  | "CUSTOMER"
  | "EFFICIENCY"
  | "REVENUE"
  | "SCALE"
  | "RISK"
  | "EXCEPTION";

export interface EvidenceLog extends BaseRecord {
  type: EvidenceType;
  title: string;
  detail: string;
  actor: string;
  actionId?: string;
  orderId?: string;
  skuId?: string;
  supplierId?: string;
  customerId?: string;
  kpiDelta?: string;
  dataSource: string;
  mode: "Demo Evidence" | "Simulation" | "실증 준비";
}

export type RoleKey = "owner" | "buyer" | "ops" | "cs";

export interface Notification extends BaseRecord {
  customerId?: string;
  title: string;
  body: string;
  read: boolean;
}

export interface CartItem {
  skuId: string;
  qty: number;
  selected: boolean;
}

export interface DemoData {
  generatedAt: string;
  categories: Category[];
  brands: Brand[];
  products: Product[];
  skus: SKU[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  warehouses: Warehouse[];
  inventory: Inventory[];
  purchaseOrders: PurchaseOrder[];
  customers: Customer[];
  demand: DemandSignal[];
  dailySales: DailySalesPoint[];
  categorySales: CategorySales[];
  orders: Order[];
  returns: ReturnRequest[];
  promotions: Promotion[];
  actions: AXAction[];
  evidence: EvidenceLog[];
  notifications: Notification[];
  aggregates: {
    customerCount: number;
    orderCount90d: number;
    returnCount90d: number;
    repeatCustomerRate: number;
    detailVisitors30d: number;
    cartEntrants30d: number;
    orderers30d: number;
  };
}
