import { PageHeader } from "@/components/layout/PageHeader";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { LifecycleAccordion } from "@/components/company/LifecycleAccordion";

// Mock data - would come from props or context in real implementation
const mockCompany = {
  companyUid: "CMP-2024-0847",
  companyName: "Acme Corporation",
  clStage: "sales" as const,
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      
      <main className="container max-w-3xl py-8 px-6 space-y-6">
        <CompanyHeader
          companyUid={mockCompany.companyUid}
          companyName={mockCompany.companyName}
          clStage={mockCompany.clStage}
        />
        
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
            Lifecycle Stages
          </h2>
          <LifecycleAccordion defaultSection={mockCompany.clStage} />
        </section>
      </main>
    </div>
  );
}
