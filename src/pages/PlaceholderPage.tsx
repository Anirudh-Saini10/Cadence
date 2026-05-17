import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function PlaceholderPage({ title, description, phase }: { title: string; description: string; phase: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Coming next</CardTitle>
          </div>
          <CardDescription>Build phase: <span className="font-medium text-foreground">{phase}</span></CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This screen is part of the upcoming build phase. The infra, auth, role routing, and the role switcher are already working — log in as each role to verify routing and RLS.
        </CardContent>
      </Card>
    </div>
  );
}
