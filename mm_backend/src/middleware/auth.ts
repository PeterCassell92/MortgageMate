import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from '../utils/jwt';
import { UserModel } from '../models/User';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
  };
}

/**
 * Middleware to authenticate JWT tokens
 * Adds user information to req.user if valid token is provided
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid access token in Authorization header'
      });
      return;
    }

    // Verify the token
    const payload: JWTPayload = JWTUtils.verifyToken(token);
    
    // Verify user still exists in database
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      res.status(401).json({ 
        error: 'Invalid token',
        message: 'User associated with token no longer exists'
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      username: user.username
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error.message);
    
    res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message
    });
  }
};

/**
 * Optional authentication middleware
 * Adds user info if valid token is provided, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload: JWTPayload = JWTUtils.verifyToken(token);
      const user = await UserModel.findById(payload.userId);
      
      if (user) {
        req.user = {
          id: user.id,
          username: user.username
        };
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we silently fail and continue without user
    next();
  }
};

/**
 * Middleware to require authentication
 * Use this for protected routes that require a logged-in user
 */
export const requireAuth = authenticateToken;