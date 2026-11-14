import type { Category, Material, ReasonCode, Shift, Transaction, User } from "@prisma/client";

export type Role = "ADMIN" | "SUPERVISOR" | "OPERATOR";
export type MaterialStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type TransactionType =
  | "OPENING"
  | "PURCHASE"
  | "USAGE"
  | "RETURN"
  | "WASTAGE"
  | "ADJUSTMENT"
  | "TRANSFER";

export type MaterialWithStock = Material & {
  category: Category;
  currentStock: number;
};

export type TransactionWithRelations = Transaction & {
  material: Material;
  shift: Shift | null;
  reason: ReasonCode | null;
  createdBy: User | null;
};

// getMaterialLedger() includes shift/reason/createdBy (not material, since
// it's already scoped to one material) and adds a running balance.
export type LedgerEntryWithRelations = Transaction & {
  shift: Shift | null;
  reason: ReasonCode | null;
  createdBy: User | null;
  runningBalance: number;
};

export type DashboardData = {
  totalMaterials: number;
  totalActiveMaterials: number;
  inventoryValue: number | null;
  today: { consumption: number };
  week: { consumption: number };
  month: { consumption: number };
  lowStock: Array<{ id: string; name: string; unit: string; currentStock: number; minimumStock: number }>;
  runningOutSoon: Array<{
    id: string;
    name: string;
    unit: string;
    daysRemaining: number | null;
    estimatedStockOutDate: string | null;
    alertLevel: "critical" | "warning" | "watch" | null;
  }>;
  topConsumed: Array<{ id: string; name: string; unit: string; quantity: number }>;
  recentMovements: TransactionWithRelations[];
  wastageSummary: { thisMonth: number; percentOfConsumption: number };
};

export type CurrentUserPayload = {
  userId: string;
  username: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "OPERATOR";
} | null;

export type SettingsResource = "shifts" | "reasons";

export type ReportRow = {
  materialId: string;
  name: string;
  unit: string;
  opening: number;
  purchased: number;
  returned: number;
  consumed: number;
  wastage: number;
  adjustments: number;
  transferred: number;
  closing: number;
};

export type BatchReportRow = {
  batchNumber: string;
  materialId: string;
  materialName: string;
  unit: string;
  totalQuantity: number;
  entries: number;
  firstDate: string;
  lastDate: string;
};
