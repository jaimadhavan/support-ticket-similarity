# Support Ticket Similarity Assistant

This folder contains the case-study design, run guide, and `support-ticket-similarity-implementation.zip`, a refreshed source-only runnable snapshot. The canonical implementation remains in the repository's `backend/`, `ui/`, `starter_kit/`, and `style-specification/` directories. The archive excludes dependencies, generated build output, and local environment files.

## Run locally

Requirements: Node.js 18+, npm, and PostgreSQL 12+.

1. Extract the implementation archive. From the extracted `support-ticket-similarity` folder, create a PostgreSQL database (for example, `supportagent`) and configure `backend/.env`:

   ```dotenv
   DB_USER_NAME=<database-user>
   DB_HOST=localhost
   DB_NAME=supportagent
   DB_PASSWORD=<database-password>
   DB_PORT=5432
   ```

2. In one terminal, install and start the API:

   ```powershell
   Set-Location support-ticket-similarity\backend
   npm install
   npm run init-db
   npm start
   ```

3. In another terminal, install and start the Angular UI:

   ```powershell
   Set-Location support-ticket-similarity\ui
   npm install
   npm start
   ```

4. Open `http://localhost:4200`, select **Admin** and **Manage Historical Tickets**, then load the seed tickets. The page reports the total tickets across all statuses. Select **Ticket Similarity Search** and search for an issue description or terms; only resolved precedents are returned, with matching terms and resolutions.

## What the prototype does

- Express API with PostgreSQL-backed full-text and tag search.
- Seed loader validates records, ignores duplicate ticket IDs, and reports inserted, invalid, duplicate, and failed counts.
- Search returns resolved tickets only. Multi-term queries require at least two distinct meaningful terms; a single descriptive term can match directly.
- Results show their matched terms; weak/no matches produce a no-strong-match message.
- The availability API provides both total ticket count and resolved-ticket count. Historical management shows the total across every status, while Search is enabled only when resolved tickets exist and availability was successfully checked. Counts refresh on startup, when opening Search or historical management, and after historical load/delete operations.
- Queries containing only common words (for example, `the`) show an input-specific prompt to enter product, feature, or error terms; network failures are reported separately.
- Search, category, ticket, and historical-ticket operation feedback can be dismissed with its close button and automatically clears after five seconds. Historical load/delete results include counts and appear inline on the Historical Tickets page. Deleting historical tickets requires explicit confirmation that states the all-status total; removal is disabled when the table is empty.
- The role selector defaults to **Support Agent**; selecting **Admin** reveals category, ticket, and historical-ticket management. Categories can be added, renamed, or deactivated (soft delete). Tickets can be added, edited, or permanently deleted, with status values `new`, `inprogress`, and `resolved`.
- Historical-ticket management uses a compact view with load/remove actions and an all-status ticket count. Category and ticket page headings and supporting descriptions remain fixed above their independently scrollable content. Both Admin pages use accessible Add/Edit and List tabs, with List selected by default; editing switches to the form tab, and cancel/save returns to List. Ticket/category records scroll within their List tab, while ticket pagination remains fixed at the bottom of that tab. On Manage Tickets, the Records per page selector is positioned on the left side of the pagination bar, with page navigation on the right. Compact vertical spacing preserves room for pagination. Ticket management shows inline confirmation after adding or editing; it supports page sizes of 10, 20, 50, and 100, plus a per-ticket expanded details view. Resolution notes are optional for new and in-progress tickets, and required when a ticket is marked resolved. Admin forms and actions follow the Search page's compact, responsive visual style.
- The application viewport avoids browser-level scrolling; the Search results list and Admin page content scroll in their own regions, leaving each section heading visible.
- The shared application header uses an enterprise navy-and-teal brand treatment, responsive product identity, and an accessible workspace-role selector.
- The Search-page style reference is in `style-specification/TICKET_SIMILARITY_SEARCH.md`.
- Tickets reference `categories.id` through `category_id`; there is no text category column in the tickets table. Historical loading inserts unique category names when needed, then stores each category ID on its ticket.
- Database initialization creates the categories table and migrates existing category values before dropping the old ticket category column. Rerun `npm run init-db` on an existing database before using the Admin pages.
- The role selector is UI-only and provides no authentication or API authorization. Admin API routes are callable without selecting Admin; this is a demo convenience, not a security boundary.
- No AI service or external model is required.

## Checks

From the repository root:

```powershell
Set-Location backend
npm test
Set-Location ..\ui
npm test -- --watch=false
npm run build
```

The backend fixture checks expect NT-1 → T-1001, NT-2 → T-1201, NT-3 → T-1303, and no strong result for NT-4 (Snowflake). They simulate term overlap and load-summary behavior; they are not PostgreSQL integration tests. UI tests also cover the distinction between all-status and resolved counts, resolved-only search gating, and page-scoped historical feedback.

## Scope and known limitations

- Search is manually initiated; there is no live ticket-system integration or automatic incoming-ticket workflow.
- The dataset is small and synthetic. Keyword matching can miss semantically similar wording; the threshold and stop-word list are heuristic, not calibrated confidence.
- Ranking is for ordering only. No production latency, scaling, or relevance guarantees have been established.
- The prototype has no authentication/authorization. Ticket/category management and historical-ticket deletion are exposed as API/UI operations and must not be exposed to untrusted users.
- Before production use: validate on labeled real tickets, add database-backed integration/performance tests, establish operational ownership and access controls, and define monitoring and ingestion requirements.

See [SOLUTION_DESIGN.md](./SOLUTION_DESIGN.md) for the problem framing, assumptions, architecture, trade-offs, and proposed next steps. The root [README.md](../README.md) contains the complete API and database reference.
