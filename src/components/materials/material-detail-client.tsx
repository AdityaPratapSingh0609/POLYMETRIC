"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { MaterialForm } from "@/components/materials/material-form";
import { useMaterial } from "@/hooks/use-inventory";
import { transactionTypeLabel } from "@/lib/constants";
import { formatDate, formatQuantity } from "@/lib/utils";

export function MaterialDetailClient({ materialId }: { materialId: string }) {
  const { data, isPending } = useMaterial(materialId);
  const [editOpen, setEditOpen] = React.useState(false);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) {
    return <EmptyState title="Material not found" description="It may have been removed." />;
  }

  const { material, ledger } = data;
  const low = material.currentStock <= material.minimumStock;

  return (
    <div>
      <Link href="/materials" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to materials
      </Link>

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight">{material.name}</h1>
            <Badge variant={material.status === "ACTIVE" ? "success" : material.status === "INACTIVE" ? "secondary" : "outline"}>
              {material.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {material.category.name}
            {material.colourName && ` \u00b7 ${material.colourName}`}
            {material.colourQuantity && ` (${formatQuantity(material.colourQuantity, material.colourUnit ?? "")})`}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="size-4" /> Edit
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Current stock" value={formatQuantity(material.currentStock, material.unit)} tone={low ? "destructive" : "default"} />
        <StatCard label="Minimum stock" value={formatQuantity(material.minimumStock, material.unit)} />
        <StatCard
          label="Inventory value"
          value={material.unitCost ? `\u20b9${(material.currentStock * material.unitCost).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "\u2014"}
          sub={material.unitCost ? `at \u20b9${material.unitCost}/${material.unit}` : "Set a unit cost to enable this"}
        />
      </div>

      {material.notes && (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground">{material.notes}</CardContent>
        </Card>
      )}

      <h2 className="mb-3 font-display text-xl font-semibold">Stock ledger</h2>
      <p className="mb-3 text-sm text-muted-foreground">Every movement, oldest first — nothing here can be edited directly. Corrections go through an Adjustment entry.</p>

      {ledger.length === 0 ? (
        <EmptyState title="No transactions yet" description="Entries you record for this material will appear here as a running ledger." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="ledger-table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3 text-right">Movement</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => {
                const isInflow = ["OPENING", "PURCHASE", "RETURN"].includes(entry.type) || (entry.type === "ADJUSTMENT" && entry.quantity >= 0);
                const displayQty =
                  entry.type === "ADJUSTMENT" ? entry.quantity : entry.type === "USAGE" || entry.type === "WASTAGE" || entry.type === "TRANSFER" ? -Math.abs(entry.quantity) : Math.abs(entry.quantity);
                return (
                  <tr key={entry.id} className="ledger-row border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(entry.date)}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline">{transactionTypeLabel(entry.type)}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {[entry.shift?.name, entry.reason?.name, entry.vendor, entry.batchNumber ? `Batch ${entry.batchNumber}` : null, entry.notes]
                        .filter(Boolean)
                        .join(" \u00b7 ") || "\u2014"}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${isInflow ? "ledger-in" : "ledger-out"}`}>
                      {isInflow ? "+" : ""}
                      {formatQuantity(displayQty, material.unit)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{formatQuantity(entry.runningBalance, material.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <MaterialForm open={editOpen} onOpenChange={setEditOpen} material={material} />
    </div>
  );
}
