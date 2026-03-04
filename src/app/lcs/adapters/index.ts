// Adapter types (re-export from existing types.ts)
export type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

// Canonical delivery adapter
export { LovableDeliveryAdapter } from './lovable-delivery-adapter';

// @deprecated — direct adapters retained as reference, all channels route through Lovable
export { MailgunAdapter } from './mailgun-adapter';
export { HeyReachAdapter } from './heyreach-adapter';
export { SalesHandoffAdapter } from './sales-handoff-adapter';

// Adapter resolver
export { resolveAdapter, getDeliveryAdapter } from './adapter-resolver';
