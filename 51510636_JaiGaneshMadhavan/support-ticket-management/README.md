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

UI routes: `/search`, `/categories`, `/tickets`, and `/historical`. Admin-only menus are hidden from Support Agent; this is not API authorization.

API routes: `GET /api/tickets/availability`, `POST /api/tickets/loadHistoricalTickets`, `DELETE /api/tickets/removeHistoricalTickets`, `GET /api/tickets/search`, category CRUD at `/api/categories`, and ticket CRUD at `/api/admin/tickets`.

Search returns resolved tickets only. Multi-term queries need at least two meaningful matches; a one-term query can match exactly. Matched terms are shown to explain results. PostgreSQL rank orders results but is not a confidence score.

## Tests and build

```powershell
Set-Location backend
npm test
Set-Location ..\ui
npm test -- --watch=false
npm run build
```

Fixture tests do not substitute for PostgreSQL integration or real-world relevance evaluation. The dataset is synthetic and the application has no authentication, authorization, or live ticket-system integration. Secure the API before exposing it beyond a trusted demo environment.
