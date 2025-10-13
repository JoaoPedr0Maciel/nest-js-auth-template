import { IsNumberString, IsOptional } from "class-validator";
import { PaginationParams, PaginationResult } from "../types/pagination";

export class Pagination {
  @IsNumberString()
  @IsOptional()
  page?: string;

  @IsNumberString()
  @IsOptional()
  limit?: string;
}

export function defaultPagination(pagination: Pagination): { page: string; limit: string; skip: string } {
  const { page, limit } = pagination;
  const pageNumber = page ? parseInt(page) : 1;
  const limitNumber = limit ? parseInt(limit) : 15;
  const skip = (pageNumber - 1) * limitNumber;

  return {
    page: pageNumber.toString(),
    limit: limitNumber.toString(),
    skip: skip.toString(),
  };
}

export function paginationQuery(pagination: Pagination): { skip: number; take: number } {
  const { skip, limit: take } = defaultPagination(pagination);

  return {
    skip: parseInt(skip),
    take: parseInt(take),
  };
}


export function getPagination(params: PaginationParams): PaginationResult {
  const { page, limit } = defaultPagination({ limit: params.limit?.toString(), page: params.page?.toString() });

  const totalPages = Math.ceil(params.count / parseInt(limit));
  const currentPage = Math.floor(parseInt(page) / parseInt(limit)) + 1;

  return {
    total: params.count,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}