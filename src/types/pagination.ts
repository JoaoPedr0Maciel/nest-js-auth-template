export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationResponse<T> {
  data: T[];
  meta: PaginationResult;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  count: number;
}