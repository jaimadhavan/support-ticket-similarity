CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower
    ON categories (lower(name));

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    resolution_notes TEXT NOT NULL,
    tags TEXT[],
    created_at DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id INTEGER;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'tickets'
          AND column_name = 'category'
    ) THEN
        INSERT INTO categories (name)
        SELECT DISTINCT CASE WHEN trim(category) = '' THEN 'Uncategorized' ELSE trim(category) END
        FROM tickets
        ON CONFLICT DO NOTHING;

        UPDATE tickets AS t
        SET category_id = c.id
        FROM categories AS c
        WHERE t.category_id IS NULL
          AND lower(c.name) = lower(
              CASE WHEN trim(t.category) = '' THEN 'Uncategorized' ELSE trim(t.category) END
          );

        ALTER TABLE tickets DROP COLUMN category;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'tickets'::regclass
          AND conname = 'tickets_category_id_fkey'
    ) THEN
        ALTER TABLE tickets
            ADD CONSTRAINT tickets_category_id_fkey
            FOREIGN KEY (category_id) REFERENCES categories(id);
    END IF;
END $$;

ALTER TABLE tickets ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tags ON tickets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(
    to_tsvector('english', coalesce(subject, '') || ' ' || coalesce(description, '') || ' ' || coalesce(resolution_notes, ''))
);
