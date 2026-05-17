import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/stores/authStore";
import { isSupabaseConfigured } from "@/lib/supabase";

const DEMO = [
  { label: "Admin",    email: "admin@cadence.demo",   password: "cadence123" },
  { label: "Manager",  email: "manager@cadence.demo", password: "cadence123" },
  { label: "Employee", email: "priya@cadence.demo",   password: "cadence123" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const signIn = useAuth((s) => s.signIn);
  const loading = useAuth((s) => s.loading);
  const [email, setEmail] = useState("priya@cadence.demo");
  const [password, setPassword] = useState("cadence123");
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) setError(error);
    else navigate("/", { replace: true });
  };

  const quick = async (e: string, p: string) => {
    setEmail(e); setPassword(p); setError(null);
    const { error } = await signIn(e, p);
    if (error) setError(error);
    else navigate("/", { replace: true });
  };

  return (
    <div className="grid min-h-full place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Cadence</CardTitle>
          </div>
          <CardDescription>Goal Setting & Performance Tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseConfigured && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="font-semibold">Supabase not configured</div>
              Copy <code className="font-mono">.env.example</code> to{" "}
              <code className="font-mono">.env</code> and add your project URL +
              anon key.
            </div>
          )}
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email}
                     onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password"
                     value={password} onChange={(e) => setPassword(e.target.value)}
                     required />
            </div>
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="rounded-md border bg-card p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Demo accounts
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO.map((d) => (
                <Button
                  key={d.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quick(d.email, d.password)}
                  disabled={loading}
                >
                  {d.label}
                </Button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              Password for all demo accounts: <code className="font-mono">cadence123</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
