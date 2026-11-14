"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LedgerEntryWithRelations, MaterialWithStock, TransactionWithRelations } from "@/types";

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Something went wrong");
  }
  return res.json();
}

function stockDelta(type: string, quantity: number): number {
  const qty = Number(quantity);
  if (type === "ADJUSTMENT") return qty;
  if (type === "OPENING" || type === "PURCHASE" || type === "RETURN") return Math.abs(qty);
  return -Math.abs(qty);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => jsonOrThrow(await fetch("/api/categories")),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) =>
      jsonOrThrow(
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export type MaterialFilters = { status?: string; categoryId?: string; q?: string };

export function useMaterials(filters?: MaterialFilters) {
  return useQuery({
    queryKey: ["materials", filters ?? {}],
    queryFn: async (): Promise<MaterialWithStock[]> => {
      const params = new URLSearchParams();
      if (filters?.status) params.set("status", filters.status);
      if (filters?.categoryId) params.set("categoryId", filters.categoryId);
      if (filters?.q) params.set("q", filters.q);
      return jsonOrThrow(await fetch(`/api/materials?${params.toString()}`));
    },
  });
}

export function useMaterial(id: string | undefined) {
  return useQuery({
    queryKey: ["materials", "detail", id],
    queryFn: async (): Promise<{ material: MaterialWithStock; ledger: LedgerEntryWithRelations[] }> =>
      jsonOrThrow(await fetch(`/api/materials/${id}`)),
    enabled: !!id,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMaterial(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch(`/api/materials/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------------------
// Transactions — the core "instant stock update" flow
// ---------------------------------------------------------------------------

export type TransactionFilters = {
  dateFrom?: string;
  dateTo?: string;
  materialId?: string;
  categoryId?: string;
  type?: string;
  shiftId?: string;
  batchNumber?: string;
  q?: string;
};

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters ?? {}],
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      const params = new URLSearchParams();
      Object.entries(filters ?? {}).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });
      return jsonOrThrow(await fetch(`/api/transactions?${params.toString()}`));
    },
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onMutate: async (newTxn) => {
      await qc.cancelQueries({ queryKey: ["materials"] });
      const previous = qc.getQueriesData<MaterialWithStock[]>({ queryKey: ["materials"] });
      qc.setQueriesData<MaterialWithStock[]>({ queryKey: ["materials"] }, (old) => {
        if (!old) return old;
        return old.map((m) =>
          m.id === newTxn.materialId
            ? { ...m, currentStock: m.currentStock + stockDelta(String(newTxn.type), Number(newTxn.quantity)) }
            : m
        );
      });
      return { previous };
    },
    onError: (err: Error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => qc.setQueryData<MaterialWithStock[]>(key, data));
      toast.error(err.message);
    },
    onSuccess: () => {
      toast.success("Saved — stock updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/transactions/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      toast.success("Transaction deleted");
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
