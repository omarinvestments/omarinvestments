import { Address, Timestamp } from './common';
import { PropertyStatus, PropertyType, UnitStatus } from '../constants/statuses';

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
  status: PropertyStatus;
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  parcelInfo?: ParcelInfo;
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
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
  // Tax assessment (most recent)
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
