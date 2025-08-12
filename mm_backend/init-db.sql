-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mortgage_scenarios table
CREATE TABLE IF NOT EXISTS mortgage_scenarios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mortgage_type VARCHAR(50) CHECK (mortgage_type IN ('Fixed', 'Variable', 'Tracker')),
    monthly_payment DECIMAL(10,2),
    term_length INTEGER,
    initial_loan_size DECIMAL(12,2),
    overpayments TEXT,
    initial_house_value DECIMAL(12,2),
    product_cost DECIMAL(10,2),
    exit_fees TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    mortgage_scenario_id INTEGER REFERENCES mortgage_scenarios(id) ON DELETE CASCADE,
    prompt_sent TEXT,
    llm_response TEXT,
    analysis_results TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    mortgage_scenario_id INTEGER REFERENCES mortgage_scenarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create llm_requests table (created before messages for foreign key references)
CREATE TABLE IF NOT EXISTS llm_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',
    request_body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'inprocess' CHECK (status IN ('inprocess', 'completed', 'failed')),
    provider VARCHAR(50) NOT NULL, -- anthropic, openai, mock
    model VARCHAR(100) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finish_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create llm_responses table  
CREATE TABLE IF NOT EXISTS llm_responses (
    id SERIAL PRIMARY KEY,
    llm_request_id INTEGER REFERENCES llm_requests(id) ON DELETE CASCADE,
    response_totality TEXT NOT NULL, -- Full response from LLM API
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,6) DEFAULT 0.00, -- Cost in dollars
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table (created after llm tables for foreign key references)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    from_user VARCHAR(255) NOT NULL, -- username or AI model identifier
    to_user VARCHAR(255) NOT NULL,   -- username or AI model identifier
    message_body TEXT NOT NULL,
    sent_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    received_time TIMESTAMP,
    llm_request_id INTEGER REFERENCES llm_requests(id) ON DELETE SET NULL, -- for user messages
    llm_response_id INTEGER REFERENCES llm_responses(id) ON DELETE SET NULL, -- for AI messages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mortgage_scenarios_updated_at ON mortgage_scenarios;
CREATE TRIGGER update_mortgage_scenarios_updated_at 
    BEFORE UPDATE ON mortgage_scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at 
    BEFORE UPDATE ON chats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default user: pete with password 'invasion'
-- Password hash for 'invasion' with bcrypt rounds=12
INSERT INTO users (username, password_hash, salt) 
VALUES (
    'pete',
    '$2b$12$QW050SGhgLo49HXkKtrnieuuf6OMwN1X19YlAbAuTpbKlyEq/8Sw2',
    '99dff3b971f3988bb87290cae04b58b4defef2ad5e132a4559524510671df1cc'
) ON CONFLICT (username) DO NOTHING;