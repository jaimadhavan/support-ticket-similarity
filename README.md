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

This creates the ticket and category tables, adds indexes for full-text search, and migrates any existing ticket category values into the categories table. Tickets store a `category_id` foreign key; the old text `category` column is removed after its values are migrated. Rerun this command on an existing database to apply the schema migration.

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
Returns `{ "count": <number>, "resolvedCount": <number> }`. `count` includes tickets of every status and is shown in Manage Historical Tickets; `resolvedCount` is used to enable similarity search only when at least one resolved ticket exists. The UI refreshes these counts on startup, when opening Search or Manage Historical Tickets, and after loading or deleting historical tickets.

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
In the UI, clicking **Remove Historical Tickets** first opens a confirmation prompt showing the total number of ticket records to be deleted, regardless of status. The delete request is sent only after the user confirms; cancel leaves the database unchanged.

### Admin management APIs

- `GET/POST/PUT/DELETE /api/categories` lists, adds, renames, and soft-deletes categories. Deleting a category deactivates it; it does not remove the category or rewrite existing tickets.
- `GET/POST /api/admin/tickets` and `PUT/DELETE /api/admin/tickets/:ticketId` list, add, edit, and permanently delete individual ticket records. Ticket status is limited to `new`, `inprogress`, or `resolved`.
- Ticket category choices come from the categories table and use category IDs in ticket records. Historical loading creates each unique category as needed and writes its ID to the associated ticket. Deactivated categories are unavailable for new tickets but can be retained on tickets already assigned to them.

The UI role selector defaults to **Support Agent** and offers **Admin** management menus for categories, tickets, and historical data. Historical management displays the total ticket count across all statuses and keeps load and confirmed remove actions in a compact view; load/remove feedback is shown only on that page and clears on navigation. Search is enabled only when at least one resolved ticket exists, and search results include resolved tickets only. Category and ticket forms are collapsed accordions by default; selecting a list item's **Edit** action opens the matching form, and canceling or saving returns it to Add mode. Ticket management paginates at 10, 20, 50, or 100 records per page and provides a per-ticket expanded details view; successful add/edit operations show inline confirmation. Resolution notes can be left blank until a ticket is marked resolved. Admin form controls and action styling follow the Search-page style specification in `style-specification/TICKET_SIMILARITY_SEARCH.md`. This is a presentation-only demo switch, not authentication or authorization: the API does not enforce roles, so do not expose this prototype to untrusted users.

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
- `category_id`: Foreign key to `categories.id`
- `subject`: Ticket subject/title
- `description`: Ticket description
- `resolution_notes`: How the ticket was resolved
- `tags`: Array of tags for categorization
- `created_at`: Ticket creation date
- `status`: Ticket status (resolved, etc.)

The `categories` table holds unique category names, their active state, and an ID referenced by tickets. The Admin screens retrieve category names and IDs from this table.

Indexes:
- Unique index on `ticket_id`
- Index on `category_id` for filtering
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
