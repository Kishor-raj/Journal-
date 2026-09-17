-- Anonymous website visitor tracking for the visitor counter.
-- Stores only an anonymous UUID per browser; never personal information.
CREATE TABLE IF NOT EXISTS site_visitors (
    id BIGSERIAL PRIMARY KEY,
    visitor_id UUID UNIQUE NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visitors_first_seen ON site_visitors (first_seen DESC);

CREATE TABLE IF NOT EXISTS site_stats (
    id INTEGER PRIMARY KEY,
    total_visitors BIGINT NOT NULL DEFAULT 0
);

INSERT INTO site_stats (id, total_visitors)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;