/**
 * Browser-side JSON fetch for our /api routes. Throws ApiError with the server's
 * user-facing message so screens can show it directly.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public issues?: { path: string; message: string }[]
  ) {
    super(message);
  }
}

/** Fired when the server says the POS locked itself (idle / expired); the POS shell goes to the PIN screen. */
export const POS_LOCKED_EVENT = "rebel:pos-locked";

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers: options.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "Network error. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && data.code === "POS_LOCKED" && typeof window !== "undefined") {
    window.dispatchEvent(new Event(POS_LOCKED_EVENT));
  }
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Something went wrong. Please try again.", data.code, data.issues);
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/** Map server validation issues ("customer.phone") to a { phone: message } lookup. */
export function fieldErrors(error: unknown, prefix = ""): Record<string, string> {
  if (!(error instanceof ApiError) || !error.issues) return {};
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = prefix && issue.path.startsWith(prefix) ? issue.path.slice(prefix.length) : issue.path;
    out[key] ??= issue.message;
  }
  return out;
}
