// API Response Types
export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

// Test Entity
export interface TestItem {
  id: string;
  name: string;
  createdAt: string;
}

// Error Codes
export enum ErrorCode {
  SUCCESS = 0,
  INVALID_PARAM = 40001,
  NOT_FOUND = 40401,
  INTERNAL_ERROR = 50001,
}
