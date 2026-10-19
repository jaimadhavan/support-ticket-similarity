# Support Ticket Similarity Assistant — Solution Design

## Problem

Help Solari Analytics support agents reuse relevant, resolved customer cases so they can investigate new tickets faster and give more consistent answers. A suggestion must be useful as a precedent, not merely share a generic word with the incoming issue.

## Assumptions

- V1 is an agent-assisted lookup: an agent searches a new issue by entering its keywords or description. Automatic ticket-system integration is outside the current scope.
- The supplied 40 synthetic historical tickets are sufficient to demonstrate the core workflow; only tickets with `resolved` status are valid precedents.
- This prototype uses a lightweight, explainable keyword/full-text approach. For multi-term searches, at least two distinct meaningful terms must match; a single descriptive search term can return a one-term match. This is a heuristic, not a calibrated confidence score.
- The requirement gives no response-time SLA or quantified growth forecast. The v1 target is interactive search on the provided dataset; expected scale and latency must be confirmed before production deployment.
- Agents review a past resolution and decide whether it applies. The system does not generate or send customer responses.

## Architecture and data flow

```text
Agent
  │ enters keywords / issue text
  ▼
Angular UI ── GET /api/tickets/search ──► Express API
  ▲                                       │
  │ ticket details, matched terms,        ├─ meaningful-term filtering
  │ resolution, or no-strong-match        ├─ resolved-only PostgreSQL query
  └───────────────────────────────────────┴─ rank and return candidates
                                          ▼
                                      PostgreSQL
                              tickets + full-text/tag indexes

Historical seed JSON ── POST /loadHistoricalTickets ──► validate and insert unique tickets
                                                       └─ category name → category_id

Admin UI ──► category/ticket CRUD and historical load/delete ──► Express ──► PostgreSQL
                 ▲                                │
                 └──── total + resolved counts ───┘
```

The Angular component calls `TicketService`, which sends requests through the development proxy to the Express routes. Search terms are lowercased, deduplicated, and stripped of stop words. PostgreSQL searches subject, description, resolution notes, and tags, excludes non-resolved tickets, and returns matching terms and a match count. Candidates are ordered by matched-term count, PostgreSQL `ts_rank`, then recency. The UI displays the evidence and resolution for each candidate; an empty qualified result becomes a no-strong-match message. Rank is only a sorting signal.

Historical loading reads the bundled JSON file in the API, rejects incomplete records, inserts valid tickets while ignoring duplicate IDs, and reports totals split into inserted, invalid, duplicate, and failed records. The UI reports this outcome only on the Historical Tickets page, clearing the message when the user navigates away. The availability endpoint separately reports the total number of rows and the number with `resolved` status. Historical management displays the total across all statuses and uses that total for removal confirmation and empty-state handling; Search is enabled only when at least one resolved ticket exists. Availability is refreshed at startup, when opening either page, and after load/delete actions. PostgreSQL stores the ticket fields and has indexes for ID, category, tags, and full-text search.

The Admin demo pages manage category lookup data and ticket records through Express APIs. Tickets reference `categories.id` through `category_id`; historical loading creates unique category rows as needed and stores each ID on its ticket. Schema initialization migrates old text categories before removing that column. Categories can be renamed and are soft-deleted by marking them inactive. Tickets use one of `new`, `inprogress`, or `resolved`; an inactive category may remain on a ticket that already uses it. Resolution notes are required once a ticket is resolved. Ticket management paginates results, expands individual records for full details, and confirms successful create/edit operations inline. Historical management retains load and confirmed remove actions in a compact page. Admin form controls and action styling follow the Search-page specification. The role selector only changes Angular navigation and does not protect the APIs.

## Trade-offs

- **Keyword/full-text search over embeddings or an LLM:** avoids external services, model cost, latency, and opaque suggestions; it is easy to explain and sufficient for a small demonstration set. It can miss paraphrases and depends on term overlap.
- **A minimum match rule and resolved-only filtering:** reduces weak or unresolved suggestions, but can hide a useful match when wording differs. The two-term threshold and stop-word list are initial heuristics that need tuning against real agent feedback.
- **PostgreSQL ranking:** reuses the chosen database and provides a useful ordering signal, but `ts_rank` is not a probability and is not exposed as confidence.
- **Seed-file loading:** keeps the prototype self-contained, but is not a production ticket-ingestion integration.

## Validation and next steps

Fixture checks cover the supplied cases: login → T-1001, blank revenue chart → T-1201, duplicate charge → T-1303, and Snowflake → no strong match. These checks simulate token overlap against the seed data; they do not execute the PostgreSQL query or establish production search quality.

With more time, connect an integration test to PostgreSQL, build a labeled evaluation set with support agents, measure precision/recall and latency, and tune the threshold based on the cost of bad suggestions versus missed precedents. Then validate the real data volume and ticket-system integration requirements. Only if lexical search proves insufficient would I compare embeddings or a hybrid retriever. Production hardening would also require server-enforced access control for the Admin APIs, auditability, safe operational controls, monitoring, and a managed ingestion path.
