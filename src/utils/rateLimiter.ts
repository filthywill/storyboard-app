/**
 * Rate Limiter for API calls and user actions
 * Prevents abuse by limiting the frequency of requests
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed under rate limits
   * @param identifier - Unique identifier (user ID, IP, etc.)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier) 
      : identifier;
    
    const now = Date.now();
    const entry = this.limits.get(key);

    // If no entry exists, create one
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    // If window has expired, reset
    if (now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   * @param identifier - Unique identifier
   * @returns number of remaining requests
   */
  getRemainingRequests(identifier: string): number {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier) 
      : identifier;
    
    const entry = this.limits.get(key);
    if (!entry) {
      return this.config.maxRequests;
    }

    const now = Date.now();
    if (now > entry.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - entry.count);
  }

  /**
   * Get time until rate limit resets
   * @param identifier - Unique identifier
   * @returns milliseconds until reset, or 0 if not rate limited
   */
  getTimeUntilReset(identifier: string): number {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier) 
      : identifier;
    
    const entry = this.limits.get(key);
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    return Math.max(0, entry.resetTime - now);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier) 
      : identifier;
    
    this.limits.delete(key);
  }
}

// Pre-configured rate limiters for different use cases
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (userId: string) => `api:${userId}`
});

export const authRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  keyGenerator: (identifier: string) => `auth:${identifier}`
});

export const uploadRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 uploads
  windowMs: 60 * 60 * 1000, // per hour
  keyGenerator: (userId: string) => `upload:${userId}`
});

export const exportRateLimiter = new RateLimiter({
  maxRequests: 5, // 5 exports
  windowMs: 60 * 60 * 1000, // per hour
  keyGenerator: (userId: string) => `export:${userId}`
});

/**
 * Rate limiting middleware for API calls
 * @param rateLimiter - Rate limiter instance
 * @param identifier - User identifier
 * @returns Promise<boolean> - true if allowed, false if rate limited
 */
export async function checkRateLimit(
  rateLimiter: RateLimiter, 
  identifier: string
): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
  const allowed = rateLimiter.isAllowed(identifier);
  
  if (!allowed) {
    const remaining = rateLimiter.getRemainingRequests(identifier);
    const resetTime = rateLimiter.getTimeUntilReset(identifier);
    
    console.warn(`Rate limit exceeded for ${identifier}:`, {
      remaining,
      resetTimeMs: resetTime,
      resetTimeMinutes: Math.ceil(resetTime / (60 * 1000))
    });
    
    return { allowed: false, remaining, resetTime };
  }
  
  const remaining = rateLimiter.getRemainingRequests(identifier);
  return { allowed: true, remaining };
}

/**
 * Get user identifier for rate limiting
 * Uses user ID if authenticated, IP fallback for guests
 */
export function getUserIdentifier(): string {
  // Try to get user ID from auth store
  try {
    const { user } = useAuthStore.getState();
    if (user?.id) {
      return user.id;
    }
  } catch (error) {
    // Store not available, fall back to session storage
  }
  
  // Fallback to session ID or IP-based identifier
  let sessionId = sessionStorage.getItem('session-id');
  if (!sessionId) {
    sessionId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session-id', sessionId);
  }
  
  return sessionId;
}

// Import auth store (will be available at runtime)
let useAuthStore: any;
try {
  useAuthStore = require('@/store/authStore').useAuthStore;
} catch (error) {
  // Store not available during build
  useAuthStore = { getState: () => ({ user: null }) };
}


