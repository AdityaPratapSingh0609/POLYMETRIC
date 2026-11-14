"use client";

import * as React from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactions, useDeleteTransaction, useCategories } from "@/hooks/use-inventory";
import { useSettingsResource } from "@/hooks/use-admin";
import { useCurrentUser } from "@/hooks/use-current-user";
import { TRANSACTION_TYPES, transactionTypeLabel } from "@/lib/constants";
import { downloadCsv, downloadExcel } from "@/lib/export";
import { formatDate, formatQuantity } from "@/lib/utils";

export function TransactionsClient() {
  const [filters, setFilters] = React.useState({
    dateFrom: "",
    dateTo: "",
    materialId: "",
    categoryId: "",
    type: "",
    shiftId: "",
    batchNumber: "",
    q: "",
  });
  const { data: user } = useCurrentUser();
  const { data: categories } = useCategories();
  const { data: shifts } = useSettingsResource("shifts");
  const { data: transactions, isPending } = useTransactions(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as typeof filters
  );
  const deleteTransaction = useDeleteTransaction();

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function exportRows() {
    return (transactions ?? []).map((t) => ({
      Date: formatDate(t.date),
      Type: transactionTypeLabel(t.type),
      Material: t.material.name,
      Quantity: t.quantity,
      Unit: t.material.unit,
      Shift: t.shift?.name ?? "",
      Reason: t.reason?.name ?? "",
      Vendor: t.vendor ?? "",
      Invoice: t.invoiceNumber ?? "",
      Batch: t.batchNumber ?? "",
      Notes: t.notes ?? "",
      "Recorded by": t.createdBy?.name ?? "",
    }));
  }

  return (
    <div>
      <PageHeader
        title="Ledger"
        description="Every transaction across every material, statement-style. Filter, search, and export."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadCsv("transactions.csv", exportRows())}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => downloadExcel("transactions.xlsx", "Transactions", exportRows())}>
              <Download className="size-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} placeholder="From" />
        <Input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} placeholder="To" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filters.type}
          onChange={(e) => updateFilter("type", e.target.value)}
        >
          <option value="">All types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filters.categoryId}
          onChange={(e) => updateFilter("categoryId", e.target.value)}
        >
          <option value="">All categories</option>
          {categories?.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filters.shiftId}
          onChange={(e) => updateFilter("shiftId", e.target.value)}
        >
          <option value="">All shifts</option>
          {shifts?.map((s: { id: string; name: string }) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search notes, vendor, batch\u2026" className="pl-9" value={filters.q} onChange={(e) => updateFilter("q", e.target.value)} />
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState title="No transactions match these filters" description="Try widening the date range or clearing a filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Recorded by</TableHead>
                {user?.role === "ADMIN" && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap font-tabular">{formatDate(t.date)}</TableCell>
                  <TableCell className="font-medium">{t.material.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transactionTypeLabel(t.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-tabular">{formatQuantity(t.quantity, t.material.unit)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[t.shift?.name, t.reason?.name, t.vendor, t.batchNumber ? `Batch ${t.batchNumber}` : null, t.notes].filter(Boolean).join(" \u00b7 ") || "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.createdBy?.name ?? "\u2014"}</TableCell>
                  {user?.role === "ADMIN" && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Delete this transaction? This can't be undone — prefer an Adjustment entry if you just need to correct the balance.")) {
                                deleteTransaction.mutate(t.id);
                              }
                            }}
                          >
                            Delete entry
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
