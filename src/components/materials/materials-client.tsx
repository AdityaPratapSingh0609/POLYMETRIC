"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Search, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategories, useMaterials, useUpdateMaterial } from "@/hooks/use-inventory";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatQuantity } from "@/lib/utils";
import { MaterialForm } from "@/components/materials/material-form";
import type { MaterialWithStock } from "@/types";

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  if (status === "INACTIVE") return <Badge variant="secondary">Inactive</Badge>;
  return <Badge variant="outline">Archived</Badge>;
}

function RowActions({
  material,
  onEdit,
}: {
  material: MaterialWithStock;
  onEdit: (m: MaterialWithStock) => void;
}) {
  const { data: user } = useCurrentUser();
  const update = useUpdateMaterial(material.id);
  const isAdmin = user?.role === "ADMIN";
  const canEdit = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/materials/${material.id}`}>View ledger</Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(material)}>
            <Pencil className="mr-2 size-4" /> Edit details
          </DropdownMenuItem>
        )}
        {material.status === "ACTIVE" && (
          <DropdownMenuItem onClick={() => update.mutate({ status: "INACTIVE" })}>Deactivate</DropdownMenuItem>
        )}
        {material.status === "INACTIVE" && (
          <DropdownMenuItem onClick={() => update.mutate({ status: "ACTIVE" })}>Reactivate</DropdownMenuItem>
        )}
        {isAdmin && material.status !== "ARCHIVED" && (
          <DropdownMenuItem onClick={() => update.mutate({ status: "ARCHIVED" })} className="text-destructive">
            Archive
          </DropdownMenuItem>
        )}
        {isAdmin && material.status === "ARCHIVED" && (
          <DropdownMenuItem onClick={() => update.mutate({ status: "ACTIVE" })}>Restore</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MaterialsClient() {
  const [status, setStatus] = React.useState<string>("ACTIVE");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [q, setQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MaterialWithStock | undefined>(undefined);

  const { data: categories } = useCategories();
  const { data: materials, isPending } = useMaterials({
    status: status === "ALL" ? "ALL" : status,
    categoryId: categoryId || undefined,
    q: q || undefined,
  });

  return (
    <div>
      <PageHeader
        title="Materials"
        description="Every chemical, colour, or compound the plant tracks — add new ones any time, no code changes needed."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="size-4" /> Add material
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="ACTIVE">Active</TabsTrigger>
            <TabsTrigger value="INACTIVE">Inactive</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search materials\u2026" className="w-56 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !materials || materials.length === 0 ? (
        <EmptyState
          title="No materials match these filters"
          description="Try a different status or category, or add your first material."
          action={<Button onClick={() => setFormOpen(true)}>Add material</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Colour</TableHead>
                <TableHead className="text-right">Current stock</TableHead>
                <TableHead className="text-right">Minimum</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m) => {
                const low = m.currentStock <= m.minimumStock;
                return (
                  <TableRow key={m.id} className={low ? "bg-destructive/5" : undefined}>
                    <TableCell className="font-medium">
                      <Link href={`/materials/${m.id}`} className="hover:underline">
                        {m.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.colourName ? `${m.colourName}${m.colourQuantity ? ` \u00b7 ${formatQuantity(m.colourQuantity, m.colourUnit ?? "")}` : ""}` : "\u2014"}
                    </TableCell>
                    <TableCell className={`text-right font-tabular ${low ? "font-semibold text-destructive" : ""}`}>
                      {formatQuantity(m.currentStock, m.unit)}
                    </TableCell>
                    <TableCell className="text-right font-tabular text-muted-foreground">{formatQuantity(m.minimumStock, m.unit)}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell>
                      <RowActions
                        material={m}
                        onEdit={(mat) => {
                          setEditing(mat);
                          setFormOpen(true);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <MaterialForm open={formOpen} onOpenChange={setFormOpen} material={editing} />
    </div>
  );
}
