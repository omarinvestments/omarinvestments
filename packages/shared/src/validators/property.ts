import { z } from 'zod';
import { PROPERTY_TYPES, PROPERTY_STATUSES, UNIT_STATUSES } from '../constants/statuses';

export const addressSchema = z.object({
  street1: z.string().min(1).max(200),
  street2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  country: z.string().default('US'),
});

export const propertyTypeSchema = z.enum([
  PROPERTY_TYPES.residential,
  PROPERTY_TYPES.commercial,
  PROPERTY_TYPES.mixed,
]);

export const propertyStatusSchema = z.enum([
  PROPERTY_STATUSES.active,
  PROPERTY_STATUSES.inactive,
  PROPERTY_STATUSES.sold,
]);

export const marketValueEntrySchema = z.object({
  year: z.number().int().min(1900).max(2100),
  value: z.number().nonnegative(), // In cents
  totalTax: z.number().nonnegative().optional(), // Annual tax in cents for that year
});

export const parcelInfoSchema = z.object({
  pid: z.string().max(50).optional(),
  parcelAreaSqft: z.number().positive().optional(),
  torrensAbstract: z.enum(['torrens', 'abstract']).optional(),
  addition: z.string().max(200).optional(),
  lot: z.string().max(50).optional(),
  block: z.string().max(50).optional(),
  metesAndBounds: z.string().max(500).optional(),
  // Market values by year (allows tracking historical values)
  marketValues: z.array(marketValueEntrySchema).optional(),
  // Legacy fields (deprecated, use marketValues instead)
  assessedYear: z.number().int().min(1900).max(2100).optional(),
  marketValue: z.number().nonnegative().optional(),
  totalTax: z.number().nonnegative().optional(),
  countyPropertyType: z.string().max(100).optional(),
  homestead: z.boolean().optional(),
  schoolDistrict: z.string().max(50).optional(),
  sewerDistrict: z.string().max(50).optional(),
  watershedDistrict: z.string().max(50).optional(),
});

export const createPropertySchema = z.object({
  name: z.string().max(200).optional(),
  type: propertyTypeSchema,
  address: addressSchema,
  county: z.string().max(100).optional(),
  yearBuilt: z.number().int().min(1600).max(2100).optional(),
  status: propertyStatusSchema.default('active'),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().positive().optional(),
  parcelInfo: parcelInfoSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const unitStatusSchema = z.enum([
  UNIT_STATUSES.available,
  UNIT_STATUSES.occupied,
  UNIT_STATUSES.maintenance,
  UNIT_STATUSES.unavailable,
]);

export const createUnitSchema = z.object({
  unitNumber: z.string().min(1).max(50),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  sqft: z.number().positive().optional(),
  status: unitStatusSchema.default('available'),
  marketRent: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateUnitSchema = createUnitSchema.partial();
