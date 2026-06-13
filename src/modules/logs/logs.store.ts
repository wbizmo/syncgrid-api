export interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  apiKey?: string;
}

export const requestLogs: RequestLog[] = [];