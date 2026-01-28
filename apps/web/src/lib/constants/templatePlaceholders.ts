/**
 * Available placeholders for lease templates.
 */
export const TEMPLATE_PLACEHOLDERS: Record<string, string> = {
  // Lease info
  '{{lease.startDate}}': 'Lease start date',
  '{{lease.endDate}}': 'Lease end date',
  '{{lease.rentAmount}}': 'Monthly rent amount',
  '{{lease.depositAmount}}': 'Security deposit amount',
  '{{lease.dueDay}}': 'Rent due day of month',
  // Property info
  '{{property.name}}': 'Property name',
  '{{property.address}}': 'Property address',
  '{{property.city}}': 'Property city',
  '{{property.state}}': 'Property state',
  '{{property.zipCode}}': 'Property ZIP code',
  // Unit info
  '{{unit.number}}': 'Unit number',
  '{{unit.bedrooms}}': 'Number of bedrooms',
  '{{unit.bathrooms}}': 'Number of bathrooms',
  // Tenant info
  '{{tenant.name}}': 'Tenant full name',
  '{{tenant.email}}': 'Tenant email',
  '{{tenant.phone}}': 'Tenant phone',
  // LLC info
  '{{llc.name}}': 'LLC legal name',
  // Dates
  '{{currentDate}}': 'Current date',
};
