"use client";

import { useQuery } from "@tanstack/react-query";
import type { BatchReportRow, DashboardData, ReportRow } from "@/types";
import type { AbnormalConsumption, DeadStockEntry, MaterialForecast, MaterialTrend, MoMComparison, MovingMaterial } from "@/lib/analytics";

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Something went wrong");
  }
  return res.json();
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => jsonOrThrow(await fetch("/api/dashboard")),
    refetchInterval: 60_000,
  });
}

export type AnalyticsOverview = {
  momComparison: MoMComparison[];
  trends: MaterialTrend[];
  insights: string[];
  forecasts: MaterialForecast[];
  abnormal: AbnormalConsumption[];
  deadStock: DeadStockEntry[];
  fastMoving: MovingMaterial[];
  slowMoving: MovingMaterial[];
};

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async (): Promise<AnalyticsOverview> => jsonOrThrow(await fetch("/api/analytics")),
  });
}

export type ReportFilters = {
  type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom" | "batch";
  from: string;
  to: string;
  materialId?: string;
  categoryId?: string;
};

export function useReport(filters: ReportFilters) {
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: async (): Promise<{ rows: ReportRow[]; batchRows: BatchReportRow[]; totals: ReportRow }> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });
      return jsonOrThrow(await fetch(`/api/reports?${params.toString()}`));
    },
  });
}
