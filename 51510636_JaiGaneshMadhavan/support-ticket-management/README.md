# Support Ticket Similarity Application

An Angular and Express application backed by PostgreSQL. Agents search resolved support tickets by issue text and review matched terms and resolutions. Admin UI pages manage categories, tickets, and historical ticket data.

## Requirements

Node.js, npm, and PostgreSQL.

## Setup

1. Create a PostgreSQL database such as `supportagent`.
2. Create `backend/.env` (do not commit credentials):

   ```dotenv
   DB_USER_NAME=<database-user>
   DB_HOST=localhost
   DB_NAME=supportagent
   DB_PASSWORD=<database-password>
   DB_PORT=5432
   PORT=3000
   ```

3. Start the backend:

   ```powershell
   Set-Location backend
   npm install
   npm run init-db
   npm start
   ```

4. Start the UI in a separate terminal:

   ```powershell
   Set-Location ui
   npm install
   npm start
   ```

5. Open `http://localhost:4200`. Select Admin → Manage Historical Tickets to load `starter_kit/data/tickets.json`.

## Pages and APIs

UI routes: `/search`, `/categories`, `/tickets`, `/historical`, and `/analytics` (System Analysis). Search is available to Support Agent and Admin; management and analytics are Admin UI pages. Selecting the Admin role opens System Analysis by default. The role selector is not API authorization.

API routes: `GET /api/tickets/availability`, `GET /api/tickets/usage?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&categoryId=<id>&page=1`, `POST /api/tickets/loadHistoricalTickets`, `DELETE /api/tickets/removeHistoricalTickets`, `GET /api/tickets/search`, category CRUD at `/api/categories`, and ticket CRUD at `/api/admin/tickets`.

Search returns resolved tickets only. Multi-term queries need at least two meaningful matches; a one-term query can match exactly. Resolved tickets maintain a `searchable_text` value combining subject, description, and resolution notes; full-text matching and ranking use this indexed value, while tag matching remains supported. A database trigger clears `searchable_text` for non-resolved tickets and refreshes it when resolved ticket text or status changes. Schema initialization backfills existing resolved tickets.

Searches and returned ticket/category/ticket-detail snapshots are stored in `search_usage` and `search_usage_matches`. Schema initialization backfills subject, status, and creation date on existing match rows when the corresponding ticket still exists. The Admin System Analysis page defaults to Today and offers Last 7 days, Last 30 days, and custom inclusive UTC dates. Summary metrics cover all categories in the range; the category filter applies only to category/search details. Category rows show creation dates and period ticket counts. Match counts expand inline to show matched ticket ID, category, subject, status, and ticket creation date. Search text is retained; usage starts after schema initialization and is independent of ticket deletion.

## Tests and build

```powershell
Set-Location backend
npm test
Set-Location ..\ui
npm test -- --watch=false
npm run build
```

Fixture tests do not substitute for PostgreSQL integration or real-world relevance evaluation. The dataset is synthetic and the application has no authentication, authorization, or live ticket-system integration. Secure the API before exposing it beyond a trusted demo environment.
