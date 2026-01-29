import { z } from 'zod';
import {
  CASE_STATUSES,
  CASE_VISIBILITIES,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from '../constants/statuses';

export const caseTypeSchema = z.enum([
  'eviction',
  'collections',
  'property_damage',
  'contract_dispute',
  'personal_injury',
  'code_violation',
  'other',
]);

export const caseStatusSchema = z.enum([
  CASE_STATUSES.open,
  CASE_STATUSES.stayed,
  CASE_STATUSES.settled,
  CASE_STATUSES.judgment,
  CASE_STATUSES.closed,
]);

export const caseVisibilitySchema = z.enum([
  CASE_VISIBILITIES.restricted,
  CASE_VISIBILITIES.llcWide,
]);

export const plaintiffSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('individual'),
    name: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('llc'),
    llcId: z.string().min(1),
    llcName: z.string().min(1).max(200),
  }),
]);

export const opposingPartySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('tenant'),
    tenantId: z.string().min(1),
    tenantName: z.string().min(1).max(200),
    propertyAddress: z.string().max(500).optional(),
    tenantStatus: z.enum(['active', 'past']).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
  }),
  z.object({
    type: z.literal('other'),
    name: z.string().min(1).max(200),
  }),
]);

export const opposingCounselSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  firmName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
});

// Forward reference for caseResolutionSchema (defined below)
const caseResolutionSchemaForCase = z.object({
  type: z.enum([
    'settlement',
    'judgment_plaintiff',
    'judgment_defendant',
    'default_judgment',
    'dismissal',
    'voluntary_dismissal',
    'other',
  ]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  amount: z.number().min(0).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

export const createCaseSchema = z.object({
  propertyId: z.string().optional(),
  unitId: z.string().optional(),
  tenantId: z.string().optional(),
  court: z.string().min(1).max(200),
  jurisdiction: z.string().min(1).max(50),
  docketNumber: z.string().max(100).optional(),
  caseType: caseTypeSchema,
  status: caseStatusSchema.default('open'),
  visibility: caseVisibilitySchema.default('llcWide'),
  plaintiff: plaintiffSchema.optional(),
  opposingParty: opposingPartySchema.optional(),
  opposingCounsel: opposingCounselSchema.optional(),
  ourCounsel: z.string().max(200).optional(),
  caseManagers: z.array(z.string()).default([]),
  filingDate: z.string().datetime().optional(),
  nextHearingDate: z.string().datetime().optional(),
  resolution: caseResolutionSchemaForCase.optional().nullable(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const taskStatusSchema = z.enum([
  TASK_STATUSES.pending,
  TASK_STATUSES.in_progress,
  TASK_STATUSES.completed,
  TASK_STATUSES.canceled,
]);

export const taskPrioritySchema = z.enum([
  TASK_PRIORITIES.low,
  TASK_PRIORITIES.medium,
  TASK_PRIORITIES.high,
  TASK_PRIORITIES.urgent,
]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime(),
  status: taskStatusSchema.default('pending'),
  priority: taskPrioritySchema.default('medium'),
  assignedToUserId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const documentTypeSchema = z.enum([
  'filing',
  'evidence',
  'notice',
  'correspondence',
  'court_order',
  'settlement',
  'other',
]);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: documentTypeSchema,
  fileName: z.string().min(1).max(255),
  storagePath: z.string().min(1),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().positive(),
});

// Court Date schemas
export const courtDateTypeSchema = z.enum([
  'hearing',
  'trial',
  'motion',
  'status_conference',
  'pretrial_conference',
  'mediation',
  'settlement_conference',
  'arraignment',
  'sentencing',
  'other',
]);

export const courtDateStatusSchema = z.enum([
  'scheduled',
  'completed',
  'cancelled',
  'continued',
  'rescheduled',
]);

export const courtDateOutcomeSchema = z.enum([
  'continued',
  'dismissed',
  'dismissed_with_prejudice',
  'dismissed_without_prejudice',
  'judgment_plaintiff',
  'judgment_defendant',
  'default_judgment',
  'settled',
  'stipulation',
  'motion_granted',
  'motion_denied',
  'taken_under_advisement',
  'other',
]);

export const createCourtDateSchema = z.object({
  type: courtDateTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().max(20).optional(),
  judge: z.string().max(200).optional(),
  courtroom: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  status: courtDateStatusSchema.default('scheduled'),
  outcome: courtDateOutcomeSchema.optional(),
  outcomeNotes: z.string().max(2000).optional(),
});

export const updateCourtDateSchema = createCourtDateSchema.partial();

// Case Resolution schemas
export const resolutionTypeSchema = z.enum([
  'settlement',
  'judgment_plaintiff',
  'judgment_defendant',
  'default_judgment',
  'dismissal',
  'voluntary_dismissal',
  'other',
]);

export const caseResolutionSchema = z.object({
  type: resolutionTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  amount: z.number().min(0).optional(), // in cents
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});
