CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Boarding Passes
CREATE TABLE passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    airline VARCHAR(255),
    flight_number VARCHAR(50),
    origin VARCHAR(10),
    destination VARCHAR(10),
    departure_time TIMESTAMP,
    arrival_time TIMESTAMP,
    passenger_name VARCHAR(255),
    seat VARCHAR(20),
    booking_reference VARCHAR(50),
    barcode TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sync Tokens für Android
CREATE TABLE sync_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    device_name VARCHAR(255),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Updated_at automatisch setzen
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER passes_updated_at
    BEFORE UPDATE ON passes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();