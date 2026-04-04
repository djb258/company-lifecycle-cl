import { Badge } from "@/ui/components/ui/badge";

export type CLStage = "outreach" | "sales" | "client";

interface CompanyHeaderProps {
  companyUid: string;
  companyName: string;
  clStage: CLStage;
}

const stageConfig: Record<CLStage, { label: string; className: string }> = {
  outreach: {
    label: "Outreach",
    className: "bg-stage-outreach/10 text-stage-outreach border-stage-outreach/20",
  },
  sales: {
    label: "Sales",
    className: "bg-stage-sales/10 text-stage-sales border-stage-sales/20",
  },
  client: {
    label: "Client",
    className: "bg-stage-client/10 text-stage-client border-stage-client/20",
  },
};

export function CompanyHeader({ companyUid, companyName, clStage }: CompanyHeaderProps) {
  const stage = stageConfig[clStage];

  return (
    <div className="bg-card shadow-card rounded-lg border border-border p-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {companyUid}
          </p>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {companyName}
          </h1>
        </div>
        <Badge variant="outline" className={`${stage.className} font-medium`}>
          {stage.label}
        </Badge>
      </div>
    </div>
  );
}
