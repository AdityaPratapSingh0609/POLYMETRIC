"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { TransactionTypeValue } from "@/lib/constants";

const TABS: Array<{ value: TransactionTypeValue; label: string; roles: string[] }> = [
  { value: "USAGE", label: "Usage", roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { value: "PURCHASE", label: "Purchase", roles: ["ADMIN", "SUPERVISOR"] },
  { value: "WASTAGE", label: "Wastage", roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { value: "RETURN", label: "Return", roles: ["ADMIN", "SUPERVISOR", "OPERATOR"] },
  { value: "ADJUSTMENT", label: "Adjustment", roles: ["ADMIN", "SUPERVISOR"] },
  { value: "TRANSFER", label: "Transfer", roles: ["ADMIN", "SUPERVISOR"] },
];

export function EntryClient() {
  const { data: user } = useCurrentUser();
  const availableTabs = TABS.filter((t) => !user || t.roles.includes(user.role));

  return (
    <div>
      <PageHeader title="Daily entry" description="Record a movement in a few taps. Stock updates the moment you save." />
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="USAGE">
            <TabsList className="flex-wrap">
              {availableTabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableTabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-6">
                <TransactionForm type={t.value} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
