import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Get Firestore instance
export const db = getFirestore();

// Get Auth instance
export const auth = getAuth();

// Get Storage instance
export const storage = getStorage();

// Collection references
export const collections = {
  platformAccounts: () => db.collection('platformAccounts'),
  llcs: () => db.collection('llcs'),
  llcMembers: (llcId: string) => db.collection(`llcs/${llcId}/members`),
  properties: (llcId: string) => db.collection(`llcs/${llcId}/properties`),
  units: (llcId: string, propertyId: string) =>
    db.collection(`llcs/${llcId}/properties/${propertyId}/units`),
  tenants: (llcId: string) => db.collection(`llcs/${llcId}/tenants`),
  leases: (llcId: string) => db.collection(`llcs/${llcId}/leases`),
  charges: (llcId: string) => db.collection(`llcs/${llcId}/charges`),
  payments: (llcId: string) => db.collection(`llcs/${llcId}/payments`),
  ledgerEntries: (llcId: string) => db.collection(`llcs/${llcId}/ledgerEntries`),
  vendors: (llcId: string) => db.collection(`llcs/${llcId}/vendors`),
  bills: (llcId: string) => db.collection(`llcs/${llcId}/bills`),
  utilityAccounts: (llcId: string) => db.collection(`llcs/${llcId}/utilityAccounts`),
  workOrders: (llcId: string) => db.collection(`llcs/${llcId}/workOrders`),
  cases: (llcId: string) => db.collection(`llcs/${llcId}/cases`),
  caseTasks: (llcId: string, caseId: string) =>
    db.collection(`llcs/${llcId}/cases/${caseId}/tasks`),
  caseDocuments: (llcId: string, caseId: string) =>
    db.collection(`llcs/${llcId}/cases/${caseId}/documents`),
  auditLogs: (llcId: string) => db.collection(`llcs/${llcId}/auditLogs`),
  stripeEvents: () => db.collection('stripeEvents'),
};
