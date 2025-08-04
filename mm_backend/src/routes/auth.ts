import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { JWTUtils } from '../utils/jwt';
import { requireAuth } from '../middleware/auth';
import { registrationRateLimit, loginRateLimit } from '../middleware/rateLimit';
import { ValidationUtils } from '../utils/validation';
import { AuthResponse, LoginRequest, CreateUserRequest } from '../types';

const router = Router();

/**
 * POST /api/auth/register
 * User registration endpoint
 */
router.post('/register', registrationRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: CreateUserRequest = req.body;

    // Validate input
    const validation = ValidationUtils.validateRegistrationRequest({ username, password });
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Please check your input and try again',
        details: validation.errors
      });
      return;
    }

    // Check if username already exists
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      res.status(409).json({
        error: 'Username already exists',
        message: 'Please choose a different username'
      });
      return;
    }

    // Create new user
    const newUser = await UserModel.create({ username, password });

    // Generate JWT token for immediate login
    const token = JWTUtils.generateToken({
      id: newUser.id,
      username: newUser.username
    });

    // Return success response
    const response: AuthResponse = {
      token,
      user: {
        id: newUser.id,
        username: newUser.username
      }
    };

    res.status(201).json({
      ...response,
      message: 'Registration successful'
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.message === 'Username already exists') {
      res.status(409).json({
        error: 'Username already exists',
        message: 'Please choose a different username'
      });
      return;
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login', loginRateLimit, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginRequest = req.body;

    // Validate input
    const validation = ValidationUtils.validateLoginRequest({ username, password });
    if (!validation.isValid) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Please check your input and try again',
        details: validation.errors
      });
      return;
    }

    // Find user by username
    const user = await UserModel.findByUsername(username);
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
      return;
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.password_hash, user.salt);
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
      return;
    }

    // Update last login timestamp
    await UserModel.updateLastLogin(user.id);

    // Generate JWT token
    const token = JWTUtils.generateToken({
      id: user.id,
      username: user.username
    });

    // Return success response
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        username: user.username
      }
    };

    res.json({
      ...response,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information (protected route)
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // After requireAuth middleware, req.user is guaranteed to exist
    const userId = req.user!.id;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      res.status(404).json({ 
        error: 'User not found' 
      });
      return;
    }

    // Return user info without sensitive data
    res.json({
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user information',
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/validate-token
 * Validate if a token is still valid (protected route)
 */
router.post('/validate-token', requireAuth, (req: Request, res: Response) => {
  // If we reach this point, the token is valid (middleware passed)
  res.json({
    valid: true,
    user: {
      id: req.user!.id,
      username: req.user!.username
    },
    message: 'Token is valid'
  });
});

/**
 * POST /api/auth/refresh
 * Refresh an existing token (protected route)
 */
router.post('/refresh', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate a new token for the authenticated user
    const newToken = JWTUtils.generateToken({
      id: req.user!.id,
      username: req.user!.username
    });

    const response: AuthResponse = {
      token: newToken,
      user: {
        id: req.user!.id,
        username: req.user!.username
      }
    };

    res.json({
      ...response,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Failed to refresh token',
      message: error.message 
    });
  }
});

export default router;