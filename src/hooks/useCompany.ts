import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company, LifecycleEvent } from "@/types/company";

export function useCompany(companyUid: string) {
  return useQuery({
    queryKey: ["company", companyUid],
    queryFn: async (): Promise<Company | null> => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("company_uid", companyUid)
        .maybeSingle();

      if (error) throw error;
      return data as Company | null;
    },
  });
}

export function useLifecycleEvents(companyId: string | undefined) {
  return useQuery({
    queryKey: ["lifecycle-events", companyId],
    queryFn: async (): Promise<LifecycleEvent[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("lifecycle_events")
        .select("*")
        .eq("company_id", companyId)
        .order("event_timestamp", { ascending: false });

      if (error) throw error;
      return (data as LifecycleEvent[]) ?? [];
    },
    enabled: !!companyId,
  });
}
