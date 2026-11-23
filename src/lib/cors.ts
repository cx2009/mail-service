// CORS is now handled by Express cors middleware in server.ts
// This file kept for backward compatibility of json() helper.

export function json(
  data: unknown,
  status = 200,
  _headers?: Record<string, string>,
): { status: number; body: unknown } {
  return { status, body: data };
}
