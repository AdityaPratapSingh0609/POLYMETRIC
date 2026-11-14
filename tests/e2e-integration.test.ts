import { describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { getCurrentStock, getAllCurrentStocks, signedQuantity } from "../src/lib/stock";
import { getAllForecasts, getAbnormalConsumption } from "../src/lib/analytics";

describe("Database & Seed Integrity Verification", () => {
  it("verifies seeded users and password hashes", async () => {
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    assert.ok(admin, "Admin user must exist");
    assert.equal(admin.role, "ADMIN");
    const valid = await bcrypt.compare("admin123", admin.passwordHash);
    assert.ok(valid, "Admin password hash must match 'admin123'");

    const supervisor = await prisma.user.findUnique({ where: { username: "supervisor" } });
    assert.ok(supervisor, "Supervisor user must exist");
    assert.equal(supervisor.role, "SUPERVISOR");

    const operator = await prisma.user.findUnique({ where: { username: "operator" } });
    assert.ok(operator, "Operator user must exist");
    assert.equal(operator.role, "OPERATOR");
  });

  it("verifies categories, shifts, and reason codes are loaded", async () => {
    const categories = await prisma.category.count();
    assert.ok(categories >= 10, "At least 10 categories should be seeded");

    const shifts = await prisma.shift.findMany();
    assert.ok(shifts.length >= 3, "At least 3 shifts should be seeded (Morning, Evening, Night)");

    const reasons = await prisma.reasonCode.count();
    assert.ok(reasons >= 6, "At least 6 reason codes should be seeded");
  });

  it("verifies materials and initial opening stock ledger", async () => {
    const materials = await prisma.material.findMany({ where: { status: "ACTIVE" } });
    assert.ok(materials.length > 0, "Active materials should exist in database");

    const stocks = await getAllCurrentStocks(materials.map((m) => m.id));
    assert.equal(stocks.size, materials.length, "Every material must have a computed stock");

    // Check at least one seeded material has positive stock
    const positiveStock = Array.from(stocks.values()).filter((s) => s > 0);
    assert.ok(positiveStock.length > 0, "Some materials must have positive opening stock");
  });
});

describe("Live Transaction Cycle & Invariant Enforcement", () => {
  it("creates a test material, performs full transaction lifecycle, and verifies ledger reconciliation", async () => {
    // 1. Create a temporary test material
    const category = await prisma.category.findFirst();
    assert.ok(category);

    const testMat = await prisma.material.create({
      data: {
        name: `Test Polymer Compound ${Date.now()}`,
        categoryId: category.id,
        unit: "kg",
        minimumStock: 50,
      },
    });

    try {
      // Initially stock must be exactly 0
      let stock = await getCurrentStock(testMat.id);
      assert.equal(stock, 0);

      const shift = await prisma.shift.findFirst();
      const admin = await prisma.user.findUnique({ where: { username: "admin" } });

      // 2. Opening Balance: +500 kg
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "OPENING",
          materialId: testMat.id,
          quantity: 500,
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // 3. Purchase / Receipt: +200 kg
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "PURCHASE",
          materialId: testMat.id,
          quantity: 200,
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // 4. Batch Usage: -150 kg
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "USAGE",
          materialId: testMat.id,
          quantity: 150,
          batchNumber: "TEST-BATCH-01",
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // 5. Spillage / Wastage: -10 kg
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "WASTAGE",
          materialId: testMat.id,
          quantity: 10,
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // 6. Floor Return: +5 kg
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "RETURN",
          materialId: testMat.id,
          quantity: 5,
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // 7. Physical Adjustment: -5 kg (found missing 5kg on floor audit)
      await prisma.transaction.create({
        data: {
          date: new Date(),
          type: "ADJUSTMENT",
          materialId: testMat.id,
          quantity: -5,
          shiftId: shift?.id,
          createdById: admin?.id,
        },
      });

      // Mathematical expectation: 500 + 200 - 150 - 10 + 5 - 5 = 540 kg
      stock = await getCurrentStock(testMat.id);
      assert.equal(stock, 540, "Computed stock must match exact ledger sum (540 kg)");
    } finally {
      // Cleanup test data
      await prisma.transaction.deleteMany({ where: { materialId: testMat.id } });
      await prisma.material.delete({ where: { id: testMat.id } });
    }
  });
});

describe("Deterministic Intelligence Heuristics", () => {
  it("forecasts and anomaly detection execute without runtime errors", async () => {
    const forecasts = await getAllForecasts();
    assert.ok(Array.isArray(forecasts));

    const anomalies = await getAbnormalConsumption();
    assert.ok(Array.isArray(anomalies));
  });
});
