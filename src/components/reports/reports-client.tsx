"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReport } from "@/hooks/use-intelligence";
import { useCategories, useMaterials } from "@/hooks/use-inventory";
import { downloadCsv, downloadExcel, downloadPdfTable } from "@/lib/export";
import { addDays, formatDate, formatQuantity, todayDateInputValue, toDateInputValue } from "@/lib/utils";

type ReportType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom" | "batch";

function defaultRange(type: ReportType): { from: string; to: string } {
  const to = new Date();
  const daysMap: Record<string, number> = { daily: 0, weekly: 6, monthly: 29, quarterly: 89, yearly: 364, custom: 29, batch: 29 };
  return { from: toDateInputValue(addDays(to, -(daysMap[type] ?? 29))), to: todayDateInputValue() };
}

export function ReportsClient() {
  const [type, setType] = React.useState<ReportType>("monthly");
  const [range, setRange] = React.useState(defaultRange("monthly"));
  const [materialId, setMaterialId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");

  const { data: materials } = useMaterials({ status: "ALL" });
  const { data: categories } = useCategories();
  const { data, isPending } = useReport({ type, from: range.from, to: range.to, materialId: materialId || undefined, categoryId: categoryId || undefined });

  function changeType(next: ReportType) {
    setType(next);
    if (next !== "custom") setRange(defaultRange(next));
  }

  const rows = data?.rows ?? [];
  const batchRows = data?.batchRows ?? [];
  const isBatch = type === "batch";

  function exportData() {
    if (isBatch) {
      return batchRows.map((r) => ({
        Batch: r.batchNumber,
        Material: r.materialName,
        "Total quantity": r.totalQuantity,
        Unit: r.unit,
        Entries: r.entries,
        "First date": formatDate(r.firstDate),
        "Last date": formatDate(r.lastDate),
      }));
    }
    return rows.map((r) => ({
      Material: r.name,
      Unit: r.unit,
      Opening: r.opening,
      Purchased: r.purchased,
      Returned: r.returned,
      Consumed: r.consumed,
      Wastage: r.wastage,
      Adjustments: r.adjustments,
      Transferred: r.transferred,
      Closing: r.closing,
    }));
  }

  function exportPdf() {
    if (isBatch) {
      downloadPdfTable(
        "batch-report.pdf",
        "Batch report",
        ["Batch", "Material", "Qty", "Unit", "Entries", "First", "Last"],
        batchRows.map((r) => [r.batchNumber, r.materialName, r.totalQuantity, r.unit, r.entries, formatDate(r.firstDate), formatDate(r.lastDate)])
      );
    } else {
      downloadPdfTable(
        "inventory-report.pdf",
        `Inventory report (${range.from} to ${range.to})`,
        ["Material", "Opening", "Purchased", "Consumed", "Wastage", "Adj.", "Closing"],
        rows.map((r) => [r.name, r.opening, r.purchased, r.consumed, r.wastage, r.adjustments, r.closing])
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Opening, purchased, consumed, wastage, adjustments, and closing balance for any period."
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => downloadCsv("report.csv", exportData())}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => downloadExcel("report.xlsx", "Report", exportData())}>
              <Download className="size-4" /> Excel
            </Button>
            <Button variant="outline" className="gap-2" onClick={exportPdf}>
              <Download className="size-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={type} onValueChange={(v) => changeType(v as ReportType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
            <SelectItem value="batch">Batch summary</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={range.from}
          onChange={(e) => {
            setRange((r) => ({ ...r, from: e.target.value }));
            if (type !== "batch" && type !== "custom") setType("custom");
          }}
        />
        <Input
          type="date"
          value={range.to}
          onChange={(e) => {
            setRange((r) => ({ ...r, to: e.target.value }));
            if (type !== "batch" && type !== "custom") setType("custom");
          }}
        />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c: { id: string; name: string }) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          <option value="">All materials</option>
          {materials?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isPending ? (
            <div className="p-6 text-sm text-muted-foreground">Loading\u2026</div>
          ) : isBatch ? (
            batchRows.length === 0 ? (
              <EmptyState title="No batch-tagged usage entries in this range" description="Batch numbers are optional on Usage entries — add one on the Daily Entry page to see it here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Total quantity</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead>First</TableHead>
                    <TableHead>Last</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchRows.map((r) => (
                    <TableRow key={`${r.batchNumber}-${r.materialId}`}>
                      <TableCell className="font-medium">{r.batchNumber}</TableCell>
                      <TableCell>{r.materialName}</TableCell>
                      <TableCell className="text-right font-tabular">{formatQuantity(r.totalQuantity, r.unit)}</TableCell>
                      <TableCell className="text-right font-tabular">{r.entries}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.firstDate)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.lastDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : rows.length === 0 ? (
            <EmptyState title="No materials match these filters" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Purchased</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead className="text-right">Wastage</TableHead>
                  <TableHead className="text-right">Adjustments</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.materialId}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right font-tabular">{formatQuantity(r.opening, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular text-success">{formatQuantity(r.purchased, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular text-success">{formatQuantity(r.returned, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular text-destructive">{formatQuantity(r.consumed, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular text-destructive">{formatQuantity(r.wastage, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular">{formatQuantity(r.adjustments, r.unit)}</TableCell>
                    <TableCell className="text-right font-tabular font-semibold">{formatQuantity(r.closing, r.unit)}</TableCell>
                  </TableRow>
                ))}
                {data?.totals && (
                  <TableRow className="bg-secondary/50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.opening.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.purchased.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.returned.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.consumed.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.wastage.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.adjustments.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right font-tabular">{data.totals.closing.toLocaleString("en-IN")}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
