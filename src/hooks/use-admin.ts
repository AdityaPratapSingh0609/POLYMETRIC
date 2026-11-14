"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Something went wrong");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Settings resources — Shifts and Reason Codes share one generic API shape
// ---------------------------------------------------------------------------

export type SettingsResource = "shifts" | "reasons";

export function useSettingsResource(resource: SettingsResource) {
  return useQuery({
    queryKey: ["settings", resource],
    queryFn: async () => jsonOrThrow(await fetch(`/api/settings/${resource}`)),
  });
}

export function useCreateSettingsResource(resource: SettingsResource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch(`/api/settings/${resource}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", resource] });
      toast.success("Added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSettingsResource(resource: SettingsResource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => jsonOrThrow(await fetch(`/api/settings/${resource}/${id}`, { method: "DELETE" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", resource] });
      toast.success("Removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------------------
// Users (Admin only)
// ---------------------------------------------------------------------------

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => jsonOrThrow(await fetch("/api/users")),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) =>
      jsonOrThrow(
        await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------------------
// Audit log (Admin only)
// ---------------------------------------------------------------------------

export type AuditLogFilters = { entityType?: string; from?: string; to?: string };

export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-log", filters ?? {}],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters ?? {}).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });
      return jsonOrThrow(await fetch(`/api/audit-log?${params.toString()}`));
    },
  });
}
