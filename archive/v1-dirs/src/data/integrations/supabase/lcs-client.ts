/**
 * LCS Schema Client — untyped Supabase client for lcs schema queries.
 *
 * The auto-generated Database type only covers the `public` schema.
 * LCS tables live in the `lcs` schema on Neon, accessed via PostgREST.
 * This wrapper provides an untyped client so `.from()` and `.rpc()` accept
 * arbitrary table/function names without TS errors.
 *
 * Usage:
 *   import { lcsClient } from '@/data/integrations/supabase/lcs-client';
 *   const { data } = await lcsClient.from('event').select('*');
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Untyped client — no Database generic, so .from() accepts any string.
export const lcsClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'lcs' },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
