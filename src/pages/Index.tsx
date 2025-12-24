import { PageHeader } from "@/components/layout/PageHeader";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { LifecycleAccordion } from "@/components/company/LifecycleAccordion";
import { useCompany } from "@/hooks/useCompany";
import { Skeleton } from "@/components/ui/skeleton";

// Demo company UID - would come from route params in real implementation
const DEMO_COMPANY_UID = "CMP-2024-0847";

export default function Index() {
  const { data: company, isLoading, error } = useCompany(DEMO_COMPANY_UID);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />
      
      <main className="container max-w-3xl py-8 px-6 space-y-6">
        {isLoading ? (
          <CompanyHeaderSkeleton />
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            Failed to load company data
          </div>
        ) : company ? (
          <>
            <CompanyHeader
              companyUid={company.company_uid}
              companyName={company.company_name}
              clStage={company.cl_stage}
            />
            
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">
                Lifecycle Stages
              </h2>
              <LifecycleAccordion 
                defaultSection={company.cl_stage}
                subHubPointers={{
                  outreach: company.outreach_uid,
                  sales: company.sales_uid,
                  client: company.client_uid,
                }}
                lifecycleTimestamps={{
                  created: company.created_at,
                  promotedToSales: company.promoted_to_sales_at,
                  promotedToClient: company.promoted_to_client_at,
                }}
              />
            </section>
          </>
        ) : (
          <div className="bg-muted rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No company found</p>
          </div>
        )}
      </main>
    </div>
  );
}

function CompanyHeaderSkeleton() {
  return (
    <div className="bg-card shadow-card rounded-lg border border-border p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
