# Support Ticket Similarity Application

A full-stack prototype that helps support agents find relevant **resolved** tickets and reuse their resolutions. The Angular UI communicates with an Express API backed by PostgreSQL. Search results include matched terms so agents can assess why a prior ticket was returned.

## Features

- Search resolved tickets by keywords or issue description; suppress weak matches and show matching terms and resolution notes.
- Manage categories and tickets through Admin pages.
- Load bundled historical ticket data with validation, duplicate handling, and an insertion summary; remove historical tickets after explicit confirmation.
- Show all-ticket and resolved-ticket counts separately; disable Search when no resolved tickets are available.
- Give Admin users a System Analysis dashboard with search and ticket/category creation metrics, period presets/custom dates, category-filtered details, and expandable matched-ticket information.
- Use distinct application page routes and a shared header/navigation shell.
- Dismiss feedback manually; operation feedback also clears after five seconds.
- Use normal browser scrolling when page content exceeds the viewport; pages do not use nested content scroll areas.

## Requirements

- Node.js and npm compatible with the Angular CLI version in `ui/package.json`
- PostgreSQL

## Local setup

Create a PostgreSQL database, for example `supportagent`, then create `backend/.env` with your local connection settings. Do not commit real credentials.

```dotenv
DB_USER_NAME=<database-user>
DB_HOST=localhost
DB_NAME=supportagent
DB_PASSWORD=<database-password>
DB_PORT=5432
PORT=3000
```

Initialize and start the API:

```powershell
Set-Location backend
npm install
npm run init-db
npm start
```

In a second terminal, start the Angular UI:

```powershell
Set-Location ui
npm install
npm start
```

Open `http://localhost:4200`. Select **Admin → Manage Historical Tickets** to load the sample data from `starter_kit/data/tickets.json`; then use **Ticket Similarity Search**. The Angular development server proxies API requests to `http://localhost:3000` using [proxy.config.json](./ui/proxy.config.json).

`npm run init-db` creates the tables and indexes and migrates legacy text category values into the categories table. Rerun it against an existing database to apply the schema migration.

## Application pages

| Page | Route | Availability |
|---|---|---|
| Ticket Similarity Search | `/search` | Support Agent and Admin |
| Manage Ticket Categories | `/categories` | Admin UI role |
| Manage Tickets | `/tickets` | Admin UI role |
| Manage Historical Tickets | `/historical` | Admin UI role |
| System Analysis | `/analytics` | Admin UI role |

The role selector is a UI demonstration only. The API does **not** enforce authentication or authorization; do not expose this prototype to untrusted users.

## API reference

| Method and path | Purpose |
|---|---|
| `GET /api/tickets/availability` | Return all-ticket and resolved-ticket counts |
| `GET /api/tickets/usage?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&categoryId=<id>&page=1` | Return search metrics, ticket/category creation totals and category breakdown, plus paginated search records; `categoryId` is optional |
| `POST /api/tickets/loadHistoricalTickets` | Load sample tickets; report total, inserted, skipped, invalid, duplicate, and failed counts |
| `DELETE /api/tickets/removeHistoricalTickets` | Delete all tickets |
| `GET /api/tickets/search?keyword=<text>&limit=5` | Search resolved tickets; `limit` defaults to 5 and is capped at 50 |
| `GET/POST/PUT/DELETE /api/categories[/:categoryId]` | List, create, rename, or deactivate categories |
| `GET/POST /api/admin/tickets` | List or create managed tickets |
| `PUT/DELETE /api/admin/tickets/:ticketId` | Update or permanently delete a managed ticket |

Search ignores common terms. Multi-term queries require at least two distinct meaningful terms to match; a one-term query can return an exact descriptive-term match. A query containing only ignored terms returns a validation error. For resolved tickets, a database trigger maintains the indexed `searchable_text` column by combining subject, description, and resolution notes; it is cleared for other statuses and backfilled by schema initialization. Search uses this column for full-text matching and ranking, and retains tag matching. Results are ordered by matched-term count, PostgreSQL full-text rank, and recency. Ranking is an ordering signal, not a calibrated confidence score.

Categories are soft-deactivated, so existing tickets can retain their category. Ticket status is `new`, `inprogress`, or `resolved`; resolution notes are required for resolved tickets. Historical loading creates categories as needed and associates tickets using `category_id`.

Each completed search (including searches with no matches and stop-word-only attempts) is recorded in `search_usage`; matched ticket and category snapshots are stored in `search_usage_matches`. Usage data is collected only after the schema migration has been applied and is not retroactively populated. The migration backfills subject, status, and creation date for existing matches whose tickets still exist. The System Analysis dashboard defaults to today and offers the last 7 days, last 30 days, or a custom inclusive date range. Date boundaries and displayed timestamps use UTC. Summary metrics cover all categories in the selected period. The matched-ticket category filter applies only to the tickets-by-category and search-detail sections; filtered searches require at least one match in that category, and their expanded match details show the ticket ID, category, subject, status, and ticket creation date. The category table includes each category's creation date and period ticket count. Admin role selection opens System Analysis by default. Resolved tickets maintain a `searchable_text` field combining subject, description, and resolution notes; a database trigger populates it only for resolved tickets and clears it when a ticket is not resolved. Schema initialization backfills existing resolved tickets, and full-text search uses this field. Ticket creation uses `created_at_timestamp`; category creation uses `categories.created_at`. Search text is retained in the database, so configure retention and access controls appropriate to the sensitivity of production queries.

## Validation

Run the backend fixture tests and UI tests/build:

```powershell
Set-Location backend
npm test
Set-Location ..\ui
npm test -- --watch=false
npm run build
```

Backend fixtures cover representative login, chart, billing, and no-strong-match cases. They simulate the matching policy against the bundled sample data; they do not execute PostgreSQL search queries or establish production relevance.

## Scope and limitations

This is an agent-assisted demonstration using synthetic data. It has no live ticket-system integration, authentication, or server-side authorization. Keyword/full-text matching may miss semantically similar tickets with different wording. Before production use, add API access controls and auditability, evaluate search against labeled real tickets, and test database behavior, performance, ingestion, and operational requirements.

For the submission guide and design rationale, see [51510636_JaiGaneshMadhavan/README.md](./51510636_JaiGaneshMadhavan/README.md) and [SOLUTION_DESIGN.md](./51510636_JaiGaneshMadhavan/SOLUTION_DESIGN.md).
