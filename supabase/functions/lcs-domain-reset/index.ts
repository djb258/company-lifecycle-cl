/**
 * LCS Domain Reset — Supabase Edge Function
 *
 * Resets sent_today counter for all domains in lcs.domain_pool at midnight ET.
 * Called by Supabase cron: 0 5 * * * (UTC = midnight ET during EST).
 *
 * Authority: HUB-CL-001, SUBHUB-CL-LCS
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Reset sent_today for all non-DEAD domains
    const { data, error } = await supabase
      .schema('lcs')
      .from('domain_pool')
      .update({
        sent_today: 0,
        updated_at: new Date().toISOString(),
      })
      .neq('status', 'DEAD')
      .select('id');

    if (error) {
      console.error('[Domain Reset] Update failed:', error.message);
      return new Response(JSON.stringify({ status: 'error', reason: error.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resetCount = data?.length ?? 0;
    console.log(`[Domain Reset] Reset sent_today for ${resetCount} domains`);

    return new Response(JSON.stringify({ status: 'ok', domains_reset: resetCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[Domain Reset] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
