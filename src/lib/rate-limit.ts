import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitInfo = {
  count: number;
  resetAt: number;
};

// Fallback in-memory store for when Redis is not configured
const memoryLimits = new Map<string, RateLimitInfo>();

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  // Generic ratelimiter, we will override window inside the function if needed
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "15 m"),
    analytics: true,
  });
}

/**
 * Check if the current request is within the rate limit.
 * Falls back to an in-memory Map if Redis is not configured.
 * 
 * @param ip IP address of the client
 * @param action The action being performed (e.g., 'login', 'register')
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds (default 15 minutes)
 */
export async function checkRateLimit(
  ip: string,
  action: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<boolean> {
  const key = `${action}:${ip}`;

  // Try Redis first
  if (redis && ratelimit) {
    try {
      // Create a custom ratelimit instance for this specific limit if needed
      // since different actions have different windows/limits
      const windowSeconds = Math.max(1, Math.floor(windowMs / 1000));
      const specificLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      });
      
      const { success } = await specificLimiter.limit(key);
      return success;
    } catch (error) {
      console.warn("Redis rate limiting failed, falling back to memory:", error);
      // Fall through to memory logic
    }
  }

  // Memory fallback logic
  const now = Date.now();
  const current = memoryLimits.get(key);
  
  if (!current || now > current.resetAt) {
    memoryLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true; // Allowed
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limited
  }
  
  current.count += 1;
  return true; // Allowed
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return "127.0.0.1";
}

// Cleanup function to prevent memory leaks in persistent processes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryLimits.entries()) {
      if (now > value.resetAt) {
        memoryLimits.delete(key);
      }
    }
  }, 60 * 60 * 1000);
}
