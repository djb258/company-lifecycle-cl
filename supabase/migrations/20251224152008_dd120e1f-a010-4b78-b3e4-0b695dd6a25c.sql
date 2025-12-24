-- Companies table (sovereign identity per CL Doctrine)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_uid TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  cl_stage TEXT NOT NULL DEFAULT 'outreach' CHECK (cl_stage IN ('outreach', 'sales', 'client')),
  
  -- Sub-hub pointers (nullable until activated)
  outreach_uid TEXT,
  sales_uid TEXT,
  client_uid TEXT,
  
  -- Lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted_to_sales_at TIMESTAMPTZ,
  promoted_to_client_at TIMESTAMPTZ,
  
  -- Entry source metadata
  entry_source TEXT
);

-- Lifecycle events audit trail (immutable log per CL Doctrine)
CREATE TABLE public.lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_source TEXT,
  event_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: UI is read-only egress spoke per doctrine
CREATE POLICY "Public read access for companies" 
ON public.companies FOR SELECT 
USING (true);

CREATE POLICY "Public read access for lifecycle events" 
ON public.lifecycle_events FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_companies_cl_stage ON public.companies(cl_stage);
CREATE INDEX idx_lifecycle_events_company_id ON public.lifecycle_events(company_id);
CREATE INDEX idx_lifecycle_events_event_type ON public.lifecycle_events(event_type);

-- Insert seed data for demo
INSERT INTO public.companies (company_uid, company_name, cl_stage, outreach_uid, entry_source)
VALUES ('CMP-2024-0847', 'Acme Corporation', 'sales', 'OUT-2024-0847', 'manual_entry');