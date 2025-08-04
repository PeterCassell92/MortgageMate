import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiting
// In production, use Redis or similar for distributed rate limiting
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Basic rate limiting middleware
 * Limits requests per IP address
 */
export const createRateLimit = (options: {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    Object.keys(rateLimitStore).forEach(ip => {
      if (rateLimitStore[ip].resetTime <= now) {
        delete rateLimitStore[ip];
      }
    });
    
    // Initialize or get current count for this IP
    if (!rateLimitStore[clientIP]) {
      rateLimitStore[clientIP] = {
        count: 0,
        resetTime: now + options.windowMs
      };
    }
    
    const clientData = rateLimitStore[clientIP];
    
    // Reset if window has expired
    if (clientData.resetTime <= now) {
      clientData.count = 0;
      clientData.resetTime = now + options.windowMs;
    }
    
    // Check if limit exceeded
    if (clientData.count >= options.maxRequests) {
      const timeUntilReset = Math.ceil((clientData.resetTime - now) / 1000);
      
      res.status(429).json({
        error: 'Too many requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: timeUntilReset
      });
      return;
    }
    
    // Increment counter and continue
    clientData.count++;
    next();
  };
};

// Pre-configured rate limiters
export const registrationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 registration attempts per 15 minutes per IP
  message: 'Too many registration attempts. Please wait 15 minutes before trying again.'
});

export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes per IP
  message: 'Too many login attempts. Please wait 15 minutes before trying again.'
});