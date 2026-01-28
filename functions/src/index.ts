/**
 * Cloud Functions entry point
 *
 * Export all HTTPS endpoints and triggers from this file.
 */

import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
initializeApp();

// =============================================================================
// Payment Routes
// =============================================================================
export { createPaymentIntent } from './routes/payments/createIntent';
// export { stripeWebhook } from './routes/payments/webhook';

// =============================================================================
// Storage Routes (Signed URLs)
// =============================================================================
// export { createUploadUrl } from './routes/storage/createUploadUrl';
// export { createDownloadUrl } from './routes/storage/createDownloadUrl';

// =============================================================================
// Legal Routes
// =============================================================================
// export { createCase } from './routes/legal/createCase';
// export { updateCase } from './routes/legal/updateCase';

// =============================================================================
// Billing Routes
// =============================================================================
// export { postBill } from './routes/billing/postBill';

// =============================================================================
// Accounting Routes
// =============================================================================
// export { closeMonth } from './routes/accounting/closeMonth';
// export { reopenMonth } from './routes/accounting/reopenMonth';

// =============================================================================
// Admin Routes
// =============================================================================
// export { syncClaims } from './routes/admin/syncClaims';

// =============================================================================
// Scheduled Functions
// =============================================================================
// export { generateMonthlyCharges } from './schedulers/nightly';
// export { sendReminders } from './schedulers/reminders';
