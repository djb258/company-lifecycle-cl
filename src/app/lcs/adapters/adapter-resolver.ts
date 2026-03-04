import type { LcsAdapter } from './types';
import type { Channel } from '@/data/lcs';
import { LovableDeliveryAdapter } from './lovable-delivery-adapter';

/**
 * Adapter Resolver — routes all channels through LovableDeliveryAdapter.
 *
 * All egress channels (MG, HR, SH) are delivered via the single Lovable
 * delivery endpoint. CL sends the structured payload with channel context;
 * Lovable resolves templates and routes to the appropriate delivery service.
 *
 * @deprecated Direct adapters (MailgunAdapter, HeyReachAdapter, SalesHandoffAdapter)
 * are retained as reference but no longer used in the pipeline. All delivery
 * routes through LOVABLE_DELIVERY_URL.
 */

const lovableAdapter = new LovableDeliveryAdapter();

/**
 * Resolve an adapter by channel code.
 * All channels route through the Lovable delivery adapter.
 */
export function resolveAdapter(_channel: Channel): LcsAdapter | null {
  return lovableAdapter;
}

/**
 * Get the canonical delivery adapter.
 */
export function getDeliveryAdapter(): LcsAdapter {
  return lovableAdapter;
}
