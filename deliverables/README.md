# Support Ticket Similarity Assistant

This folder contains the case-study design, run guide, and `support-ticket-similarity-implementation.zip`, a source-only runnable snapshot. The canonical implementation remains in the repository's `backend/`, `ui/`, and `starter_kit/` directories. The archive excludes dependencies, generated build output, and local environment files.

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

4. Open `http://localhost:4200`, expand **Manage Historical Tickets**, and load the seed tickets. Search for an issue description or terms; the UI displays resolved precedents, matched terms, and their resolutions.

## What the prototype does

- Express API with PostgreSQL-backed full-text and tag search.
- Seed loader validates records, ignores duplicate ticket IDs, and reports inserted, invalid, duplicate, and failed counts.
- Search returns resolved tickets only. Multi-term queries require at least two distinct meaningful terms; a single descriptive term can match directly.
- Results show their matched terms; weak/no matches produce a no-strong-match message.
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

The backend fixture checks expect NT-1 → T-1001, NT-2 → T-1201, NT-3 → T-1303, and no strong result for NT-4 (Snowflake). They simulate term overlap and load-summary behavior; they are not PostgreSQL integration tests.

## Scope and known limitations

- Search is manually initiated; there is no live ticket-system integration or automatic incoming-ticket workflow.
- The dataset is small and synthetic. Keyword matching can miss semantically similar wording; the threshold and stop-word list are heuristic, not calibrated confidence.
- Ranking is for ordering only. No production latency, scaling, or relevance guarantees have been established.
- The prototype has no authentication/authorization. Historical-ticket deletion is exposed as an API/UI operation and must not be exposed to untrusted users.
- Before production use: validate on labeled real tickets, add database-backed integration/performance tests, establish operational ownership and access controls, and define monitoring and ingestion requirements.

See [SOLUTION_DESIGN.md](./SOLUTION_DESIGN.md) for the problem framing, assumptions, architecture, trade-offs, and proposed next steps.
