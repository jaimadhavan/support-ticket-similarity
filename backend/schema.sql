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
    searchable_text TEXT,
    created_at_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS created_at_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS searchable_text TEXT;

CREATE OR REPLACE FUNCTION set_ticket_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
    IF lower(NEW.status) = 'resolved' THEN
        NEW.searchable_text := concat_ws(
            ' ',
            NULLIF(trim(NEW.subject), ''),
            NULLIF(trim(NEW.description), ''),
            NULLIF(trim(NEW.resolution_notes), '')
        );
    ELSE
        NEW.searchable_text := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ticket_searchable_text ON tickets;
CREATE TRIGGER trg_set_ticket_searchable_text
    BEFORE INSERT OR UPDATE OF status, subject, description, resolution_notes
    ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_searchable_text();

UPDATE tickets
SET searchable_text = CASE
    WHEN lower(status) = 'resolved' THEN concat_ws(
        ' ',
        NULLIF(trim(subject), ''),
        NULLIF(trim(description), ''),
        NULLIF(trim(resolution_notes), '')
    )
    ELSE NULL
END;

CREATE TABLE IF NOT EXISTS search_usage (
    id BIGSERIAL PRIMARY KEY,
    search_text TEXT NOT NULL,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    match_found BOOLEAN NOT NULL,
    match_count INTEGER NOT NULL CHECK (match_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_search_usage_searched_at
    ON search_usage(searched_at DESC);

CREATE TABLE IF NOT EXISTS search_usage_matches (
    id BIGSERIAL PRIMARY KEY,
    search_id BIGINT NOT NULL REFERENCES search_usage(id) ON DELETE CASCADE,
    ticket_id VARCHAR(50) NOT NULL,
    category_id INTEGER NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    ticket_subject TEXT,
    ticket_status VARCHAR(50),
    ticket_created_at DATE,
    UNIQUE (search_id, ticket_id)
);

ALTER TABLE search_usage_matches
    ADD COLUMN IF NOT EXISTS ticket_subject TEXT,
    ADD COLUMN IF NOT EXISTS ticket_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ticket_created_at DATE;

UPDATE search_usage_matches AS usage_match
SET ticket_subject = COALESCE(usage_match.ticket_subject, ticket.subject),
    ticket_status = COALESCE(usage_match.ticket_status, ticket.status),
    ticket_created_at = COALESCE(usage_match.ticket_created_at, ticket.created_at)
FROM tickets AS ticket
WHERE ticket.ticket_id = usage_match.ticket_id
  AND (
      usage_match.ticket_subject IS NULL
      OR usage_match.ticket_status IS NULL
      OR usage_match.ticket_created_at IS NULL
  );

CREATE INDEX IF NOT EXISTS idx_search_usage_matches_category
    ON search_usage_matches(category_id, search_id);

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
DROP INDEX IF EXISTS idx_tickets_search;
CREATE INDEX IF NOT EXISTS idx_tickets_searchable_text ON tickets USING GIN(
    to_tsvector('english', coalesce(searchable_text, ''))
);
