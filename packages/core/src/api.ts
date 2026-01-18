/**
 * Core API utilities shared across all platforms
 */

export interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}

export const createApiClient = (baseUrl: string) => {
  return {
    get: async <T,>(endpoint: string): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`);
        const data = await response.json();
        return { data, status: response.status };
      } catch (error) {
        return {
          data: null as any,
          error: error instanceof Error ? error.message : "Unknown error",
          status: 500,
        };
      }
    },
    post: async <T,>(endpoint: string, body: unknown): Promise<ApiResponse<T>> => {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        return { data, status: response.status };
      } catch (error) {
        return {
          data: null as any,
          error: error instanceof Error ? error.message : "Unknown error",
          status: 500,
        };
      }
    },
  };
};
