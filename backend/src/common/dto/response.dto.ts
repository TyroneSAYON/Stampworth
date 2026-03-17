export class ResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
