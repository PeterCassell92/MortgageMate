import pool from '../utils/database';
import { User, CreateUserRequest } from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class UserModel {
  
  static async create(userData: CreateUserRequest): Promise<User> {
    const { username, password } = userData;
    
    // Generate salt and hash password
    const salt = crypto.randomBytes(32).toString('hex');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const password_hash = await bcrypt.hash(password + salt, saltRounds);
    
    const query = `
      INSERT INTO users (username, password_hash, salt)
      VALUES ($1, $2, $3)
      RETURNING id, username, created_at, updated_at
    `;
    
    try {
      const result = await pool.query(query, [username, password_hash, salt]);
      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Username already exists');
      }
      throw error;
    }
  }
  
  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, salt, created_at, updated_at
      FROM users
      WHERE username = $1
    `;
    
    try {
      const result = await pool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
  
  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, salt, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
  
  static async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password + salt, hash);
    } catch (error) {
      return false;
    }
  }
  
  static async updateLastLogin(userId: number): Promise<void> {
    const query = `
      UPDATE users
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    try {
      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }
}