# Solution Design: Support Ticket Similarity Assistant

## Problem and goal

Support agents repeatedly investigate issues that may already have a resolved precedent. This prototype provides a quick, explainable lookup so an agent can review similar past cases and decide whether a resolution applies. It does not generate customer responses or automate ticket handling.

## Requirements and assumptions

- Search uses the incoming issue text or keywords and returns resolved tickets only.
- Results must provide evidence (matched terms) and should suppress weak lexical matches.
- Admin users can maintain categories and tickets, load sample history, and remove historical tickets with explicit confirmation.
- Admin users can review search-volume and match statistics for a period and filter matched results by category.
- The supplied synthetic dataset demonstrates the workflow; scale, relevance targets, and latency requirements have not been specified.
- The Support Agent/Admin selector is a UI role simulation, not an identity or access-control system.

## Architecture and data flow

```text
Angular UI ── HTTP ──► Express API ── SQL ──► PostgreSQL
   ├─ /search              ├─ ticket search        ├─ categories
   ├─ /categories          ├─ historical actions   ├─ tickets
   ├─ /tickets             ├─ category/ticket CRUD ├─ search_usage
   ├─ /historical          └─ usage analytics      └─ search_usage_matches
   └─ /analytics
```

The Angular root shell owns shared navigation and page state. Router paths select Search (`/search`), Categories (`/categories`), Tickets (`/tickets`), Historical Tickets (`/historical`), or System Analysis (`/analytics`); standalone page components render within that shell. Admin routes are guarded by the current UI role. The pages communicate with Express through `TicketService`; the development server proxies `/api` requests.

PostgreSQL stores categories and tickets. Each ticket references `categories.id` using `category_id`. Schema initialization migrates legacy text categories, adds lookup/full-text/tag indexes, and enforces the relationship. A database trigger sets `tickets.searchable_text` to subject, description, and resolution notes only for resolved tickets; it clears the field for other statuses and refreshes it when resolved ticket text changes. Schema initialization backfills existing resolved tickets. Historical loading reads the bundled JSON, validates required fields, creates missing categories, ignores duplicate ticket IDs, and reports totals for inserted, invalid, duplicate, and failed records.

For search, the API removes stop words and duplicate terms, queries the indexed `searchable_text` column plus tags, and filters candidates to resolved status. Multi-term searches require at least two meaningful matches; one descriptive term may match exactly. Candidates are ordered by matched-term count, PostgreSQL full-text rank, and recency. The API returns matched words and counts so the UI can explain a result. Rank is an ordering signal, not a calibrated probability. Availability reports all tickets and resolved tickets separately; the UI uses those values for the Historical count and Search gating.

Every completed query, including a no-match or stop-word-only attempt, is persisted with its text, timestamp, outcome, and returned match count. Matched ticket ID, category, subject, status, and creation-date snapshots are stored separately; schema initialization backfills detail fields for matched tickets that still exist. Dashboard summary metrics cover all categories within the inclusive UTC date range; the matched-ticket category filter applies only to the category and search detail sections. A filtered search is shown when at least one result belongs to the selected category, with matching-ticket information expandable inline. Category activity includes category creation dates and ticket counts. Usage begins after migration and remains independent of ticket deletion.

## Design choices

- **Lexical search instead of embeddings or an LLM:** avoids external services, model expense, and opaque suggestions for a small demo dataset. It is predictable and explainable, but misses semantic paraphrases.
- **PostgreSQL full-text search and tag matching:** reuses the selected data store and supports indexed retrieval. The match threshold and stop-word list are heuristics that need validation on labeled tickets.
- **Separate category records:** enables category maintenance and preserves existing ticket assignments when a category is deactivated.
- **Client-side role selection:** keeps the workflow easy to demonstrate, but provides no security. Every privileged API must receive server-side authorization before production use.
- **Explicit deletion confirmation and visible feedback:** makes bulk removal intentional and communicates operation results without browser alerts.
- **Normalized usage events and match rows:** support period/category aggregates and preserve matched ticket identifiers without repeating query text. Search text may be sensitive, so retention and access controls are production requirements.

## Validation and limitations

The prototype has synthetic data, no live ticket-system ingestion, no authentication, and no database integration/performance evaluation. Search relevance is based on term overlap and may miss differently worded but related issues. There is no production service-level or scale guarantee.

## Recommended next steps

1. Add server-enforced authentication, authorization, audit logging, and safe bulk-delete controls.
2. Build PostgreSQL integration tests and a labeled evaluation set with support agents.
3. Measure precision, recall, and latency; tune stop words and match thresholds against the cost of false suggestions and missed precedents.
4. Confirm real data volume, retention, ingestion, monitoring, and operational requirements.
5. Evaluate hybrid or embedding retrieval only if measured lexical-search results are insufficient.
