import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Megaphone, TrendingUp, Users } from "lucide-react";

interface AccordionSection {
  id: string;
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

interface LifecycleAccordionProps {
  defaultSection?: string;
}

export function LifecycleAccordion({ defaultSection = "outreach" }: LifecycleAccordionProps) {
  const [activeSection, setActiveSection] = useState<string>(defaultSection);

  return (
    <Accordion
      type="single"
      collapsible
      value={activeSection}
      onValueChange={(value) => setActiveSection(value)}
      className="space-y-3"
    >
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="bg-card shadow-card rounded-lg border border-border overflow-hidden data-[state=open]:shadow-card-hover transition-shadow duration-200"
        >
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`${section.colorClass}`}>
                {section.icon}
              </div>
              <div className="text-left">
                <h3 className="text-base font-medium text-foreground">
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <SectionPlaceholder sectionId={section.id} title={section.title} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

interface SectionPlaceholderProps {
  sectionId: string;
  title: string;
}

function SectionPlaceholder({ sectionId, title }: SectionPlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center animate-fade-in">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{title}</span> sub-hub placeholder
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Component ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{sectionId}</code>
      </p>
    </div>
  );
}
