"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCategories, useCreateCategory, useCreateMaterial, useUpdateMaterial } from "@/hooks/use-inventory";
import type { MaterialWithStock } from "@/types";

const UNIT_SUGGESTIONS = ["kg", "g", "litre", "ml", "ton", "pcs", "bag", "roll"];

export function MaterialForm({
  open,
  onOpenChange,
  material,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: MaterialWithStock;
}) {
  const isEdit = !!material;
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial(material?.id ?? "");

  const [form, setForm] = React.useState({
    name: "",
    categoryId: "",
    unit: "kg",
    colourName: "",
    colourQuantity: "",
    colourUnit: "kg",
    minimumStock: "0",
    unitCost: "",
    notes: "",
  });
  const [newCategory, setNewCategory] = React.useState("");
  const [showNewCategory, setShowNewCategory] = React.useState(false);

  React.useEffect(() => {
    if (material) {
      setForm({
        name: material.name,
        categoryId: material.categoryId,
        unit: material.unit,
        colourName: material.colourName ?? "",
        colourQuantity: material.colourQuantity?.toString() ?? "",
        colourUnit: material.colourUnit ?? "kg",
        minimumStock: material.minimumStock.toString(),
        unitCost: material.unitCost?.toString() ?? "",
        notes: material.notes ?? "",
      });
    } else if (open) {
      setForm({ name: "", categoryId: "", unit: "kg", colourName: "", colourQuantity: "", colourUnit: "kg", minimumStock: "0", unitCost: "", notes: "" });
    }
  }, [material, open]);

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    const created = await createCategory.mutateAsync({ name: newCategory.trim() });
    setForm((f) => ({ ...f, categoryId: created.id }));
    setNewCategory("");
    setShowNewCategory(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      unit: form.unit.trim(),
      colourName: form.colourName.trim() || null,
      colourQuantity: form.colourQuantity ? Number(form.colourQuantity) : null,
      colourUnit: form.colourUnit.trim() || null,
      minimumStock: Number(form.minimumStock) || 0,
      unitCost: form.unitCost ? Number(form.unitCost) : null,
      notes: form.notes.trim() || null,
    };
    if (isEdit) {
      await updateMaterial.mutateAsync(payload);
    } else {
      await createMaterial.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const saving = createMaterial.isPending || updateMaterial.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit material" : "Add material"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Changes apply immediately — nothing here touches past transactions." : "New materials are available for entry right away."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Material name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              {!showNewCategory ? (
                <div className="flex gap-2">
                  <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: { id: string; name: string }) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setShowNewCategory(true)}>
                    New
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
                  <Button type="button" onClick={handleAddCategory}>
                    Add
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowNewCategory(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" list="unit-suggestions" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} required />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="colourName">Colour (optional)</Label>
              <Input id="colourName" value={form.colourName} onChange={(e) => setForm((f) => ({ ...f, colourName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="colourQuantity">Colour quantity</Label>
              <div className="flex gap-2">
                <Input
                  id="colourQuantity"
                  type="number"
                  step="any"
                  value={form.colourQuantity}
                  onChange={(e) => setForm((f) => ({ ...f, colourQuantity: e.target.value }))}
                />
                <Input
                  className="w-24"
                  value={form.colourUnit}
                  onChange={(e) => setForm((f) => ({ ...f, colourUnit: e.target.value }))}
                  placeholder="unit"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minimumStock">Minimum stock</Label>
              <Input
                id="minimumStock"
                type="number"
                step="any"
                min={0}
                value={form.minimumStock}
                onChange={(e) => setForm((f) => ({ ...f, minimumStock: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unitCost">Unit cost (optional)</Label>
              <Input
                id="unitCost"
                type="number"
                step="any"
                min={0}
                value={form.unitCost}
                onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                placeholder="For inventory value"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.categoryId}>
              {saving ? "Saving\u2026" : isEdit ? "Save changes" : "Add material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
