"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaterials, useCreateTransaction } from "@/hooks/use-inventory";
import { useSettingsResource } from "@/hooks/use-admin";
import { todayDateInputValue } from "@/lib/utils";
import type { TransactionTypeValue } from "@/lib/constants";

export function TransactionForm({ type }: { type: TransactionTypeValue }) {
  const { data: materials } = useMaterials({ status: "ACTIVE" });
  const { data: shifts } = useSettingsResource("shifts");
  const { data: reasons } = useSettingsResource("reasons");
  const createTransaction = useCreateTransaction();

  const [form, setForm] = React.useState({
    date: todayDateInputValue(),
    materialId: "",
    quantity: "",
    direction: "increase" as "increase" | "decrease",
    shiftId: "",
    reasonId: "",
    vendor: "",
    invoiceNumber: "",
    batchNumber: "",
    destination: "",
    notes: "",
  });

  const showShift = type === "USAGE";
  const showReason = type === "WASTAGE" || type === "ADJUSTMENT" || type === "RETURN";
  const showVendorInvoice = type === "PURCHASE";
  const showBatch = type === "USAGE";
  const showDestination = type === "TRANSFER";
  const showDirection = type === "ADJUSTMENT";

  const selectedMaterial = materials?.find((m) => m.id === form.materialId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.materialId || !form.quantity) return;

    const magnitude = Math.abs(Number(form.quantity));
    const quantity = type === "ADJUSTMENT" ? (form.direction === "decrease" ? -magnitude : magnitude) : magnitude;

    await createTransaction.mutateAsync({
      date: form.date,
      type,
      materialId: form.materialId,
      quantity,
      shiftId: showShift ? form.shiftId || null : null,
      reasonId: showReason ? form.reasonId || null : null,
      vendor: showVendorInvoice ? form.vendor || null : null,
      invoiceNumber: showVendorInvoice ? form.invoiceNumber || null : null,
      batchNumber: showBatch ? form.batchNumber || null : null,
      destination: showDestination ? form.destination || null : null,
      notes: form.notes || null,
    });

    setForm((f) => ({
      ...f,
      quantity: "",
      vendor: "",
      invoiceNumber: "",
      batchNumber: "",
      destination: "",
      notes: "",
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${type}-date`}>Date</Label>
          <Input
            id={`${type}-date`}
            type="date"
            className="h-12 text-base"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${type}-material`}>Material</Label>
          <Select value={form.materialId} onValueChange={(v) => setForm((f) => ({ ...f, materialId: v }))}>
            <SelectTrigger id={`${type}-material`} className="h-12 text-base">
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent>
              {materials?.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={showDirection ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
          <Label htmlFor={`${type}-quantity`}>
            {type === "ADJUSTMENT" ? "Adjustment quantity" : "Quantity"} {selectedMaterial ? `(${selectedMaterial.unit})` : ""}
          </Label>
          <div className="flex gap-2">
            {showDirection && (
              <Select value={form.direction} onValueChange={(v) => setForm((f) => ({ ...f, direction: v as "increase" | "decrease" }))}>
                <SelectTrigger className="h-12 w-40 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase stock</SelectItem>
                  <SelectItem value="decrease">Decrease stock</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Input
              id={`${type}-quantity`}
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              className="h-12 text-base"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
            />
          </div>
          {selectedMaterial && (
            <p className="text-xs text-muted-foreground">
              Current stock: {selectedMaterial.currentStock.toLocaleString("en-IN")} {selectedMaterial.unit}
            </p>
          )}
        </div>

        {showShift && (
          <div className="space-y-1.5">
            <Label htmlFor={`${type}-shift`}>Shift (optional)</Label>
            <Select value={form.shiftId} onValueChange={(v) => setForm((f) => ({ ...f, shiftId: v }))}>
              <SelectTrigger id={`${type}-shift`} className="h-12 text-base">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts?.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showBatch && (
          <div className="space-y-1.5">
            <Label htmlFor={`${type}-batch`}>Batch number (optional)</Label>
            <Input id={`${type}-batch`} className="h-12 text-base" value={form.batchNumber} onChange={(e) => setForm((f) => ({ ...f, batchNumber: e.target.value }))} />
          </div>
        )}

        {showReason && (
          <div className="space-y-1.5">
            <Label htmlFor={`${type}-reason`}>Reason</Label>
            <Select value={form.reasonId} onValueChange={(v) => setForm((f) => ({ ...f, reasonId: v }))}>
              <SelectTrigger id={`${type}-reason`} className="h-12 text-base">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons?.map((r: { id: string; name: string }) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showVendorInvoice && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-vendor`}>Vendor</Label>
              <Input id={`${type}-vendor`} className="h-12 text-base" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${type}-invoice`}>Invoice number</Label>
              <Input id={`${type}-invoice`} className="h-12 text-base" value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />
            </div>
          </>
        )}

        {showDestination && (
          <div className="space-y-1.5">
            <Label htmlFor={`${type}-destination`}>Transferring to</Label>
            <Input id={`${type}-destination`} className="h-12 text-base" value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} />
          </div>
        )}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${type}-notes`}>Notes (optional)</Label>
          <Textarea id={`${type}-notes`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={createTransaction.isPending || !form.materialId}>
        {createTransaction.isPending ? "Saving\u2026" : "Save entry"}
      </Button>
    </form>
  );
}
