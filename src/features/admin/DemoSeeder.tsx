import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wand2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const DEMO_GOALS = [
  { title: "Launch new onboarding portal", description: "Build and deploy internal onboarding system", thrust_area: "Innovation", uom_type: "min", target: 30, weightage: 25 },
  { title: "Reduce customer churn to 5%", description: "Implement retention campaigns", thrust_area: "Customer Excellence", uom_type: "max", target: 5, weightage: 25 },
  { title: "Complete cloud certification", description: "AWS Solutions Architect cert", thrust_area: "People Development", uom_type: "timeline", target: 100, weightage: 25 },
  { title: "Zero security incidents", description: "Maintain SOC2 compliance with zero breaches", thrust_area: "Operational Quality", uom_type: "zero", target: 0, weightage: 25 },
];

async function seedDemoData() {
  // 1. Get all non-admin users
  const { data: users } = await supabase.from("users").select("id, role").neq("role", "admin");
  if (!users?.length) throw new Error("No users to seed");

  // 2. Get active cycle
  const { data: cycles } = await supabase.from("cycles").select("id").eq("status", "active").limit(1);
  const cycleId = cycles?.[0]?.id;
  if (!cycleId) throw new Error("No active cycle. Create one first.");

  let created = 0;

  for (const user of users) {
    // Delete existing goals for this user in this cycle
    await supabase.from("goals").delete().eq("employee_id", user.id).eq("cycle_id", cycleId);

    // Insert 4 goals
    for (const g of DEMO_GOALS) {
      const { error } = await supabase.from("goals").insert({
        employee_id: user.id,
        cycle_id: cycleId,
        title: g.title,
        description: g.description,
        thrust_area: g.thrust_area,
        uom_type: g.uom_type,
        target: g.target,
        weightage: g.weightage,
        status: "draft",
      });
      if (!error) created++;
    }
  }

  return { created, users: users.length };
}

export function DemoSeeder() {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);

  const seed = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      qc.invalidateQueries();
      setDone(true);
      window.setTimeout(() => setDone(false), 3000);
    },
  });

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Wand2 className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">Generate Demo Data</div>
        <div className="text-sm text-muted-foreground">
          Auto-populates realistic goals for all employees in the active cycle.
        </div>
      </div>
      <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
        {seed.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
        {done ? "Seeded" : seed.isPending ? "Seeding..." : "Seed"}
      </Button>
    </div>
  );
}
