import { PageHeader } from "@/ui/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Badge } from "@/ui/components/ui/badge";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { Separator } from "@/ui/components/ui/separator";

const registrySections = [
  { title: "Signal Registry", id: "signals", count: 9, description: "Pressure signals from sub-hubs" },
  { title: "Frame Registry", id: "frames", count: 10, description: "Communication frame catalog" },
  { title: "Adapter Registry", id: "adapters", count: 3, description: "Delivery channel adapters" },
] as const;

export default function LCS() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader />

      <main className="container max-w-5xl py-8 px-6 space-y-8">
        {/* Hero */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Lifecycle Communication Spine
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              SUBHUB-CL-LCS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Read-only view of the canonical event ledger and communication orchestration engine.
          </p>
        </div>

        <Separator />

        {/* Pipeline Health (skeleton) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Pipeline Health
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {["Events Today", "Errors (24h)", "Adapters Active"].map((label) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Registries (skeleton) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Registries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {registrySections.map((reg) => (
              <Card key={reg.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-foreground">
                      {reg.title}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {reg.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{reg.description}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CET Recent Events (skeleton) */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Recent Events (CET)
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
