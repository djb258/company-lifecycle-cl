import type { LcsAdapter } from './types';
import type { Channel } from '@/data/lcs';
import { MailgunAdapter } from './mailgun-adapter';
import { HeyReachAdapter } from './heyreach-adapter';
import { SalesHandoffAdapter } from './sales-handoff-adapter';

/**
 * Adapter Resolver — factory that maps channel code → adapter instance.
 *
 * What triggers this? The runtime pipeline (Prompt 7) needs an adapter for a given channel.
 * How do we get it? Channel code from signal or adapter_registry determines which adapter.
 *
 * Adapters are singletons (stateless) — one instance per channel is sufficient.
 */

const adapters: Record<Channel, LcsAdapter> = {
  MG: new MailgunAdapter(),
  HR: new HeyReachAdapter(),
  SH: new SalesHandoffAdapter(),
};

/**
 * Resolve an adapter by channel code.
 * Returns null if the channel has no registered adapter.
 */
export function resolveAdapter(channel: Channel): LcsAdapter | null {
  return adapters[channel] ?? null;
}

/**
 * Get all registered adapters.
 * Useful for health checks and adapter registry sync.
 */
export function getAllAdapters(): Record<Channel, LcsAdapter> {
  return { ...adapters };
}
