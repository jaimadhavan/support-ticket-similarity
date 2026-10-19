// API: Load tickets from JSON file
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { getSearchTerms, MIN_MATCHED_TERMS } = require('../search-utils');
const { createLoadSummary } = require('../load-summary');

module.exports = {
    getHistoricalTicketAvailability: async function (req, res) {
        try {
            const result = await pool.query('SELECT COUNT(*)::int AS count FROM tickets');
            res.json({ count: result.rows[0].count });
        } catch (error) {
            console.error('Error checking historical tickets:', error);
            res.status(500).json({ error: 'Failed to check historical tickets' });
        }
    },

    loadHistoricalTickets: async function (req, res) {
    try {
        const ticketsPath = path.join(__dirname, '..', '..', 'starter_kit', 'data', 'tickets.json');
        
        if (!fs.existsSync(ticketsPath)) {
            return res.status(404).json({ error: 'tickets.json file not found' });
        }
        
        const rawData = await fs.promises.readFile(ticketsPath, 'utf8');
        const data = JSON.parse(rawData);
        
        if (!data.tickets || !Array.isArray(data.tickets)) {
            return res.status(400).json({ error: 'Invalid tickets.json format' });
        }
        
        const normalizedTickets = data.tickets.map(ticket => normalizeTicket(ticket));
        
        // Insert tickets with deduplication (ON CONFLICT DO NOTHING)
        let insertedCount = 0;
        let invalidCount = 0;
        let duplicateCount = 0;
        let failedCount = 0;
        
        for (const ticket of normalizedTickets) {
            if (!ticket) {
                invalidCount++;
                continue;
            }

            try {
                const query = `
                    INSERT INTO tickets (ticket_id, category, subject, description, resolution_notes, tags, created_at, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (ticket_id) DO NOTHING
                `;
                
                const result = await pool.query(query, [
                    ticket.ticket_id,
                    ticket.category,
                    ticket.subject,
                    ticket.description,
                    ticket.resolution_notes,
                    ticket.tags,
                    ticket.created_at,
                    ticket.status
                ]);
                
                if (result.rowCount > 0) {
                    insertedCount++;
                } else {
                    duplicateCount++;
                }
            } catch (err) {
                console.error(`Error inserting ticket ${ticket.ticket_id}:`, err);
                failedCount++;
            }
        }

        res.json(createLoadSummary(
            data.tickets.length,
            insertedCount,
            invalidCount,
            duplicateCount,
            failedCount
        ));
    } catch (error) {
        console.error('Error loading tickets:', error);
        res.status(500).json({ error: 'Failed to load tickets' });
    }
},

// API: Remove tickets from JSON database
removeHistoricalTickets: async (req, res) => {
    try {
        const query = `
            DELETE FROM tickets`;
        
        const result = await pool.query(query);
        if(result.rowCount > 0) {
            res.json({
                message: 'Historical tickets deleted successfully',
                total: result.rowCount
            });
        } else {
            res.json({
                message: 'No historical tickets found to delete',
                total: 0
            });
        }
    } catch (error) {
        console.error('Error removing tickets:', error);
        res.status(500).json({ error: 'Failed to remove historical tickets' });
    }
},

// API: Search tickets by keyword
searchTicketByKeyword: async function(req, res) {
    try {
        const { keyword, limit } = req.query;
        
        if (!keyword) {
            return res.status(400).json({ error: 'Keyword parameter is required' });
        }
        
        // Parse limit parameter, default to 5
        const resultLimit = limit ? parseInt(limit, 10) : 5;
        const validLimit = (resultLimit > 0 && resultLimit <= 50) ? resultLimit : 5;
        
        const words = getSearchTerms(keyword);
        if (words.length === 0) {
            return res.status(400).json({
                error: 'Your search only contains common words that are ignored. Add specific terms such as a product, feature, or error message.'
            });
        }

        const query = `
            SELECT
                t.ticket_id,
                t.category,
                t.subject,
                t.description,
                t.resolution_notes,
                t.tags,
                t.created_at,
                t.status,
                array_agg(DISTINCT q.term ORDER BY q.term) AS "matchedWords",
                count(DISTINCT q.term)::int AS "matchCount",
                max(ts_rank(
                    to_tsvector('english', coalesce(t.subject, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.resolution_notes, '')),
                    plainto_tsquery('english', q.term)
                )) AS relevance
            FROM tickets t
            CROSS JOIN unnest($1::text[]) AS q(term)
            WHERE lower(t.status) = 'resolved'
              AND (
                    to_tsvector('english', coalesce(t.subject, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.resolution_notes, ''))
                    @@ plainto_tsquery('english', q.term)
                    OR q.term = ANY(t.tags)
              )
            GROUP BY t.id, t.ticket_id, t.category, t.subject, t.description,
                     t.resolution_notes, t.tags, t.created_at, t.status
            HAVING count(DISTINCT q.term) >= $2
                OR cardinality($1::text[]) = 1
            ORDER BY "matchCount" DESC, relevance DESC, t.created_at DESC
            LIMIT $3
        `;
        const result = await pool.query(query, [words, MIN_MATCHED_TERMS, validLimit]);
        const tickets = result.rows;

        res.json({
            keyword,
            count: tickets.length,
            matchStatus: tickets.length > 0 ? 'good_match' : 'no_good_match',
            tickets
        });
    } catch (error) {
        console.error('Error searching tickets:', error);
        res.status(500).json({ error: 'Failed to search tickets' });
    }
},

// API: Get all tickets (for testing)
getAllTickets: async function(req, res) {
    try {
        const query = 'SELECT * FROM tickets ORDER BY created_at DESC';
        const result = await pool.query(query);
        
        res.json({
            count: result.rows.length,
            tickets: result.rows
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
},

// API: Get ticket by ID
searchByTicketId: async function(req, res) {
    try {
        const { ticketId } = req.params;
        const query = 'SELECT * FROM tickets WHERE ticket_id = $1';
        const result = await pool.query(query, [ticketId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
}}

// Normalize ticket data - ensure all required fields are present
function normalizeTicket(ticket) {
    const requiredFields = ['ticket_id', 'category', 'subject', 'description', 'resolution_notes', 'tags', 'created_at', 'status'];

    if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) {
        return null;
    }
    
    // Check if all required fields exist and are not null/empty
    for (const field of requiredFields) {
        if (ticket[field] === undefined || ticket[field] === null || ticket[field] === '') {
            return null; // Ticket is not normalized
        }
    }
    
    // Ensure tags is an array
    if (!Array.isArray(ticket.tags)) {
        return null;
    }
    
    return {
        ticket_id: ticket.ticket_id,
        category: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        resolution_notes: ticket.resolution_notes,
        tags: ticket.tags,
        created_at: ticket.created_at,
        status: ticket.status
    };
}
