"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useSettingsResource,
  useCreateSettingsResource,
  useDeleteSettingsResource,
  useUsers,
  useCreateUser,
  useUpdateUser,
} from "@/hooks/use-admin";
import { useCategories, useCreateCategory } from "@/hooks/use-inventory";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROLES } from "@/lib/constants";

function ResourceList({ resource, label }: { resource: "shifts" | "reasons"; label: string }) {
  const { data } = useSettingsResource(resource);
  const create = useCreateSettingsResource(resource);
  const remove = useDeleteSettingsResource(resource);
  const [name, setName] = React.useState("");

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate({ name: name.trim() });
          setName("");
        }}
      >
        <Input placeholder={`New ${label.toLowerCase()}\u2026`} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="gap-2">
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {data?.map((item: { id: string; name: string }) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
            <span>{item.name}</span>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(item.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </li>
        ))}
        {data?.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">None yet.</li>}
      </ul>
    </div>
  );
}

function CategoriesTab() {
  const { data } = useCategories();
  const create = useCreateCategory();
  const [name, setName] = React.useState("");

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate({ name: name.trim() });
          setName("");
        }}
      >
        <Input placeholder="New category\u2026" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="gap-2">
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {data?.map((c: { id: string; name: string }) => (
          <Badge key={c.id} variant="outline">
            {c.name}
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Categories can't be deleted while materials use them — reassign those materials first.</p>
    </div>
  );
}

function UsersTab() {
  const { data: users } = useUsers();
  const createUser = useCreateUser();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", username: "", password: "", role: "OPERATOR" as "ADMIN" | "SUPERVISOR" | "OPERATOR" });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createUser.mutateAsync(form);
    setForm({ name: "", username: "", password: "", role: "OPERATOR" });
    setDialogOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="size-4" /> Add user
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {users?.map((u: { id: string; name: string; username: string; role: string; active: boolean }) => (
          <UserRow key={u.id} user={u} />
        ))}
      </ul>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as typeof f.role }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                Create user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserRow({ user }: { user: { id: string; name: string; username: string; role: string; active: boolean } }) {
  const { data: me } = useCurrentUser();
  const update = useUpdateUser(user.id);
  const isSelf = me?.userId === user.id;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="font-medium">
          {user.name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="text-xs text-muted-foreground">{user.username}</p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={user.role} onValueChange={(v) => update.mutate({ role: v })} disabled={isSelf}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={user.active} onCheckedChange={(v) => update.mutate({ active: v })} disabled={isSelf} />
          <span className="text-xs text-muted-foreground">{user.active ? "Active" : "Disabled"}</span>
        </div>
      </div>
    </li>
  );
}

export function SettingsClient() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div>
      <PageHeader title="Settings" description="Categories, shifts, reason codes, and (for Admins) user accounts — all editable without touching code." />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="categories">
            <TabsList className="flex-wrap">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="shifts">Shifts</TabsTrigger>
              <TabsTrigger value="reasons">Reason codes</TabsTrigger>
              {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
            </TabsList>
            <TabsContent value="categories" className="mt-6">
              <CategoriesTab />
            </TabsContent>
            <TabsContent value="shifts" className="mt-6">
              <ResourceList resource="shifts" label="Shift" />
            </TabsContent>
            <TabsContent value="reasons" className="mt-6">
              <ResourceList resource="reasons" label="Reason" />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="users" className="mt-6">
                <UsersTab />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
