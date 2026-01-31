import { Address, Timestamp } from './common';
import { PropertyStatus, PropertyType, UnitStatus } from '../constants/statuses';

/**
 * Mortgage information for a property
 */
export interface MortgageInfo {
  lender?: string;
  loanNumber?: string;
  originalAmount?: number; // In cents
  currentBalance?: number; // In cents
  interestRate?: number; // As percentage (e.g., 6.5 for 6.5%)
  monthlyPayment?: number; // In cents
  paymentDueDay?: number; // Day of month (1-28)
  nextPaymentDate?: string; // ISO date
  maturityDate?: string; // ISO date
  escrowIncluded?: boolean;
  notes?: string;
}

/**
 * Property - a building or land parcel owned by an LLC
 */
export interface Property {
  id: string;
  llcId: string;
  name?: string;
  type: PropertyType;
  address: Address;
  county?: string;
  yearBuilt?: number;
  totalSqft?: number; // Total building square footage
  status: PropertyStatus;
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  parcelInfo?: ParcelInfo;
  mortgageInfo?: MortgageInfo;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Market value entry for a specific year
 */
export interface MarketValueEntry {
  year: number;
  value: number; // In cents
  totalTax?: number; // Annual tax in cents for that year
}

/**
 * County parcel/tax record data
 */
export interface ParcelInfo {
  pid?: string; // County Parcel ID (e.g. "1711721340024")
  parcelAreaSqft?: number;
  torrensAbstract?: 'torrens' | 'abstract';
  addition?: string; // Subdivision/addition name
  lot?: string;
  block?: string;
  metesAndBounds?: string; // Legal description
  // Market values by year (allows tracking historical values)
  marketValues?: MarketValueEntry[];
  // Legacy fields (deprecated, use marketValues instead)
  assessedYear?: number;
  marketValue?: number; // In cents
  totalTax?: number; // Annual tax in cents
  countyPropertyType?: string; // County's classification (e.g. "Industrial-Preferred")
  homestead?: boolean;
  // Districts
  schoolDistrict?: string;
  sewerDistrict?: string;
  watershedDistrict?: string;
}

/**
 * Unit - a rentable space within a property
 */
export interface Unit {
  id: string;
  llcId: string;
  propertyId: string;
  unitNumber: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status: UnitStatus;
  marketRent?: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
