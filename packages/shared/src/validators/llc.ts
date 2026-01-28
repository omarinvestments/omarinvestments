import { z } from 'zod';
import { MEMBER_ROLES, MEMBER_STATUSES } from '../constants/roles';

export const llcSettingsSchema = z.object({
  timezone: z.string().default('America/Chicago'),
  currency: z.string().default('usd'),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeAmount: z.number().positive().optional(),
  lateFeeGraceDays: z.number().int().min(0).max(30).optional(),
});

export const createLlcSchema = z.object({
  legalName: z.string().min(1).max(200),
  einLast4: z.string().length(4).regex(/^\d{4}$/).optional(),
  settings: llcSettingsSchema.optional(),
});

export const updateLlcSchema = z.object({
  legalName: z.string().min(1).max(200).optional(),
  einLast4: z.string().length(4).regex(/^\d{4}$/).optional(),
  settings: llcSettingsSchema.partial().optional(),
});

export const memberRoleSchema = z.enum([
  MEMBER_ROLES.admin,
  MEMBER_ROLES.manager,
  MEMBER_ROLES.accounting,
  MEMBER_ROLES.maintenance,
  MEMBER_ROLES.legal,
  MEMBER_ROLES.tenant,
  MEMBER_ROLES.readOnly,
]);

export const memberStatusSchema = z.enum([
  MEMBER_STATUSES.active,
  MEMBER_STATUSES.invited,
  MEMBER_STATUSES.disabled,
]);

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: memberRoleSchema,
  propertyScopes: z.array(z.string()).optional(),
  caseScopes: z.array(z.string()).optional(),
});

export const updateMemberSchema = z.object({
  role: memberRoleSchema.optional(),
  propertyScopes: z.array(z.string()).optional(),
  caseScopes: z.array(z.string()).optional(),
  status: memberStatusSchema.optional(),
});
