import { Timestamp } from './common';
import { EmployeeCapabilities } from './rbac';

/**
 * Activation type - matches tenant type for consistency
 */
export type ActivationType = 'residential' | 'commercial';

/**
 * Role being activated
 */
export type ActivationRole = 'tenant' | 'employee' | 'manager' | 'admin';

/**
 * Activation status
 */
export type ActivationStatus = 'pending' | 'activated' | 'expired';

/**
 * Base fields shared by all activation types
 */
interface BaseActivation {
  id: string;
  type: ActivationType;
  role: ActivationRole;

  // Name
  firstName: string;
  middleInitial?: string;
  lastName: string;

  // Verification
  dateOfBirth: string; // ISO date string YYYY-MM-DD

  // Assignments (for staff roles)
  llcIds: string[];
  propertyIds: string[];
  capabilities?: EmployeeCapabilities;

  // Link to tenant record (for tenant role)
  tenantId?: string;

  // Status tracking
  status: ActivationStatus;
  createdBy: string; // Staff UID who created this
  createdAt: Timestamp;
  expiresAt: Timestamp;

  // Activation tracking
  activatedAt?: Timestamp;
  activatedUserId?: string; // Firebase Auth UID after activation
}

/**
 * Residential/Individual activation - uses SSN for verification
 */
export interface ResidentialActivation extends BaseActivation {
  type: 'residential';
  ssn4: string; // Last 4 digits of SSN
}

/**
 * Commercial/Business activation - uses EIN and business name for verification
 */
export interface CommercialActivation extends BaseActivation {
  type: 'commercial';
  einLast4: string; // Last 4 digits of EIN
  businessName: string;
}

/**
 * Discriminated union of all activation types
 */
export type PendingActivation = ResidentialActivation | CommercialActivation;

/**
 * Input for creating a residential activation
 */
export interface CreateResidentialActivationInput {
  type: 'residential';
  role: ActivationRole;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  dateOfBirth: string;
  ssn4: string;
  llcIds?: string[];
  propertyIds?: string[];
  capabilities?: EmployeeCapabilities;
  tenantId?: string;
}

/**
 * Input for creating a commercial activation
 */
export interface CreateCommercialActivationInput {
  type: 'commercial';
  role: ActivationRole;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  dateOfBirth: string;
  einLast4: string;
  businessName: string;
  llcIds?: string[];
  propertyIds?: string[];
  capabilities?: EmployeeCapabilities;
  tenantId?: string;
}

/**
 * Union type for creating activations
 */
export type CreateActivationInput =
  | CreateResidentialActivationInput
  | CreateCommercialActivationInput;

/**
 * Verification input for residential (individual)
 */
export interface ResidentialVerificationInput {
  type: 'residential';
  dateOfBirth: string;
  ssn4: string;
}

/**
 * Verification input for commercial (business)
 */
export interface CommercialVerificationInput {
  type: 'commercial';
  dateOfBirth: string;
  einLast4: string;
  businessName: string;
}

/**
 * Union type for verification input
 */
export type VerificationInput =
  | ResidentialVerificationInput
  | CommercialVerificationInput;

/**
 * Result of successful verification
 */
export interface VerificationResult {
  activationId: string;
  verificationToken: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  role: ActivationRole;
}

/**
 * Result of name confirmation
 */
export interface ConfirmationResult {
  confirmationToken: string;
  activationId: string;
}

/**
 * Input for creating account
 */
export interface CreateAccountInput {
  email: string;
  password: string;
  confirmationToken: string;
}
