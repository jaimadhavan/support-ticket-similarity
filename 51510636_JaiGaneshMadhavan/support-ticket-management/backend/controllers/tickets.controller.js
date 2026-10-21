// API: Load tickets from JSON file
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { getSearchTerms, MIN_MATCHED_TERMS } = require('../search-utils');
const { createLoadSummary } = require('../load-summary');
const { recordSearchUsage } = require('../search-analytics');

module.exports = {
    getHistoricalTicketAvailability: async function (req, res) {
        try {
            const result = await pool.query(`
                SELECT COUNT(*)::int AS count,
                       COUNT(*) FILTER (WHERE status = $1)::int AS resolved_count
                FROM tickets
            `, ['resolved']);
            res.json({
                count: result.rows[0].count,
                resolvedCount: result.rows[0].resolved_count
            });
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
                const categoryName = ticket.category.trim();
                await pool.query(
                    'INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING',
                    [categoryName]
                );
                const categoryResult = await pool.query(
                    'SELECT id FROM categories WHERE lower(name) = lower($1)',
                    [categoryName]
                );
                if (categoryResult.rowCount === 0) {
                    throw new Error(`Category could not be resolved for ticket ${ticket.ticket_id}`);
                }

                const query = `
                    INSERT INTO tickets (ticket_id, category_id, subject, description, resolution_notes, tags, created_at, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (ticket_id) DO NOTHING
                `;
                
                const result = await pool.query(query, [
                    ticket.ticket_id,
                    categoryResult.rows[0].id,
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

// Admin API: list tickets for management
listManagedTickets: async function (req, res) {
    try {
        const result = await pool.query(`
            SELECT t.ticket_id, t.category_id, c.name AS category, t.subject, t.description, t.resolution_notes,
                   t.tags, t.created_at, t.status
            FROM tickets t
            JOIN categories c ON c.id = t.category_id
            ORDER BY t.created_at DESC, t.ticket_id
        `);
        res.json({ tickets: result.rows });
    } catch (error) {
        console.error('Error listing managed tickets:', error);
        res.status(500).json({ error: 'Failed to list tickets' });
    }
},

// Admin API: create ticket
createManagedTicket: async function (req, res) {
    let validation;
    try {
        validation = await validateManagedTicket(req.body);
    } catch (error) {
        console.error('Error validating new ticket:', error);
        return res.status(500).json({ error: 'Failed to validate ticket details' });
    }
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    try {
        const ticket = validation.ticket;
        const result = await pool.query(`
            INSERT INTO tickets (
                ticket_id, category_id, subject, description, resolution_notes,
                tags, created_at, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING ticket_id
        `, [
            ticket.ticket_id, ticket.category_id, ticket.subject, ticket.description,
            ticket.resolution_notes, ticket.tags, ticket.created_at, ticket.status
        ]);
        res.status(201).json(await getManagedTicket(result.rows[0].ticket_id));
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A ticket with this ticket ID already exists' });
        }
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
},

// Admin API: update ticket
updateManagedTicket: async function (req, res) {
    let validation;
    try {
        validation = await validateManagedTicket(req.body, req.params.ticketId);
    } catch (error) {
        console.error('Error validating ticket update:', error);
        return res.status(500).json({ error: 'Failed to validate ticket details' });
    }
    if (validation.error) {
        return res.status(400).json({ error: validation.error });
    }

    try {
        const ticket = validation.ticket;
        const result = await pool.query(`
            UPDATE tickets
            SET ticket_id = $1, category_id = $2, subject = $3, description = $4,
                resolution_notes = $5, tags = $6, created_at = $7, status = $8
            WHERE ticket_id = $9
            RETURNING ticket_id
        `, [
            ticket.ticket_id, ticket.category_id, ticket.subject, ticket.description,
            ticket.resolution_notes, ticket.tags, ticket.created_at, ticket.status,
            req.params.ticketId
        ]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(await getManagedTicket(result.rows[0].ticket_id));
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A ticket with this ticket ID already exists' });
        }
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
},

// Admin API: permanently delete ticket
deleteManagedTicket: async function (req, res) {
    try {
        const result = await pool.query(
            'DELETE FROM tickets WHERE ticket_id = $1 RETURNING ticket_id',
            [req.params.ticketId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json({ message: 'Ticket deleted successfully', ticket_id: result.rows[0].ticket_id });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
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
            await recordSearchUsage(pool, String(keyword), []);
            return res.status(400).json({
                error: 'Your search only contains common words that are ignored. Add specific terms such as a product, feature, or error message.'
            });
        }

        const query = `
            SELECT
                t.ticket_id,
                t.category_id,
                c.name AS category,
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
            JOIN categories c ON c.id = t.category_id
            CROSS JOIN unnest($1::text[]) AS q(term)
            WHERE lower(t.status) = 'resolved'
              AND (
                    to_tsvector('english', coalesce(t.subject, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.resolution_notes, ''))
                    @@ plainto_tsquery('english', q.term)
                    OR q.term = ANY(t.tags)
              )
            GROUP BY t.id, t.ticket_id, c.name, t.subject, t.description,
                     t.resolution_notes, t.tags, t.created_at, t.status
            HAVING count(DISTINCT q.term) >= $2
                OR cardinality($1::text[]) = 1
            ORDER BY "matchCount" DESC, relevance DESC, t.created_at DESC
            LIMIT $3
        `;
        const result = await pool.query(query, [words, MIN_MATCHED_TERMS, validLimit]);
        const tickets = result.rows;
        await recordSearchUsage(pool, String(keyword), tickets);

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

    if (typeof ticket.category !== 'string' || ticket.category.trim() === '') {
        return null;
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

async function validateManagedTicket(input, existingTicketId = null) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { error: 'Ticket details are required' };
    }

    const ticket = {
        ticket_id: typeof input.ticket_id === 'string' ? input.ticket_id.trim() : '',
        category_id: Number(input.category_id),
        subject: typeof input.subject === 'string' ? input.subject.trim() : '',
        description: typeof input.description === 'string' ? input.description.trim() : '',
        resolution_notes: typeof input.resolution_notes === 'string' ? input.resolution_notes.trim() : '',
        tags: Array.isArray(input.tags)
            ? input.tags.map(tag => String(tag).trim()).filter(Boolean)
            : [],
        created_at: typeof input.created_at === 'string' ? input.created_at : '',
        status: typeof input.status === 'string' ? input.status.trim().toLowerCase() : ''
    };

    if (!['new', 'inprogress', 'resolved'].includes(ticket.status)) {
        return { error: 'Status must be new, inprogress, or resolved' };
    }
    if (!ticket.ticket_id || !Number.isInteger(ticket.category_id) || ticket.category_id < 1 ||
        !ticket.subject || !ticket.description || !isValidDate(ticket.created_at)) {
        return { error: 'Ticket ID, category, subject, description, and a valid creation date are required' };
    }
    if (ticket.status === 'resolved' && !ticket.resolution_notes) {
        return { error: 'Resolution notes are required for resolved tickets' };
    }

    const categoryResult = await pool.query(
        'SELECT id, is_active FROM categories WHERE id = $1',
        [ticket.category_id]
    );
    if (categoryResult.rowCount === 0) {
        return { error: 'Select a category that exists in the categories list' };
    }
    const category = categoryResult.rows[0];
    if (!category.is_active) {
        if (!existingTicketId) {
            return { error: 'Inactive categories cannot be assigned to new tickets' };
        }
        const current = await pool.query(
            'SELECT category_id FROM tickets WHERE ticket_id = $1',
            [existingTicketId]
        );
        if (current.rowCount === 0) {
            return { error: 'Ticket not found' };
        }
        if (current.rows[0].category_id !== category.id) {
            return { error: 'Inactive categories can only be retained for tickets already assigned to them' };
        }
    }
    return { ticket };
}

async function getManagedTicket(ticketId) {
    const result = await pool.query(`
        SELECT t.ticket_id, t.category_id, c.name AS category, t.subject, t.description,
               t.resolution_notes, t.tags, t.created_at, t.status
        FROM tickets t
        JOIN categories c ON c.id = t.category_id
        WHERE t.ticket_id = $1
    `, [ticketId]);
    if (result.rowCount === 0) {
        throw new Error(`Ticket ${ticketId} was not found after save`);
    }
    return result.rows[0];
}

function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
