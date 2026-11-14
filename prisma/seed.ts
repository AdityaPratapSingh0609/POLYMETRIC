/**
 * Seed script.
 *
 * IMPORTANT: nothing in here is "hardcoded" in the sense the spec warned
 * against — no component, form, or business-logic file anywhere in this
 * codebase contains a material name, colour, or category. Everything the
 * UI offers (materials, categories, shifts, reason codes) is 100% database
 * driven. This file just inserts convenience starter rows so the app isn't
 * empty on first run — every one of them can be edited, deactivated,
 * archived, or deleted from the Materials screen with zero code changes.
 *
 * The material list below is my best-effort transcription of the photographed
 * paper stock register you shared (opening balances as of 01 Jul 2026).
 * Handwriting is inherently ambiguous in a few spots — see the README
 * "Double-check these on first login" section for the specific rows to
 * verify. Feel free to delete this whole list and start from zero if you'd
 * rather not seed real data at all: just clear the `materials` array below
 * before running `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const Role = {
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  OPERATOR: "OPERATOR",
} as const;

const TransactionType = {
  OPENING: "OPENING",
  PURCHASE: "PURCHASE",
  USAGE: "USAGE",
  RETURN: "RETURN",
  WASTAGE: "WASTAGE",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER: "TRANSFER",
} as const;

const prisma = new PrismaClient();

const categorySeed = [
  { name: "EVA", description: "Ethylene-vinyl acetate compounds" },
  { name: "POE", description: "Polyolefin elastomers" },
  { name: "EPDM", description: "Ethylene propylene diene monomer rubber" },
  { name: "Rubber", description: "General rubber / elastomer compounds" },
  { name: "Foaming Agent", description: "Blowing / foaming agents" },
  { name: "Pigment", description: "Colour concentrates and carbon blacks" },
  { name: "Plasticizer", description: "" },
  { name: "Filler", description: "" },
  { name: "Additive", description: "Curing agents, accelerators, activators" },
  { name: "Other", description: "" },
];

const shiftSeed = [
  { name: "Morning", isDefault: true },
  { name: "Evening", isDefault: false },
  { name: "Night", isDefault: false },
];

const reasonCodeSeed = [
  { name: "Regular Production" },
  { name: "Trial Batch" },
  { name: "Sample Batch" },
  { name: "Spillage" },
  { name: "Contamination" },
  { name: "Handling Damage" },
  { name: "Expired / Degraded" },
  { name: "Physical Count Correction" },
  { name: "Data Entry Error" },
  { name: "Other" },
];

const userSeed = [
  { name: "Admin User", username: "admin", password: "admin123", role: Role.ADMIN },
  { name: "Supervisor User", username: "supervisor", password: "supervisor123", role: Role.SUPERVISOR },
  { name: "Operator User", username: "operator", password: "operator123", role: Role.OPERATOR },
];

// Best-effort transcription of the paper register. `flagged: true` rows are
// the ones worth double-checking against the physical book.
type SeedMaterial = {
  name: string;
  category: string;
  unit: string;
  colourName?: string;
  colourQuantity?: number;
  colourUnit?: string;
  minimumStock: number;
  openingStock: number;
  flagged?: boolean;
};

const materialSeed: SeedMaterial[] = [
  { name: "LVS 430 EVA", category: "EVA", unit: "kg", colourName: "Green 2727", colourQuantity: 15, colourUnit: "kg", minimumStock: 500, openingStock: 4825 },
  { name: "POE", category: "POE", unit: "kg", colourName: "Navy 2633", colourQuantity: 15, colourUnit: "kg", minimumStock: 200, openingStock: 1150 },
  { name: "Calcium", category: "Filler", unit: "kg", colourName: "Yellow 1114", colourQuantity: 22, colourUnit: "kg", minimumStock: 200, openingStock: 1140 },
  { name: "V-800", category: "Additive", unit: "kg", colourName: "Orange 2917", colourQuantity: 8, colourUnit: "kg", minimumStock: 150, openingStock: 1250 },
  { name: "EPDM", category: "EPDM", unit: "kg", colourName: "Orange 203K", colourQuantity: 15, colourUnit: "kg", minimumStock: 150, openingStock: 750 },
  { name: "Elastomer", category: "Rubber", unit: "kg", colourName: "Red 565", colourQuantity: 10, colourUnit: "kg", minimumStock: 150, openingStock: 850, flagged: true },
  { name: "ZO", category: "Additive", unit: "kg", colourName: "Red 507", colourQuantity: 20, colourUnit: "kg", minimumStock: 30, openingStock: 125 },
  { name: "ZS", category: "Additive", unit: "kg", colourName: "Yellow 165", colourQuantity: 16, colourUnit: "kg", minimumStock: 40, openingStock: 200 },
  { name: "DCP", category: "Additive", unit: "kg", colourName: "Yellow 1222", colourQuantity: 6, colourUnit: "kg", minimumStock: 250, openingStock: 1440, flagged: true },
  { name: "TAG", category: "Additive", unit: "kg", colourName: "Yellow 1332", colourQuantity: 20, colourUnit: "kg", minimumStock: 50, openingStock: 20 },
  { name: "T.T.", category: "Additive", unit: "kg", colourName: "Orange 1475", colourQuantity: 5, colourUnit: "kg", minimumStock: 60, openingStock: 310 },
  { name: "DOP", category: "Plasticizer", unit: "litre", colourName: "Blue 2749", colourQuantity: 65, colourUnit: "kg", minimumStock: 150, openingStock: 700 },
  { name: "MR", category: "Additive", unit: "kg", minimumStock: 20, openingStock: 50 },
  { name: "Foaming A", category: "Foaming Agent", unit: "kg", colourName: "Pink Q9", colourQuantity: 2, colourUnit: "kg", minimumStock: 10, openingStock: 0, flagged: true },
  { name: "PH 4000", category: "Additive", unit: "kg", colourName: "Yellow 1813", colourQuantity: 20, colourUnit: "kg", minimumStock: 20, openingStock: 50 },
  { name: "Printex", category: "Pigment", unit: "kg", colourName: "Blue (Neel)", colourQuantity: 40, colourUnit: "kg", minimumStock: 10, openingStock: 21 },
  { name: "Silica 52", category: "Filler", unit: "kg", colourName: "Blue (Neel)", colourQuantity: 50, colourUnit: "kg", minimumStock: 40, openingStock: 100, flagged: true },
  { name: "Plasted 943", category: "Plasticizer", unit: "kg", colourName: "Violet", colourQuantity: 1.5, colourUnit: "kg", minimumStock: 20, openingStock: 75 },
  { name: "Foaming 3072", category: "Foaming Agent", unit: "kg", colourName: "Blue 2744", colourQuantity: 20, colourUnit: "kg", minimumStock: 40, openingStock: 140 },
  { name: "Carbon 220", category: "Pigment", unit: "kg", minimumStock: 40, openingStock: 175 },
  { name: "LD", category: "Other", unit: "kg", minimumStock: 80, openingStock: 400 },
  { name: "SA", category: "Additive", unit: "kg", minimumStock: 40, openingStock: 190 },
  { name: "OBM", category: "Additive", unit: "kg", minimumStock: 5, openingStock: 3 },
  { name: "Curing Powder", category: "Additive", unit: "kg", minimumStock: 10, openingStock: 0, flagged: true },
  { name: "Sheet", category: "Other", unit: "pcs", minimumStock: 10, openingStock: 0, flagged: true },
  { name: "CA", category: "Additive", unit: "kg", minimumStock: 20, openingStock: 80 },
  { name: "2800S EVA", category: "EVA", unit: "kg", minimumStock: 300, openingStock: 2100 },
  { name: "EVA Roll", category: "EVA", unit: "kg", minimumStock: 100, openingStock: 770 },
];

const OPENING_DATE = new Date("2026-07-01T00:00:00.000Z");

async function main() {
  console.log("Seeding categories...");
  const categories = new Map<string, string>();
  for (const c of categorySeed) {
    const row = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categories.set(c.name, row.id);
  }

  console.log("Seeding shifts...");
  for (const s of shiftSeed) {
    await prisma.shift.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  console.log("Seeding reason codes...");
  for (const r of reasonCodeSeed) {
    await prisma.reasonCode.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  console.log("Seeding users...");
  for (const u of userSeed) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { name: u.name, username: u.username, passwordHash, role: u.role },
    });
  }
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });

  console.log("Seeding materials + opening stock...");
  const flaggedNames: string[] = [];
  for (const m of materialSeed) {
    if (m.flagged) flaggedNames.push(m.name);
    const categoryId = categories.get(m.category);
    if (!categoryId) continue;

    const existing = await prisma.material.findFirst({ where: { name: m.name } });
    const material =
      existing ??
      (await prisma.material.create({
        data: {
          name: m.name,
          categoryId,
          unit: m.unit,
          colourName: m.colourName,
          colourQuantity: m.colourQuantity,
          colourUnit: m.colourUnit,
          minimumStock: m.minimumStock,
          status: "ACTIVE",
        },
      }));

    const hasOpening = await prisma.transaction.findFirst({
      where: { materialId: material.id, type: TransactionType.OPENING },
    });
    if (!hasOpening) {
      await prisma.transaction.create({
        data: {
          date: OPENING_DATE,
          type: TransactionType.OPENING,
          materialId: material.id,
          quantity: m.openingStock,
          notes: "Opening balance from paper stock register",
          createdById: admin?.id,
        },
      });
    }
  }

  console.log("\nSeed complete.");
  console.log("Default logins (change these before going anywhere near production):");
  console.log("  admin / admin123        (Admin)");
  console.log("  supervisor / supervisor123 (Supervisor)");
  console.log("  operator / operator123  (Operator)");
  if (flaggedNames.length) {
    console.log("\nDouble-check these seeded rows against your paper register (handwriting was ambiguous):");
    for (const n of flaggedNames) console.log(`  - ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
