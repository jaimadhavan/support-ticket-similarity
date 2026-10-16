-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution_notes TEXT NOT NULL,
    tags TEXT[], -- PostgreSQL array for tags
    created_at DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on ticket_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);

-- Create index on tags for searching
CREATE INDEX IF NOT EXISTS idx_tickets_tags ON tickets USING GIN(tags);

-- Create full-text search index on subject and description
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, ''))
);
