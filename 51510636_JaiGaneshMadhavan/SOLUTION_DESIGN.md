# Solution Design: Support Ticket Similarity Assistant

## Problem and goal

Support agents repeatedly investigate issues that may already have a resolved precedent. This prototype provides a quick, explainable lookup so an agent can review similar past cases and decide whether a resolution applies. It does not generate customer responses or automate ticket handling.

## Requirements and assumptions

- Search uses the incoming issue text or keywords and returns resolved tickets only.
- Results must provide evidence (matched terms) and should suppress weak lexical matches.
- Admin users can maintain categories and tickets, load sample history, and remove historical tickets with explicit confirmation.
- The supplied synthetic dataset demonstrates the workflow; scale, relevance targets, and latency requirements have not been specified.
- The Support Agent/Admin selector is a UI role simulation, not an identity or access-control system.

## Architecture and data flow

```text
Angular UI ── HTTP ──► Express API ── SQL ──► PostgreSQL
   │                       │                       ├─ categories
   ├─ /search              ├─ search/availability  └─ tickets
   ├─ /categories          ├─ historical load/delete
   ├─ /tickets             └─ category and ticket CRUD
   └─ /historical
```

The Angular root shell owns shared navigation and page state. Router paths select Search (`/search`), Categories (`/categories`), Tickets (`/tickets`), or Historical Tickets (`/historical`); standalone page components render within that shell. Admin routes are guarded by the current UI role. The search and management pages communicate with Express through `TicketService`; the development server proxies `/api` requests.

PostgreSQL stores categories and tickets. Each ticket references `categories.id` using `category_id`. Schema initialization migrates legacy text categories, adds lookup/full-text/tag indexes, and enforces the relationship. Historical loading reads the bundled JSON, validates required fields, creates missing categories, ignores duplicate ticket IDs, and reports totals for inserted, invalid, duplicate, and failed records.

For search, the API removes stop words and duplicate terms, queries subject, description, resolution notes, and tags, and filters candidates to resolved status. Multi-term searches require at least two meaningful matches; one descriptive term may match exactly. Candidates are ordered by matched-term count, PostgreSQL full-text rank, and recency. The API returns matched words and counts so the UI can explain a result. Rank is an ordering signal, not a calibrated probability. Availability reports all tickets and resolved tickets separately; the UI uses those values for the Historical count and Search gating.

## Design choices

- **Lexical search instead of embeddings or an LLM:** avoids external services, model expense, and opaque suggestions for a small demo dataset. It is predictable and explainable, but misses semantic paraphrases.
- **PostgreSQL full-text search and tag matching:** reuses the selected data store and supports indexed retrieval. The match threshold and stop-word list are heuristics that need validation on labeled tickets.
- **Separate category records:** enables category maintenance and preserves existing ticket assignments when a category is deactivated.
- **Client-side role selection:** keeps the workflow easy to demonstrate, but provides no security. Every privileged API must receive server-side authorization before production use.
- **Explicit deletion confirmation and visible feedback:** makes bulk removal intentional and communicates operation results without browser alerts.

## Validation and limitations

Current automated checks include Angular UI tests and backend fixture tests. Fixtures exercise representative login, chart, duplicate-charge, and unfamiliar Snowflake searches, plus historical-load summary accounting. Search acceptance tests simulate term overlap against fixtures; they do not execute PostgreSQL queries or establish real-world precision, recall, or latency.

The prototype has synthetic data, no live ticket-system ingestion, no authentication, and no database integration/performance evaluation. Search relevance is based on term overlap and may miss differently worded but related issues. There is no production service-level or scale guarantee.

## Recommended next steps

1. Add server-enforced authentication, authorization, audit logging, and safe bulk-delete controls.
2. Build PostgreSQL integration tests and a labeled evaluation set with support agents.
3. Measure precision, recall, and latency; tune stop words and match thresholds against the cost of false suggestions and missed precedents.
4. Confirm real data volume, retention, ingestion, monitoring, and operational requirements.
5. Evaluate hybrid or embedding retrieval only if measured lexical-search results are insufficient.
