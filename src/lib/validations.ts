import { z } from "zod";

export const materialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  colourName: z.string().trim().optional().nullable(),
  colourQuantity: z.number().nonnegative().optional().nullable(),
  colourUnit: z.string().trim().optional().nullable(),
  minimumStock: z.number().min(0).default(0),
  unitCost: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const materialStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]);

export const transactionTypeSchema = z.enum([
  "OPENING",
  "PURCHASE",
  "USAGE",
  "RETURN",
  "WASTAGE",
  "ADJUSTMENT",
  "TRANSFER",
]);

export const createTransactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: transactionTypeSchema,
  materialId: z.string().min(1, "Material is required"),
  quantity: z.number().refine((v) => v !== 0, "Quantity can't be zero"),
  shiftId: z.string().optional().nullable(),
  reasonId: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  batchNumber: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
});

export const shiftSchema = z.object({
  name: z.string().min(1, "Name is required"),
  isDefault: z.boolean().optional(),
});

export const reasonCodeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  notes: z.string().optional().nullable(),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(6, "At least 6 characters"),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "SUPERVISOR", "OPERATOR"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
