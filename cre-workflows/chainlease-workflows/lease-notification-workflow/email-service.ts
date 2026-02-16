// email-service.ts
// ⚠️ REFERENCE FILE ONLY - NOT USED BY WORKFLOW ⚠️
// 
// This file contains email template functions for reference only.
// The actual email sending is handled by the backend API:
//   backend/src/api/notifications.js
//
// The CRE workflow (main.ts) only forwards event data to backend endpoint.
// To modify email templates, edit backend/src/api/notifications.js
//
// This file can be safely deleted if not needed.

import type { LeaseActivatedEventArgs } from "./types";

/**
 * Reference email template function
 * Actual implementation is in backend
 */
export function generateLeaseActivationEmail(
  eventArgs: LeaseActivatedEventArgs,
  tenantName?: string
): { html: string; text: string } {
  const { leaseId, propertyId, monthlyRent, startDate, endDate } = eventArgs;
  
  const startDateStr = new Date(Number(startDate) * 1000).toLocaleDateString();
  const endDateStr = new Date(Number(endDate) * 1000).toLocaleDateString();
  const rentAmount = (Number(monthlyRent) / 1e18).toFixed(2);

  const html = `<p>Lease #${leaseId} activated for property #${propertyId}</p>`;
  const text = `Lease #${leaseId} activated for property #${propertyId}`;

  return { html, text };
}
