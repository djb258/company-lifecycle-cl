// Adapter types (re-export from existing types.ts)
export type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

// Adapter implementations
export { MailgunAdapter } from './mailgun-adapter';
export { HeyReachAdapter } from './heyreach-adapter';
export { SalesHandoffAdapter } from './sales-handoff-adapter';

// Adapter resolver
export { resolveAdapter, getAllAdapters } from './adapter-resolver';
