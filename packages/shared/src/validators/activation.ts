import { z } from 'zod';

/**
 * Activation role enum
 */
export const activationRoleSchema = z.enum(['tenant', 'employee', 'manager', 'admin']);

/**
 * Employee capabilities schema - all fields required
 */
const capabilitiesSchema = z.object({
  workOrderAccess: z.boolean(),
  taskAccess: z.boolean(),
  paymentProcessing: z.boolean(),
});

/**
 * Create a residential (individual) activation
 */
export const createResidentialActivationSchema = z.object({
  type: z.literal('residential'),
  role: activationRoleSchema,
  firstName: z.string().min(1).max(100),
  middleInitial: z.string().max(1).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  ssn4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
  llcIds: z.array(z.string()).optional(),
  propertyIds: z.array(z.string()).optional(),
  capabilities: capabilitiesSchema.optional(),
  tenantId: z.string().optional(),
});

/**
 * Create a commercial (business) activation
 */
export const createCommercialActivationSchema = z.object({
  type: z.literal('commercial'),
  role: activationRoleSchema,
  firstName: z.string().min(1).max(100),
  middleInitial: z.string().max(1).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  einLast4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
  businessName: z.string().min(1).max(200),
  llcIds: z.array(z.string()).optional(),
  propertyIds: z.array(z.string()).optional(),
  capabilities: capabilitiesSchema.optional(),
  tenantId: z.string().optional(),
});

/**
 * Discriminated union for creating any activation type
 */
export const createActivationSchema = z.discriminatedUnion('type', [
  createResidentialActivationSchema,
  createCommercialActivationSchema,
]);

/**
 * Verify identity - residential (individual)
 */
export const verifyResidentialSchema = z.object({
  type: z.literal('residential'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  ssn4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
});

/**
 * Verify identity - commercial (business)
 */
export const verifyCommercialSchema = z.object({
  type: z.literal('commercial'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  einLast4: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
  businessName: z.string().min(1).max(200),
});

/**
 * Discriminated union for verification
 */
export const verifyIdentitySchema = z.discriminatedUnion('type', [
  verifyResidentialSchema,
  verifyCommercialSchema,
]);

/**
 * Confirm name step
 */
export const confirmNameSchema = z.object({
  activationId: z.string().min(1),
  verificationToken: z.string().min(1),
});

/**
 * Create account step
 */
export const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmationToken: z.string().min(1),
});

// Inferred types from schemas (use these when validating input)
export type ValidatedCreateResidentialActivation = z.infer<typeof createResidentialActivationSchema>;
export type ValidatedCreateCommercialActivation = z.infer<typeof createCommercialActivationSchema>;
export type ValidatedCreateActivation = z.infer<typeof createActivationSchema>;
export type ValidatedVerifyResidential = z.infer<typeof verifyResidentialSchema>;
export type ValidatedVerifyCommercial = z.infer<typeof verifyCommercialSchema>;
export type ValidatedVerifyIdentity = z.infer<typeof verifyIdentitySchema>;
export type ValidatedConfirmName = z.infer<typeof confirmNameSchema>;
export type ValidatedCreateAccount = z.infer<typeof createAccountSchema>;
