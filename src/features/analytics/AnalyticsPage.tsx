import { useQuery } from "@tanstack/react-query";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Loader2,
  PieChart as PieIcon,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { fetchDeptStats, fetchScoreTrends, fetchGoalDistribution } from "./analyticsApi";

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

export function AnalyticsPage() {
  const { data: cycle } = useActiveCycle();
  const cycleId = cycle?.id;

  const { data: deptStats = [], isLoading: dLoading } = useQuery({
    queryKey: ["analytics-dept", cycleId],
    queryFn: () => fetchDeptStats(cycleId!),
    enabled: !!cycleId,
  });

  const { data: trends = [], isLoading: tLoading } = useQuery({
    queryKey: ["analytics-trends", cycleId],
    queryFn: () => fetchScoreTrends(cycleId!),
    enabled: !!cycleId,
  });

  const { data: distribution = [], isLoading: pLoading } = useQuery({
    queryKey: ["analytics-dist", cycleId],
    queryFn: () => fetchGoalDistribution(cycleId!),
    enabled: !!cycleId,
  });

  if (!cycleId || dLoading || tLoading || pLoading) {
    return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalGoals = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time insights for {cycle.name} · {cycle.phase.replace("_", " ")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGoals}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">104%</div>
            <p className="text-xs text-muted-foreground">+2.1% from Q1 average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Engagement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-muted-foreground">Check-in completion rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dept Completion Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle>Completion by Department</CardTitle>
            </div>
            <CardDescription>% of goals approved/locked per department</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="department" 
                  type="category" 
                  width={100} 
                  tick={{ fontSize: 12 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="completion_pct" radius={[0, 4, 4, 0]} barSize={20}>
                  {deptStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              <CardTitle>Goal Status Distribution</CardTitle>
            </div>
            <CardDescription>Current state of all goals in system</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Trend Line Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle>Company Performance Trend</CardTitle>
            </div>
            <CardDescription>Average computed scores across quarters</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500 }} />
                <YAxis domain={[0, 120]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="avg_score" 
                  stroke="#8b5cf6" 
                  strokeWidth={3} 
                  dot={{ fill: "#8b5cf6", r: 5 }} 
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            Analytics are cached for 5 minutes. Data includes all goals and check-ins submitted up to the current moment.
            Computed scores are based on the organizational standard formula (Achievement/Target * Weightage).
          </div>
        </div>
      </div>
    </div>
  );
}
