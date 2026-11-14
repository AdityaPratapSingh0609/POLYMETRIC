import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signedQuantity, sumSigned, type MinimalTxn } from "../src/lib/stock";
import { createTransactionSchema, materialSchema } from "../src/lib/validations";
import { signSession, verifySession, type SessionPayload } from "../src/lib/session";

describe("Ledger Mathematical Invariants", () => {
  it("signedQuantity strictly computes correct signs per transaction type", () => {
    // Inventory additions
    assert.equal(signedQuantity("OPENING", 500), 500);
    assert.equal(signedQuantity("PURCHASE", 250), 250);
    assert.equal(signedQuantity("RETURN", 25), 25);

    // Inventory subtractions
    assert.equal(signedQuantity("USAGE", 100), -100);
    assert.equal(signedQuantity("WASTAGE", 15), -15);
    assert.equal(signedQuantity("TRANSFER", 50), -50);

    // Signed physical corrections
    assert.equal(signedQuantity("ADJUSTMENT", 10), 10);
    assert.equal(signedQuantity("ADJUSTMENT", -12), -12);
  });

  it("sumSigned reconciles multi-transaction historical movements", () => {
    const transactions: MinimalTxn[] = [
      { type: "OPENING", quantity: 1000 },
      { type: "PURCHASE", quantity: 500 },
      { type: "USAGE", quantity: 300 },
      { type: "WASTAGE", quantity: 20 },
      { type: "RETURN", quantity: 10 },
      { type: "TRANSFER", quantity: 50 },
      { type: "ADJUSTMENT", quantity: -15 }, // Physical count correction down
    ];

    // Expected: 1000 + 500 - 300 - 20 + 10 - 50 - 15 = 1125
    const balance = sumSigned(transactions);
    assert.equal(balance, 1125);
  });

  it("satisfies the fundamental inventory reconciliation equation", () => {
    const opening = 200;
    const purchased = 150;
    const returned = 10;
    const consumed = 80;
    const wastage = 5;
    const transferred = 20;
    const adjustments = -10;

    const periodTxns: MinimalTxn[] = [
      { type: "PURCHASE", quantity: purchased },
      { type: "RETURN", quantity: returned },
      { type: "USAGE", quantity: consumed },
      { type: "WASTAGE", quantity: wastage },
      { type: "TRANSFER", quantity: transferred },
      { type: "ADJUSTMENT", quantity: adjustments },
    ];

    const periodMovement = sumSigned(periodTxns);
    const closing = opening + periodMovement;

    assert.equal(
      closing,
      opening + purchased + returned - consumed - wastage - transferred + adjustments
    );
    assert.equal(closing, 245);
  });
});

describe("Validation Schemas", () => {
  it("rejects transaction with zero quantity", () => {
    const result = createTransactionSchema.safeParse({
      date: new Date().toISOString(),
      type: "USAGE",
      materialId: "mat_123",
      quantity: 0,
    });
    assert.equal(result.success, false);
  });

  it("accepts valid transaction", () => {
    const result = createTransactionSchema.safeParse({
      date: new Date().toISOString(),
      type: "USAGE",
      materialId: "mat_123",
      quantity: 42.5,
      batchNumber: "B-2026-07-A",
    });
    assert.equal(result.success, true);
  });

  it("validates material schema with positive minimum stock", () => {
    const valid = materialSchema.safeParse({
      name: "EPDM Rubber Grade A",
      categoryId: "cat_rubber",
      unit: "kg",
      minimumStock: 100,
    });
    assert.equal(valid.success, true);

    const invalid = materialSchema.safeParse({
      name: "",
      categoryId: "cat_rubber",
      unit: "kg",
    });
    assert.equal(invalid.success, false);
  });
});

describe("Authentication & Session Security", () => {
  it("generates and verifies HMAC-SHA256 Web Crypto session token", async () => {
    const payload: SessionPayload = {
      userId: "user_abc",
      username: "operator1",
      name: "Floor Operator",
      role: "OPERATOR",
    };

    const token = await signSession(payload);
    assert.ok(token.includes("."));

    const verified = await verifySession(token);
    assert.deepEqual(verified, payload);
  });

  it("rejects tampered session token", async () => {
    const payload: SessionPayload = {
      userId: "user_abc",
      username: "operator1",
      name: "Floor Operator",
      role: "OPERATOR",
    };

    const token = await signSession(payload);
    const [base] = token.split(".");
    const forgedToken = `${base}.invalid_signature_xyz`;

    const verified = await verifySession(forgedToken);
    assert.equal(verified, null);
  });
});
