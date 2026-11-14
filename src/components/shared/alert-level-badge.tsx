import { Badge } from "@/components/ui/badge";

export function AlertLevelBadge({ level }: { level: "critical" | "warning" | "watch" | null }) {
  if (level === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (level === "warning") return <Badge variant="warning">Warning</Badge>;
  if (level === "watch") return <Badge variant="secondary">Watch</Badge>;
  return <Badge variant="success">Healthy</Badge>;
}
