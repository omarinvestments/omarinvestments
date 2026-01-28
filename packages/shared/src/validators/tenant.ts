import { z } from 'zod';

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
});

const primaryContactSchema = z.object({
  name: z.string().min(1).max(200),
  title: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
});

const businessTypeSchema = z.enum([
  'llc',
  'corporation',
  'sole_proprietorship',
  'partnership',
  'nonprofit',
  'other',
]);

/**
 * Create a residential tenant
 */
export const createResidentialTenantSchema = z.object({
  type: z.literal('residential'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ssn4: z.string().regex(/^\d{4}$/).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Create a commercial tenant
 */
export const createCommercialTenantSchema = z.object({
  type: z.literal('commercial'),
  businessName: z.string().min(1).max(200),
  dba: z.string().max(200).optional(),
  businessType: businessTypeSchema,
  einLast4: z.string().regex(/^\d{4}$/).optional(),
  stateOfIncorporation: z.string().length(2).optional(),
  primaryContact: primaryContactSchema,
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Discriminated union for creating any tenant type
 */
export const createTenantSchema = z.discriminatedUnion('type', [
  createResidentialTenantSchema,
  createCommercialTenantSchema,
]);

/**
 * Update a residential tenant (all fields optional except type)
 */
export const updateResidentialTenantSchema = z.object({
  type: z.literal('residential'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ssn4: z.string().regex(/^\d{4}$/).optional(),
  emergencyContact: emergencyContactSchema.optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Update a commercial tenant (all fields optional except type)
 */
export const updateCommercialTenantSchema = z.object({
  type: z.literal('commercial'),
  businessName: z.string().min(1).max(200).optional(),
  dba: z.string().max(200).optional(),
  businessType: businessTypeSchema.optional(),
  einLast4: z.string().regex(/^\d{4}$/).optional(),
  stateOfIncorporation: z.string().length(2).optional(),
  primaryContact: primaryContactSchema.optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});

/**
 * Discriminated union for updating any tenant type
 */
export const updateTenantSchema = z.discriminatedUnion('type', [
  updateResidentialTenantSchema,
  updateCommercialTenantSchema,
]);
