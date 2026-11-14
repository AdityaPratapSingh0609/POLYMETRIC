"use client";

import { useQuery } from "@tanstack/react-query";
import type { CurrentUserPayload } from "@/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async (): Promise<CurrentUserPayload> => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: 0,
  });
}
