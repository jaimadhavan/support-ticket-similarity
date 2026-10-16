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
curl -X POST http://localhost:3000/api/tickets/load
```

The loading process:
- Reads tickets from `starter_kit/data/tickets.json`
- Normalizes tickets (ensures all required fields are present)
- Skips tickets with missing or invalid data
- Inserts only unique tickets (duplicates are skipped)
- Returns a summary of total, inserted, and skipped tickets

## API Endpoints

### Load Tickets
```
POST /api/tickets/load
```
Loads tickets from the JSON file into the database.

### Search Tickets
```
GET /api/tickets/search?keyword=<keyword>
```
Searches for tickets matching the keyword(s) in subject, description, resolution notes, or tags.
- For single words: Returns up to 5 tickets ranked by relevance
- For multiple words: Returns up to 5 tickets ranked by word match count, then relevance

### Get All Tickets
```
GET /api/tickets
```
Returns all tickets in the database (for testing).

### Get Ticket by ID
```
GET /api/tickets/:ticketId
```
Returns a specific ticket by its ticket_id.

## Using the Application

1. Open `http://localhost:4200` in your browser
2. Enter a keyword or sentence in the search box:
   - Single keyword: "login", "sync", "billing", "api"
   - Multiple words: "login password reset", "billing invoice issue", "sync data quality"
3. Click "Search" or press Enter
4. View matching tickets (maximum 5 results) with their details and resolution notes
5. For multi-word searches, tickets are ranked by how many words matched
6. Use the "Clear" button to reset the search

### Search Features

- **Result Limit**: Maximum 5 tickets returned per search
- **Word Matching**: When searching with multiple words, the system:
  - Splits the input into individual words
  - Searches for each word separately across ticket subject, description, resolution notes, and tags
  - Combines results and counts how many words matched each ticket
  - Ranks results by match count (highest first), then by relevance score
- **Relevance Scoring**: PostgreSQL full-text search provides relevance scores for single-word searches

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
