// CL Doctrine: Company types matching sovereign hub schema

export type CLStage = "outreach" | "sales" | "client";

export interface Company {
  id: string;
  company_uid: string;
  company_name: string;
  cl_stage: CLStage;
  outreach_uid: string | null;
  sales_uid: string | null;
  client_uid: string | null;
  created_at: string;
  promoted_to_sales_at: string | null;
  promoted_to_client_at: string | null;
  entry_source: string | null;
}

export interface LifecycleEvent {
  id: string;
  company_id: string;
  event_type: string;
  from_stage: string | null;
  to_stage: string | null;
  event_timestamp: string;
  event_source: string | null;
  event_payload: Record<string, unknown> | null;
  created_at: string;
}
