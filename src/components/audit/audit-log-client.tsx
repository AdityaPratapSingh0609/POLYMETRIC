"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText } from "lucide-react";

type AuditLogRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE";
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { name: string; username: string } | null;
};

const ACTION_VARIANT: Record<AuditLogRow["action"], "default" | "secondary" | "destructive" | "warning" | "success"> = {
  CREATE: "success",
  UPDATE: "secondary",
  ARCHIVE: "warning",
  RESTORE: "secondary",
  DELETE: "destructive",
};

function diffSummary(oldValue: string | null, newValue: string | null): string {
  if (!oldValue && newValue) return "New record created.";
  if (oldValue && !newValue) return "Record removed.";
  if (!oldValue || !newValue) return "—";
  try {
    const before = JSON.parse(oldValue);
    const after = JSON.parse(newValue);
    const changedKeys = Object.keys(after).filter(
      (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])
    );
    if (changedKeys.length === 0) return "No field changes recorded.";
    return changedKeys
      .slice(0, 4)
      .map((k) => `${k}: ${String(before[k] ?? "—")} → ${String(after[k] ?? "—")}`)
      .join("  ·  ");
  } catch {
    return "—";
  }
}

export function AuditLogClient() {
  const [entityType, setEntityType] = React.useState<string>("all");

  const { data, isPending } = useQuery({
    queryKey: ["audit-log", entityType],
    queryFn: async (): Promise<AuditLogRow[]> => {
      const params = new URLSearchParams();
      if (entityType !== "all") params.set("entityType", entityType);
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json();
    },
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every material, transaction, and user change — who, when, and what changed. Admin only."
        actions={
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="Material">Material</SelectItem>
              <SelectItem value="Transaction">Transaction</SelectItem>
              <SelectItem value="Category">Category</SelectItem>
              <SelectItem value="Shift">Shift</SelectItem>
              <SelectItem value="ReasonCode">Reason code</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card>
        <CardContent className="p-0">
          {!isPending && (!data || data.length === 0) ? (
            <EmptyState
              icon={ScrollText}
              title="No audit entries yet"
              description="Actions like creating materials, editing them, or entering adjustments will show up here as soon as they happen."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>What changed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.entityType}</span>
                      <span className="ml-1 font-mono text-xs text-muted-foreground">
                        {log.entityId.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[log.action]}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.user ? log.user.name : "System"}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">
                      {diffSummary(log.oldValue, log.newValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
