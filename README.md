# Support Ticket Similarity Search Application

A full-stack application for searching similar support tickets using keyword matching. Built with Node.js (Express) backend and Angular frontend, with PostgreSQL database.

## Features

- **Keyword-based search**: Find similar resolved tickets by searching keywords in subject, description, resolution notes, and tags
- **Full-text search**: PostgreSQL full-text search with relevance ranking
- **Ticket normalization**: Only loads tickets with complete required fields
- **Deduplication**: Prevents duplicate tickets using ON CONFLICT handling
- **Clean UI**: Angular-based interface with responsive design

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm

## Database Setup

1. Create a PostgreSQL database named `supportagent`:
```bash
createdb supportagent
```

2. Verify your database connection settings in `backend/.env`:
```
DB_USER_NAME=postgres
DB_HOST=localhost
DB_NAME=supportagent
DB_PASSWORD=admin
DB_PORT=5432
```

Update these values if your PostgreSQL configuration differs.

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database schema:
```bash
npm run init-db
```

This will create the `tickets` table with necessary indexes for full-text search.

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3000`

## Frontend Setup

1. Navigate to the UI directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the Angular development server:
```bash
npm start
```

The frontend will run on `http://localhost:4200`

## Loading Tickets

Before searching, you need to load the historical ticket data:

1. Ensure the backend server is running
2. Open the Angular UI in your browser
3. Click the "Load Tickets from JSON" button
4. This will read tickets from `starter_kit/data/tickets.json` and insert them into the database

**Or** you can load tickets via API directly:
```bash
curl -X POST http://localhost:3000/api/tickets/loadHistoricalTickets
```

The loading process:
- Reads tickets from `starter_kit/data/tickets.json`
- Normalizes tickets (ensures all required fields are present)
- Counts tickets with missing or invalid data as skipped
- Inserts only unique tickets (duplicates are skipped)
- Returns the source total, inserted and skipped totals, and separate invalid, duplicate, and failed counts

## API Endpoints

### Historical Ticket Availability
```
GET /api/tickets/availability
```
Returns `{ "count": <number> }`. The UI checks this on startup and after loading or deleting history; search remains disabled until the count is available and greater than zero.

### Load Tickets
```
POST /api/tickets/loadHistoricalTickets
```
Loads tickets from the JSON file into the database.
The response's `total` is the number of source records, and `skipped` equals `invalid + duplicates + failed`.

### Search Tickets
```
GET /api/tickets/search?keyword=<keyword>&limit=5
```
Searches resolved tickets by descriptive terms in subject, description, resolution notes, and tags. The `limit` is optional and capped at 50. Results include `matchedWords` and `matchCount`; `matchStatus` is `good_match` or `no_good_match`. A result is shown when at least two distinct meaningful terms match, or when a one-term query matches that term. Queries containing only common/ignored words (for example, `the`) receive a validation message asking for a product, feature, or error term. Search rank is only used for ordering and is not a probability or confidence score.

### Remove Historical Tickets
```
DELETE /api/tickets/removeHistoricalTickets
```
Deletes all tickets from the database.

## Using the Application

1. Open `http://localhost:4200` in your browser
2. Enter a keyword or sentence in the search box:
   - Single keyword: "login", "sync", "billing", "api"
   - Multiple words: "login password reset", "billing invoice issue", "sync data quality"
3. Click "Search" or press Enter
4. View resolved tickets that meet the minimum match rule, along with their matching terms and resolution notes
5. If no result meets the rule, the UI explains that there is no strong historical match and suggests adding specific details
6. Use the "Clear" button to reset the search

Loading and removing historical tickets show their result and counts inline in the UI; no browser alert dialogs are used.

### Search Features

- **Resolved precedents only**: Unresolved tickets are never suggested as past resolutions.
- **Explainable matching**: Each result displays the distinct meaningful query terms that matched it.
- **No-good-match behavior**: Generic words are ignored; multi-term searches need at least two distinct meaningful matches before any candidate is presented. Single descriptive-term searches can still return exact-term matches.
- **Search validation**: If all entered words are generic terms that are ignored, the UI explains that more specific search terms are needed.
- **Ranking**: Results are ordered by the number of matched terms, then PostgreSQL full-text rank and recency. The rank is an ordering signal, not calibrated confidence.

## Example-ticket acceptance checks

Run the fixture checks from the backend directory with `npm test`. They use all four tickets in `starter_kit/data/new_tickets_example.json` and the historical seed set. Expected behavior:

- NT-1 ranks T-1001 (password reset / email).
- NT-2 ranks T-1201 (blank revenue chart).
- NT-3 ranks T-1303 (duplicate charge).
- NT-4 (Snowflake) yields no strong match rather than a weak integration/sync precedent.

These are fixture-level checks using a simple token-overlap simulation of the meaningful-term policy. They validate the acceptance examples and threshold behavior, but do not validate PostgreSQL stemming, actual query plans, or relevance on production ticket data; those need a database-backed integration evaluation.

## Database Schema

The `tickets` table includes:
- `ticket_id`: Unique identifier (VARCHAR)
- `category`: Ticket category (auth, sync, render, billing, export, perm, perf, api)
- `subject`: Ticket subject/title
- `description`: Ticket description
- `resolution_notes`: How the ticket was resolved
- `tags`: Array of tags for categorization
- `created_at`: Ticket creation date
- `status`: Ticket status (resolved, etc.)

Indexes:
- Unique index on `ticket_id`
- Index on `category` for filtering
- GIN index on `tags` for tag-based search
- Full-text search index on subject, description, and resolution notes

## Troubleshooting

### Backend won't start
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure the `supportagent` database exists

### Tickets won't load
- Verify `starter_kit/data/tickets.json` exists
- Check backend server logs for errors
- Ensure database schema is initialized (`npm run init-db`)

### Search returns no results
- Ensure tickets are loaded into the database
- Try different keywords
- Check backend console for any errors

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check CORS configuration in backend
- Verify proxy configuration in `ui/proxy.conf.json`

## Development

### Backend
- Entry point: `backend/server.js`
- Database schema: `backend/schema.sql`
- Initialization script: `backend/init-db.js`

### Frontend
- Main component: `ui/src/app/app.ts`
- Template: `ui/src/app/app.html`
- Styles: `ui/src/app/app.css`

## License

ISC
