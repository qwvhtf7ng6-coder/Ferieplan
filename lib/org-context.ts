/**
 * org-context.ts
 *
 * AsyncLocalStorage-baseret request-context der holder org-id og
 * bruger-info for det aktuelle request. Sættes af middleware / route handlers.
 *
 * Fase 1: Fundament. Fase 3 vil udvide med subdomain-resolution.
 */

import { AsyncLocalStorage } from "async_hooks";

export interface OrgContext {
  orgId: string | null;       // null for SUPER_ADMIN
  orgSlug: string | null;
  userId: string | null;
  isSuperAdmin: boolean;
}

const storage = new AsyncLocalStorage<OrgContext>();

/** Kør en callback inden for en given org-context */
export function withOrgContext<T>(ctx: OrgContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Hent den aktuelle org-context. Kaster fejl hvis ingen context er sat. */
export function getOrgContext(): OrgContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "OrgContext ikke sat — kald withOrgContext() i middleware/route handler"
    );
  }
  return ctx;
}

/** Hent context uden at kaste fejl (til steder der måske kører udenfor request) */
export function getOrgContextSafe(): OrgContext | null {
  return storage.getStore() ?? null;
}
