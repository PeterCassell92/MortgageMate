#!/usr/bin/env ts-node

import { runMigrations } from '../utils/migrations';
import pool from '../utils/database';

const setupDatabase = async () => {
  console.log('🚀 Setting up MortgageMate database...');
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Run migrations
    await runMigrations();
    
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };