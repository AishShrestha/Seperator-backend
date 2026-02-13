import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Pagination query for listing expenses by group.
 * Extends the standard pagination DTO; add expense-specific query params here if needed.
 */
export class ExpensePaginationQueryDto extends PaginationQueryDto {}
