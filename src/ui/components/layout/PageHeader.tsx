import { Building2 } from "lucide-react";

export function PageHeader() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="container flex h-14 items-center gap-3 px-6">
        <div className="flex items-center gap-2 text-primary">
          <Building2 className="h-5 w-5" />
          <span className="font-semibold text-foreground">Company Lifecycle</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Hub</span>
      </div>
    </header>
  );
}
