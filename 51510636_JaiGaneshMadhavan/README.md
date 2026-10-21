# Support Ticket Similarity Assistant

## Overview

A full-stack support workflow prototype that helps agents find relevant, resolved tickets and reuse their resolutions. The application combines an Angular single-page UI, an Express API, and PostgreSQL. The runnable source snapshot is in [`support-ticket-management/`](./support-ticket-management/).

## Capabilities

- Search resolved tickets by keywords or issue description. Results include matched terms and resolution notes; weak matches are withheld.
- Manage ticket categories and ticket records, with status and category validation.
- Load sample historical tickets with validation, duplicate handling, and an insertion summary; remove them only after confirmation.
- View overall and resolved-ticket counts separately. Search remains unavailable if no resolved tickets exist.
- View Admin System Analysis metrics, ticket/category creation counts, category-filtered detail sections, and expandable per-search ticket matches.
- Navigate to Search, Categories, Tickets, Historical Tickets, and System Analysis at `/search`, `/categories`, `/tickets`, `/historical`, and `/analytics`. Admin menus are shown only in the Admin UI role.
- Dismiss page feedback manually or let it clear automatically after five seconds. Content uses normal browser scrolling.

## Technology and structure

- **UI:** Angular standalone components, Angular Router, TypeScript, and RxJS.
- **API:** Node.js, Express, and `pg`.
- **Data:** PostgreSQL `tickets` and `categories` tables. Tickets reference categories by `category_id`; resolved tickets store combined subject/description/resolution text in `searchable_text`, backed by a full-text index.
- **Search analytics:** `search_usage` stores query text/time/outcome/count; `search_usage_matches` stores matched ticket IDs and category snapshots. Analytics begins after schema initialization and persists independently of ticket deletion.
- **Source:** `support-ticket-management/ui`, `backend`, `starter_kit`, and `style-specification`.

## Run locally

Requirements: Node.js v22+, angular v22.2.0, npm, and PostgreSQL.

1. Create a PostgreSQL database, for example `supportagent`.
2. Create `support-ticket-management/backend/.env` with local database credentials:

   ```dotenv
   DB_USER_NAME=<database-user>
   DB_HOST=localhost
   DB_NAME=supportagent
   DB_PASSWORD=<database-password>
   DB_PORT=5432
   PORT=3000
   ```

3. In a terminal, initialize and start the API:

   ```powershell
   Set-Location support-ticket-management\backend
   npm install
   npm run init-db
   npm start
   ```

4. In another terminal, start the UI:

   ```powershell
   Set-Location support-ticket-management\ui
   npm install
   npm start
   ```

5. Open `http://localhost:4200`. Choose **Admin → Manage Historical Tickets** to load the sample records in `starter_kit/data/tickets.json`, then return to Search.

Choose **Admin → System Analysis** to review totals for today (the default), the last 7 or 30 days, or a custom inclusive UTC date range. Summary metrics cover all categories in the selected period. The matched-ticket category filter applies only to the category and search detail sections. The category table shows category creation dates and period ticket counts; search match counts expand inline to show ticket IDs, categories, subjects, statuses, and creation dates.

Selecting the **Admin** role opens System Analysis. A database trigger maintains `tickets.searchable_text` from subject, description, and resolution notes for resolved tickets, clears it for other statuses, and the schema update backfills existing resolved tickets.

## API surface

| Method and path | Purpose |
|---|---|
| `GET /api/tickets/availability` | Returns total and resolved ticket counts |
| `GET /api/tickets/usage?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&categoryId=<id>&page=1` | Returns search metrics, ticket/category creation totals and category details, plus paginated search records; category is optional |
| `POST /api/tickets/loadHistoricalTickets` | Validates and loads sample tickets; reports inserted, invalid, duplicate, and failed counts |
| `DELETE /api/tickets/removeHistoricalTickets` | Removes historical ticket records |
| `GET /api/tickets/search?keyword=...&limit=...` | Searches resolved tickets; limit is optional and capped by the API |
| `GET/POST/PUT/DELETE /api/categories[/:categoryId]` | List, create, rename, or deactivate categories |
| `GET/POST /api/admin/tickets` | List or create managed tickets |
| `PUT/DELETE /api/admin/tickets/:ticketId` | Update or permanently delete a managed ticket |

Search ignores common terms, requires sufficient meaningful-term overlap, and uses PostgreSQL ranking for ordering—not as a confidence score. Category deletion is a soft deactivation; ticket deletion is permanent.

## Validation

From the project snapshot:

```powershell
Set-Location support-ticket-management\backend
npm test
Set-Location ..\ui
npm test -- --watch=false
npm run build
```

The fixture-based backend checks cover representative login, chart, billing, and no-strong-match cases. They do not replace PostgreSQL integration or production relevance tests.

## Scope and security

This is an agent-assisted prototype, not an automated ticketing integration. Data is synthetic. The Admin role is only a UI selector: the API does not enforce authentication or authorization. 
