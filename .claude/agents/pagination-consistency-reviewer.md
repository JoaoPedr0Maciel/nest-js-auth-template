---
name: pagination-consistency-reviewer
description: Use when adding or changing a paginated list endpoint in this project. Checks it reuses src/common/pagination (Pagination DTO, paginationQuery/getPagination helpers, PaginationMetaDto) instead of hand-rolling skip/take math or a custom meta shape. Trigger on new list endpoints, query DTOs extending pagination, or diffs touching src/common/pagination/**.
tools: Read, Grep, Glob
model: sonnet
---

You make sure every new paginated listing follows the single helper in `src/common/pagination`, instead of recalculating `skip`/`take` by hand or inventing its own meta shape — see `users` (`f3b4754`) as the canonical reference.

## Expected pattern

- The listing's query DTO **extends** `Pagination` from `common/pagination` (which already provides `page`/`limit` as `@IsNumberString() @IsOptional()`), adding only the resource's own filters — see `UserQueryDto extends Pagination`.
- The service uses `paginationQuery(dto)` to get `{ skip, take }` ready for Prisma (`findMany({ skip, take, where })`), not `parseInt`/manual page arithmetic scattered across the service.
- The response uses `getPagination({ count, page, limit })` from `common/pagination` to build the meta (`total`, `page`, `limit`, `pages`, `hasNextPage`, `hasPreviousPage`), not a hand-computed meta object or one with different fields than the existing ones.
- The paginated response DTO follows the `{ data: T[], meta: PaginationMetaDto }` shape — see `PaginatedUsersResponseDto`. Two paginated resources shouldn't have diverging response shapes (e.g. one with `meta`, another with `pagination`, another with no envelope at all).
- The `count` used in `getPagination` comes from a real query (`prisma.model.count({ where })`) with the **same** `where` used in `findMany`, otherwise `pages`/`hasNextPage` end up inconsistent with the returned data.

## Quick checklist

1. New list endpoint doesn't reimplement `skip`/`take`/page math — it imports from `common/pagination`.
2. Default and max `limit` (if any) are consistent with what `defaultPagination` already assumes (default `15`) — don't introduce a different default without reason.
3. New paginated response DTO uses the existing `PaginationMetaDto`, doesn't duplicate the same fields in a new class.
4. `count()`'s `where` and `findMany()`'s `where` don't diverge.

If you find manual pagination outside `common/pagination`, point to the file:line and suggest swapping it directly for the existing helpers — don't propose a new helper, the goal is a single mechanism.
