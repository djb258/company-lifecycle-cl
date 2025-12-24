import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Megaphone, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface AccordionSection {
  id: "outreach" | "sales" | "client";
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
}

const sections: AccordionSection[] = [
  {
    id: "outreach",
    title: "Outreach",
    description: "Lead generation and initial contact management",
    icon: <Megaphone className="h-5 w-5" />,
    colorClass: "text-stage-outreach",
  },
  {
    id: "sales",
    title: "Sales",
    description: "Pipeline management and deal progression",
    icon: <TrendingUp className="h-5 w-5" />,
    colorClass: "text-stage-sales",
  },
  {
    id: "client",
    title: "Client",
    description: "Account management and relationship nurturing",
    icon: <Users className="h-5 w-5" />,
    colorClass: "text-stage-client",
  },
];

interface SubHubPointers {
  outreach: string | null;
  sales: string | null;
  client: string | null;
}

interface LifecycleTimestamps {
  created: string;
  promotedToSales: string | null;
  promotedToClient: string | null;
}

interface LifecycleAccordionProps {
  defaultSection?: string;
  subHubPointers?: SubHubPointers;
  lifecycleTimestamps?: LifecycleTimestamps;
}

export function LifecycleAccordion({ 
  defaultSection = "outreach",
  subHubPointers,
  lifecycleTimestamps,
}: LifecycleAccordionProps) {
  const [activeSection, setActiveSection] = useState<string>(defaultSection);

  const getSubHubUid = (sectionId: "outreach" | "sales" | "client") => {
    return subHubPointers?.[sectionId] ?? null;
  };

  const getTimestamp = (sectionId: "outreach" | "sales" | "client") => {
    if (!lifecycleTimestamps) return null;
    switch (sectionId) {
      case "outreach":
        return lifecycleTimestamps.created;
      case "sales":
        return lifecycleTimestamps.promotedToSales;
      case "client":
        return lifecycleTimestamps.promotedToClient;
    }
  };

  return (
    <Accordion
      type="single"
      collapsible
      value={activeSection}
      onValueChange={(value) => setActiveSection(value)}
      className="space-y-3"
    >
      {sections.map((section) => {
        const subHubUid = getSubHubUid(section.id);
        const timestamp = getTimestamp(section.id);
        const isActivated = !!subHubUid;

        return (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="bg-card shadow-card rounded-lg border border-border overflow-hidden data-[state=open]:shadow-card-hover transition-shadow duration-200"
          >
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                <div className={`${section.colorClass}`}>
                  {section.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-foreground">
                      {section.title}
                    </h3>
                    {isActivated && (
                      <Badge variant="outline" className="text-xs bg-stage-client/10 text-stage-client border-stage-client/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <SectionPlaceholder 
                sectionId={section.id} 
                title={section.title}
                subHubUid={subHubUid}
                timestamp={timestamp}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

interface SectionPlaceholderProps {
  sectionId: string;
  title: string;
  subHubUid: string | null;
  timestamp: string | null;
}

function SectionPlaceholder({ sectionId, title, subHubUid, timestamp }: SectionPlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center animate-fade-in space-y-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span> sub-hub placeholder
      </p>
      
      <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        {subHubUid && (
          <div>
            Sub-hub ID: <code className="bg-muted px-1.5 py-0.5 rounded">{subHubUid}</code>
          </div>
        )}
        {timestamp && (
          <div>
            {sectionId === "outreach" ? "Created" : "Promoted"}: {format(new Date(timestamp), "MMM d, yyyy")}
          </div>
        )}
      </div>
      
      {!subHubUid && (
        <p className="text-xs text-muted-foreground/70 italic">
          Not yet activated
        </p>
      )}
    </div>
  );
}
