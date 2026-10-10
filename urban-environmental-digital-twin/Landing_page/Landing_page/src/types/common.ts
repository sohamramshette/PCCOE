/**
 * Common API Response Types
 */

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  offset: number;
  pages: number;
  items: T[];
}

export interface HealthResponse {
  status: string;
  database: string;
  service: string;
  timestamp: string;
  active_stations?: number;
  registered_models?: number;
}

export interface ErrorResponse {
  detail: string | { [key: string]: unknown }[];
  code: string;
  timestamp: string;
}
