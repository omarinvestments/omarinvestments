/**
 * Common types used across the platform
 */

// Firestore Timestamp representation
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

// Generic API response wrapper
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
}

// Pagination
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// Address
export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}
