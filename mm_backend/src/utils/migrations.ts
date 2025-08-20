import pool from './database';

export const createUsersTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUpdateTriggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(createUpdateTriggerQuery);
    console.log('✅ Users table created successfully');
  } catch (error) {
    console.error('❌ Error creating users table:', error);
    throw error;
  }
};

export const createChatsTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      chat_id UUID UNIQUE NOT NULL,
      non_unique_numerical_id INTEGER NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
      mortgage_scenario_id INTEGER REFERENCES mortgage_scenarios(id) ON DELETE SET NULL,
      overall_status VARCHAR(20) DEFAULT 'active' CHECK (overall_status IN ('active', 'inactive')),
      latest_view_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
    CREATE INDEX IF NOT EXISTS idx_chats_chat_id ON chats(chat_id);
    CREATE INDEX IF NOT EXISTS idx_chats_numerical_id ON chats(non_unique_numerical_id);
    CREATE INDEX IF NOT EXISTS idx_chats_mortgage_scenario_id ON chats(mortgage_scenario_id);
    CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(overall_status);
  `;

  const createUpdateTriggerQuery = `
    DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
    CREATE TRIGGER update_chats_updated_at
        BEFORE UPDATE ON chats
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(createIndexQuery);
    await pool.query(createUpdateTriggerQuery);
    console.log('✅ Chats table created successfully');
  } catch (error) {
    console.error('❌ Error creating chats table:', error);
    throw error;
  }
};

export const createMortgageScenariosTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS mortgage_scenarios (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL DEFAULT 'New Scenario',
      advisor_mode VARCHAR(50) DEFAULT 'data_gathering',
      conversation_stage VARCHAR(100),
      current_priority VARCHAR(255),
      
      -- Property Information
      property_location VARCHAR(255),
      property_type VARCHAR(100),
      property_value DECIMAL(12,2),
      property_use VARCHAR(100),
      
      -- Current Mortgage Details
      current_lender VARCHAR(255),
      mortgage_type VARCHAR(50),
      current_balance DECIMAL(12,2),
      monthly_payment DECIMAL(10,2),
      current_rate DECIMAL(5,4),
      term_remaining INTEGER,
      product_end_date DATE,
      exit_fees TEXT,
      early_repayment_charges TEXT,
      
      -- Financial Information
      annual_income DECIMAL(12,2),
      employment_status VARCHAR(100),
      credit_score INTEGER,
      existing_debts TEXT,
      disposable_income DECIMAL(10,2),
      available_deposit DECIMAL(12,2),
      
      -- Goals and Preferences
      primary_objective VARCHAR(255),
      risk_tolerance VARCHAR(100),
      preferred_term INTEGER,
      payment_preference VARCHAR(100),
      timeline VARCHAR(100),
      additional_context TEXT,
      documents_summary TEXT,
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_mortgage_scenarios_user_id ON mortgage_scenarios(user_id);
  `;

  const createUpdateTriggerQuery = `
    DROP TRIGGER IF EXISTS update_mortgage_scenarios_updated_at ON mortgage_scenarios;
    CREATE TRIGGER update_mortgage_scenarios_updated_at
        BEFORE UPDATE ON mortgage_scenarios
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(createIndexQuery);
    await pool.query(createUpdateTriggerQuery);
    console.log('✅ Mortgage scenarios table created successfully');
  } catch (error) {
    console.error('❌ Error creating mortgage scenarios table:', error);
    throw error;
  }
};

export const createMessagesTable = async (): Promise<void> => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      from_user VARCHAR(20) CHECK (from_user IN ('user', 'assistant')),
      to_user VARCHAR(20) CHECK (to_user IN ('user', 'assistant')),
      message_body TEXT NOT NULL,
      llm_request_id INTEGER,
      llm_response_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createIndexQuery = `
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
  `;

  try {
    await pool.query(createTableQuery);
    await pool.query(createIndexQuery);
    console.log('✅ Messages table created successfully');
  } catch (error) {
    console.error('❌ Error creating messages table:', error);
    throw error;
  }
};

export const runMigrations = async (): Promise<void> => {
  console.log('🔄 Running database migrations...');
  
  try {
    await createUsersTable();
    await createMortgageScenariosTable();
    await createChatsTable();
    await createMessagesTable();
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};