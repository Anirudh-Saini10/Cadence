import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, RotateCcw, Users, CheckCircle2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { fetchAllUsers, updateUser, resetGoalStatus, fetchGoalsForAdmin } from "./adminApi";
import type { UserRow, UserRole, GoalRow } from "@/types/database";

export function UsersAdminPage() {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAllUsers,
  });
  const { data: cycle } = useActiveCycle();
  const cycleId = cycle?.id ?? "";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "" as UserRole });
  const [viewGoalsUserId, setViewGoalsUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (args: { id: string; patch: Partial<Pick<UserRow, "name" | "email" | "role">> }) =>
      updateUser(args.id, args.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingId(null);
      showToast("User updated");
    },
  });

  const resetGoal = useMutation({
    mutationFn: resetGoalStatus,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-goals", viewGoalsUserId, cycleId] });
      showToast("Goal reset to draft");
    },
  });

  const { data: userGoals = [] } = useQuery({
    queryKey: ["admin-goals", viewGoalsUserId, cycleId],
    queryFn: () => fetchGoalsForAdmin(viewGoalsUserId!, cycleId),
    enabled: Boolean(viewGoalsUserId && cycleId),
  });

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage employee and manager names, emails, roles. Click a row to view and reset goals.
        </p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {toast}
        </div>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <Card key={u.id} className={viewGoalsUserId === u.id ? "border-primary/40" : ""}>
            <CardContent className="py-4">
              {editingId === u.id ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Role</Label>
                    <Select
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        update.mutate({
                          id: u.id,
                          patch: {
                            name: editForm.name || undefined,
                            email: editForm.email || undefined,
                            role: editForm.role || undefined,
                          },
                        })
                      }
                      disabled={update.isPending}
                    >
                      {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{u.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {u.role}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(u.id);
                        setEditForm({ name: u.name ?? "", email: u.email ?? "", role: u.role });
                      }}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={viewGoalsUserId === u.id ? "default" : "outline"}
                      onClick={() => setViewGoalsUserId(viewGoalsUserId === u.id ? null : u.id)}
                    >
                      {viewGoalsUserId === u.id ? "Hide Goals" : "View Goals"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline goals panel */}
              {viewGoalsUserId === u.id && (
                <div className="mt-4 border-t pt-4">
                  {!cycleId ? (
                    <p className="text-sm text-muted-foreground">No active cycle.</p>
                  ) : userGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No goals in current cycle.</p>
                  ) : (
                    <div className="space-y-2">
                      {userGoals.map((g) => (
                        <GoalResetRow key={g.id} goal={g} onReset={() => resetGoal.mutate(g.id)} isPending={resetGoal.isPending} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GoalResetRow({
  goal,
  onReset,
  isPending,
}: {
  goal: GoalRow;
  onReset: () => void;
  isPending: boolean;
}) {
  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-amber-50 text-amber-700",
    locked: "bg-emerald-50 text-emerald-700",
    returned: "bg-red-50 text-red-700",
  };
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{goal.title || "Untitled goal"}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`rounded px-1.5 py-0.5 font-medium ${statusColor[goal.status] ?? "bg-gray-100 text-gray-700"}`}>
            {goal.status}
          </span>
          <span>{goal.weightage}% weight</span>
          {goal.locked_at && <span className="text-emerald-700">Locked</span>}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onReset} disabled={isPending}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  );
}
