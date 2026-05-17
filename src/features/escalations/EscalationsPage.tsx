import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ShieldAlert, 
  Bell, 
  Settings2, 
  Loader2, 
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Mail,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  fetchEscalationRules, 
  fetchEscalationLogs, 
  updateEscalationRule,
  runEscalationCheck 
} from "./escalationApi";
import { cn } from "@/lib/utils";

export function EscalationsPage() {
  const qc = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const { data: rules = [], isLoading: rLoading } = useQuery({
    queryKey: ["escalation-rules"],
    queryFn: fetchEscalationRules,
  });

  const { data: logs = [], isLoading: lLoading } = useQuery({
    queryKey: ["escalation-logs"],
    queryFn: fetchEscalationLogs,
  });

  const updateRule = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => updateEscalationRule(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["escalation-rules"] }),
  });

  const handleRunCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);
    try {
      const result = await runEscalationCheck();
      setCheckResult(`${result.triggered} new escalations triggered and notifications sent via Resend.`);
      qc.invalidateQueries({ queryKey: ["escalation-logs"] });
      window.setTimeout(() => setCheckResult(null), 5000);
    } finally {
      setIsChecking(false);
    }
  };

  if (rLoading || lLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Escalations & Reminders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure automated nudge rules and track notification history.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={handleRunCheck}
          disabled={isChecking}
          className="gap-2"
        >
          {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Trigger Manual Check
        </Button>
      </div>

      {checkResult && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {checkResult}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rules Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Settings2 className="h-4 w-4" />
            Active Rules
          </h3>
          {rules.map((rule) => (
            <Card key={rule.id} className={cn(!rule.is_active && "opacity-60")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-sm capitalize">{rule.rule_type.replace("_", " ")}</div>
                    <div className="text-xs text-muted-foreground">
                      Escalate to {rule.target_role} after {rule.threshold_days} days.
                    </div>
                  </div>
                  <Switch 
                    checked={rule.is_active} 
                    onCheckedChange={(checked: boolean) => updateRule.mutate({ id: rule.id, patch: { is_active: checked } })}
                    disabled={updateRule.isPending}
                  />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Input 
                    type="number" 
                    defaultValue={rule.threshold_days} 
                    className="h-8 w-16 text-xs"
                    onBlur={(e) => updateRule.mutate({ id: rule.id, patch: { threshold_days: parseInt(e.target.value) } })}
                  />
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Day Threshold</span>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="rounded-lg border border-dashed p-4 text-center">
            <Button variant="ghost" size="sm" className="text-xs" disabled>
              + Add Custom Rule
            </Button>
          </div>
        </div>

        {/* Logs Main */}
        <div className="space-y-4 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <History className="h-4 w-4" />
            Escalation History
          </h3>
          <div className="rounded-md border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">
                      No escalations triggered yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="rounded bg-amber-100 p-1 text-amber-700">
                            <Bell className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="text-xs font-medium uppercase tracking-tight">Nudge Sent</div>
                            <div className="text-[10px] text-muted-foreground">Late Goal Submission</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {log.target_name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs">{log.target_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold uppercase text-emerald-600">Delivered</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground font-mono">
                        {new Date(log.triggered_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Email Preview */}
          <Card className="bg-primary/[0.02] border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-4 w-4" />
                <CardTitle className="text-sm">Email Template Preview (Resend)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white p-6 shadow-sm">
                <div className="border-b pb-4 mb-4">
                  <div className="text-xs text-muted-foreground mb-1">Subject: Action Required: Goal Setting Deadline</div>
                  <div className="text-xs text-muted-foreground">From: Cadence Support &lt;support@cadence.demo&gt;</div>
                </div>
                <div className="space-y-4 text-sm text-slate-700">
                  <p>Hi {'{'}name{'}'},</p>
                  <p>This is an automated reminder that your goal setting for <strong>{'{'}cycle_name{'}'}</strong> is currently pending. The deadline was {'{'}threshold{'}'} days ago.</p>
                  <p>Please log in to Cadence to submit your goals for manager approval as soon as possible.</p>
                  <Button size="sm" className="mt-2 pointer-events-none">View Goals</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
