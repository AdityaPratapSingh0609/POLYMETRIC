// Structural / business-rule configuration only — never material-specific.
// Everything a user actually manages (materials, categories, shifts,
// reasons) lives in the database and is edited through the UI.

export const TRANSACTION_TYPES = [
  { value: "OPENING", label: "Opening Stock", direction: "in" },
  { value: "PURCHASE", label: "Purchase", direction: "in" },
  { value: "RETURN", label: "Return", direction: "in" },
  { value: "USAGE", label: "Usage / Consumption", direction: "out" },
  { value: "WASTAGE", label: "Wastage", direction: "out" },
  { value: "TRANSFER", label: "Transfer Out", direction: "out" },
  { value: "ADJUSTMENT", label: "Adjustment", direction: "neutral" },
] as const;

export type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number]["value"];

export function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const ENTRY_TYPES = ["USAGE", "PURCHASE", "WASTAGE", "ADJUSTMENT", "RETURN", "TRANSFER"] as const;

export const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERATOR", label: "Operator" },
] as const;

// Stock-out forecast alert thresholds, in days remaining.
export const LOW_STOCK_THRESHOLDS = { critical: 7, warning: 15, watch: 30 };

// Dead-stock detection windows, in days since last movement.
export const DEAD_STOCK_WINDOWS = [30, 60, 90] as const;

// How far a recent-average has to deviate from the rolling average before
// it's flagged as abnormal consumption.
export const ABNORMAL_DEVIATION_PERCENT = 35;

// Window used to compute "average daily consumption" for forecasting.
export const FORECAST_WINDOW_DAYS = 30;

export const CATEGORY_SUGGESTIONS = [
  "EVA",
  "POE",
  "EPDM",
  "Rubber",
  "Foaming Agent",
  "Pigment",
  "Plasticizer",
  "Filler",
  "Additive",
  "Other",
];
