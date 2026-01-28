import { Timestamp } from './common';

/**
 * Tenant type discriminator
 */
export type TenantType = 'residential' | 'commercial';

/**
 * Business type for commercial tenants
 */
export type BusinessType = 'llc' | 'corporation' | 'sole_proprietorship' | 'partnership' | 'nonprofit' | 'other';

/**
 * Record of a tenant update for audit trail
 */
export interface TenantUpdate {
  updatedAt: Timestamp;
  updatedBy: string; // Firebase Auth UID of user who made the update
}

/**
 * Base tenant fields shared by both types
 */
export interface BaseTenant {
  id: string;
  type: TenantType;
  userId?: string; // Firebase Auth UID if tenant has portal login
  stripeCustomerId?: string; // Stripe Customer ID for payment methods
  email: string;
  phone?: string;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string; // Firebase Auth UID of user who created this tenant
  updates?: TenantUpdate[]; // Audit trail of updates
}

/**
 * Residential tenant - an individual person
 */
export interface ResidentialTenant extends BaseTenant {
  type: 'residential';
  firstName: string;
  lastName: string;
  dateOfBirth?: string; // ISO date string
  ssn4?: string; // Last 4 digits only
  emergencyContact?: EmergencyContact;
}

/**
 * Commercial tenant - a business entity
 */
export interface CommercialTenant extends BaseTenant {
  type: 'commercial';
  businessName: string;
  dba?: string; // "Doing business as" name
  businessType: BusinessType;
  einLast4?: string; // Last 4 of EIN
  stateOfIncorporation?: string; // 2-letter state code
  primaryContact: PrimaryContact;
}

/**
 * Discriminated union of all tenant types
 */
export type Tenant = ResidentialTenant | CommercialTenant;

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface PrimaryContact {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

/**
 * Tenant user ID mapping (for tenant portal access)
 * Links a Firebase Auth user to their tenant record
 */
export interface TenantUserMapping {
  tenantId: string;
  userId: string; // Firebase Auth UID
}
