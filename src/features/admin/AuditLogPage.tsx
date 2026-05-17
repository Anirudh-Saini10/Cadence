import { useQuery } from "@tanstack/react-query";
import { 
  History, 
  Loader2, 
  Search, 
  Filter,
  ArrowUpDown,
  User,
  Activity,
  Calendar
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchAuditLogs } from "./adminApi";
import { cn } from "@/lib/utils";

export function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: fetchAuditLogs,
  });

  if (isLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track system-wide changes, policy overrides, and key events.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search logs by action, actor, or details..." className="pl-9" />
        </div>
        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      <div className="rounded-md border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target ID</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                  No logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {log.actor_name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{log.actor_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight",
                      log.change_type.includes("delete") ? "bg-red-50 text-red-700" :
                      log.change_type.includes("approve") ? "bg-emerald-50 text-emerald-700" :
                      log.change_type.includes("advance") ? "bg-blue-50 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {log.change_type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {log.goal_id ? log.goal_id.substring(0, 8) : "N/A"}...
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[300px] truncate text-xs" title={JSON.stringify(log.new_value, null, 2)}>
                      {JSON.stringify(log.new_value) || log.reason}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
