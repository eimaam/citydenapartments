export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: any;
  code?: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
