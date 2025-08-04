import jwt from 'jsonwebtoken';
import { User } from '../types';

export interface JWTPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export class JWTUtils {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  static generateToken(user: Pick<User, 'id' | 'username'>): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username
    };

    return jwt.sign(payload, this.getSecret(), {
      expiresIn: '24h', // Token expires in 24 hours
      issuer: 'mortgagemate-api'
    });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.getSecret()) as JWTPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}