import { Link } from "react-router-dom";
import {
  Sparkles, Target, TrendingUp, ShieldCheck, Zap, BarChart3, Users, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Target,
    title: "Smart Goal Setting",
    desc: "Weighted OKRs with 8 goal types, auto-validated for 100% weightage before submission.",
  },
  {
    icon: TrendingUp,
    title: "Auto-Scored Check-ins",
    desc: "5 UoM formulas (Min, Max, Zero, Timeline, Milestone) compute scores automatically.",
  },
  {
    icon: Users,
    title: "Manager Review Flow",
    desc: "Approve, return for rework, or lock goals. Full audit trail of every decision.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    desc: "Department completion rates, score trends, and goal distribution in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Escalation Engine",
    desc: "Configurable nudge rules with email notifications for overdue submissions.",
  },
  {
    icon: Zap,
    title: "Demo Mode",
    desc: "Instantly switch between Employee, Manager, and Admin views with one click.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Nav */}
      <nav className="flex h-16 items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Cadence</span>
        </div>
        <Link to="/login">
          <Button>Sign in</Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Zap className="h-3 w-3 text-amber-500" />
          Performance management, reimagined
        </div>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Goal Setting &<br />
          <span className="text-primary">Performance Tracking</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A complete performance management cycle from goal setting to quarterly check-ins,
          with auto-scoring, manager approvals, and real-time analytics.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="gap-2">
              Launch Demo <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            No signup required
          </span>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-left">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y bg-card/50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-primary">5</div>
              <div className="mt-1 text-sm text-muted-foreground">UoM Formulas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">9</div>
              <div className="mt-1 text-sm text-muted-foreground">Phases</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">3</div>
              <div className="mt-1 text-sm text-muted-foreground">Role Views</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">0</div>
              <div className="mt-1 text-sm text-muted-foreground">Manual Scoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-muted-foreground">
        Built for hackathons. Launch the demo to explore Employee, Manager, and Admin flows.
      </footer>
    </div>
  );
}
